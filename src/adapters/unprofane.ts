/**
 * Unprofane through its public API, with your own key
 * (UNPROFANE_API_KEY, a live key: test keys stop at 100 checks a day, and
 * the dev split is about 15,500). `unprofane-fast` is the rules alone, the
 * row the leaderboard prints; `unprofane-balanced` adds the model where the
 * rules are unsure. An item is flagged when the engine matched anything,
 * or, for balanced, when the standard policy did not allow it.
 *
 * Items go out 100 to a request through the batch endpoint, so a full run
 * is about 155 requests.
 */
import { type CheckResponse, Unprofane } from '@unprofane/sdk';
import type { Adapter } from '../adapter.ts';
import type { CorpusItem } from '../corpus.ts';

type Mode = 'fast' | 'balanced';

function batcher(client: Unprofane, mode: Mode) {
  let pending: Array<{
    item: CorpusItem;
    resolve: (r: CheckResponse) => void;
    reject: (e: unknown) => void;
  }> = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const flush = async () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const batch = pending;
    pending = [];
    if (!batch.length) return;
    try {
      const res = await client.checkBatch({
        mode,
        policy: 'standard',
        items: batch.map(({ item }) => ({
          id: item.id,
          text: item.text,
          context: item.context as never,
        })),
      });
      const byId = new Map(res.results.map((r) => [r.id, r]));
      for (const { item, resolve, reject } of batch) {
        const r = byId.get(item.id);
        if (r && 'result' in r) resolve(r.result);
        else
          reject(new Error(r && 'error' in r ? JSON.stringify(r.error) : 'missing from the batch'));
      }
    } catch (e) {
      for (const { reject } of batch) reject(e);
    }
  };
  return (item: CorpusItem) =>
    new Promise<CheckResponse>((resolve, reject) => {
      pending.push({ item, resolve, reject });
      if (pending.length >= 100) void flush();
      else if (!timer) timer = setTimeout(flush, 25);
    });
}

export function unprofaneAdapter(mode: Mode): Adapter {
  const key = process.env.UNPROFANE_API_KEY;
  const send = key ? batcher(new Unprofane(key), mode) : undefined;
  return {
    name: `unprofane-${mode}`,
    version: 'api',
    cacheable: true,
    // The runner keeps this many items in flight; the batcher packs them 100 to a request.
    concurrency: 200,
    available: async () => (send ? null : 'no UNPROFANE_API_KEY'),
    async run(item) {
      const t0 = performance.now();
      const r = await (send as NonNullable<typeof send>)(item);
      const flagged = r.matches.length > 0 || (mode === 'balanced' && !r.allowed);
      return {
        flagged,
        latencyMs: performance.now() - t0,
        route: r.engine.route,
        degraded: r.engine.degraded,
      };
    },
  };
}
