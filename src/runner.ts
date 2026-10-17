/**
 * Runs adapters over a corpus split with bounded concurrency (four, the
 * Worker's own outbound limit), replaying the cache where it can, and
 * writes one JSON per run under bench/results/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { MANIFEST } from './types.ts';
import type { Adapter, Prediction } from './adapter.ts';
import type { CorpusItem } from './corpus.ts';
import { report, type SystemReport } from './metrics.ts';

const RESULTS = new URL('../results/', import.meta.url).pathname;

export async function runAdapter(
  adapter: Adapter,
  items: CorpusItem[],
  concurrency = 4,
  onProgress?: (done: number) => void,
): Promise<Prediction[]> {
  const preds: Prediction[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      try {
        preds[i] = await adapter.run(items[i]!);
      } catch (e) {
        preds[i] = {
          flagged: false,
          latencyMs: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
      done++;
      onProgress?.(done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return preds;
}

export interface RunResult {
  ranAt: string;
  split: string;
  corpus: string;
  /** The lexicon the run read (its manifest hash), so a published number
   * names the word lists behind it. Absent from runs before 2026-10-13. */
  lexicon?: string;
  systems: SystemReport[];
}

export async function runAll(
  adapters: Adapter[],
  items: CorpusItem[],
  split: string,
  corpusName: string,
  log = console.log,
): Promise<RunResult> {
  const systems: SystemReport[] = [];
  for (const adapter of adapters) {
    const why = await adapter.available();
    if (why) {
      log(`skip ${adapter.name}: ${why}`);
      systems.push({ ...report(adapter, [], []), skipped: why, n: 0 });
      continue;
    }
    const t0 = Date.now();
    let last = 0;
    const preds = await runAdapter(
      adapter,
      items,
      adapter.cacheable ? (adapter.concurrency ?? 4) : 1,
      (done) => {
        if (done - last >= 200 || done === items.length) {
          last = done;
          log(`${adapter.name}: ${done}/${items.length}`);
        }
      },
    );
    const r = report(adapter, items, preds);
    log(
      `${adapter.name}: F1 ${r.overall.f1.toFixed(3)} P ${r.overall.precision.toFixed(3)} R ${r.overall.recall.toFixed(3)} trapFPR ${(r.traps.overall * 100).toFixed(1)}% p50 ${r.latency.p50.toFixed(0)}ms errors ${r.errors} (${((Date.now() - t0) / 1000).toFixed(0)}s)`,
    );
    const firstError = preds.find((p) => p.error)?.error;
    if (firstError) log(`  first error: ${firstError}`);
    systems.push(r);
  }
  const result: RunResult = {
    ranAt: new Date().toISOString(),
    split,
    corpus: corpusName,
    lexicon: MANIFEST.hash,
    systems,
  };
  mkdirSync(RESULTS, { recursive: true });
  const file = join(
    RESULTS,
    `${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}-${split}.json`,
  );
  writeFileSync(file, JSON.stringify(result, null, 2));
  log(`wrote ${file}`);
  return result;
}
