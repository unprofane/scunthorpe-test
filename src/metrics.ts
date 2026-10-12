/**
 * The numbers the report prints, computed from predictions against the
 * corpus labels. Nothing here is estimated; every figure is a count.
 */
import type { Prediction } from './adapter.ts';
import type { CorpusItem } from './corpus.ts';

export interface Binary {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number;
  recall: number;
  f1: number;
  n: number;
}

export function binary(pairs: Array<[boolean, boolean]>): Binary {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const [expected, got] of pairs) {
    if (expected && got) tp++;
    else if (!expected && got) fp++;
    else if (expected && !got) fn++;
    else tn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, tn, precision, recall, f1, n: pairs.length };
}

export function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx]!;
}

export interface SystemReport {
  adapter: string;
  version: string;
  skipped?: string;
  n: number;
  errors: number;
  overall: Binary;
  byKind: Record<string, Binary>;
  /** False-positive rate on the trap set, by trap sub-kind and overall. */
  traps: { overall: number; n: number; bySubkind: Record<string, { fpr: number; n: number }> };
  /** Recall on evasion items, by technique. */
  evasion: Record<string, { recall: number; n: number }>;
  byLanguage: Record<string, Binary>;
  byContext: Record<string, Binary>;
  /** Policy accuracy (ours only): action agreement per policy. */
  policy?: Record<string, { accuracy: number; n: number; fprOnTraps: number }>;
  latency: {
    p50: number;
    p95: number;
    byRoute?: Record<string, { p50: number; p95: number; n: number }>;
  };
  routeMix?: Record<string, number>;
  degraded?: number;
  tokens?: { input: number; output: number; perCheck: number };
  costPer1k: number;
}

export function report(
  adapter: { name: string; version: string },
  items: CorpusItem[],
  preds: Prediction[],
): SystemReport {
  const pairs = items.map(
    (it, i) => [it.expected.flagged, preds[i]!.flagged] as [boolean, boolean],
  );
  const group = (key: (it: CorpusItem) => string | undefined) => {
    const out: Record<string, Binary> = {};
    const buckets = new Map<string, Array<[boolean, boolean]>>();
    items.forEach((it, i) => {
      const k = key(it);
      if (!k) return;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(pairs[i]!);
    });
    for (const [k, v] of buckets) out[k] = binary(v);
    return out;
  };
  const trapIdx = items.map((it, i) => (it.kind === 'trap' ? i : -1)).filter((i) => i >= 0);
  const trapFp = trapIdx.filter((i) => preds[i]!.flagged).length;
  const bySub: Record<string, { fpr: number; n: number }> = {};
  const subs = new Map<string, number[]>();
  for (const i of trapIdx) {
    const k = items[i]!.subkind ?? 'other';
    if (!subs.has(k)) subs.set(k, []);
    subs.get(k)!.push(i);
  }
  for (const [k, idx] of subs)
    bySub[k] = { fpr: idx.filter((i) => preds[i]!.flagged).length / idx.length, n: idx.length };

  const evasion: Record<string, { recall: number; n: number }> = {};
  const techniques = new Map<string, number[]>();
  items.forEach((it, i) => {
    if (it.kind !== 'evasion' && it.kind !== 'username') return;
    for (const t of it.expected.evasion) {
      if (!techniques.has(t)) techniques.set(t, []);
      techniques.get(t)!.push(i);
    }
  });
  for (const [t, idx] of techniques)
    evasion[t] = {
      recall: idx.filter((i) => preds[i]!.flagged).length / idx.length,
      n: idx.length,
    };

  let policy: SystemReport['policy'];
  if (preds.some((p) => p.action_by_policy)) {
    policy = {};
    for (const name of ['kids', 'teen', 'standard', 'strict'] as const) {
      let agree = 0;
      let n = 0;
      let trapFlagged = 0;
      items.forEach((it, i) => {
        const got = preds[i]!.action_by_policy?.[name];
        if (!got) return;
        n++;
        if (got === it.expected.action_by_policy[name]) agree++;
        if (it.kind === 'trap' && got !== 'allow') trapFlagged++;
      });
      policy[name] = {
        accuracy: n ? agree / n : 0,
        n,
        fprOnTraps: trapIdx.length ? trapFlagged / trapIdx.length : 0,
      };
    }
  }

  const lat = preds.map((p) => p.latencyMs);
  const byRoute: Record<string, { p50: number; p95: number; n: number }> = {};
  const routes = new Map<string, number[]>();
  for (const p of preds) {
    if (!p.route) continue;
    if (!routes.has(p.route)) routes.set(p.route, []);
    routes.get(p.route)!.push(p.latencyMs);
  }
  for (const [r, v] of routes)
    byRoute[r] = { p50: percentile(v, 50), p95: percentile(v, 95), n: v.length };
  const routeMix: Record<string, number> = {};
  for (const [r, v] of routes) routeMix[r] = v.length / preds.length;
  const tokIn = preds.reduce((s, p) => s + (p.tokens?.input ?? 0), 0);
  const tokOut = preds.reduce((s, p) => s + (p.tokens?.output ?? 0), 0);
  const withTokens = preds.filter((p) => p.tokens).length;
  const cost = preds.reduce((s, p) => s + (p.cost ?? 0), 0);

  return {
    adapter: adapter.name,
    version: adapter.version,
    n: items.length,
    errors: preds.filter((p) => p.error).length,
    overall: binary(pairs),
    byKind: group((it) => it.kind),
    traps: {
      overall: trapIdx.length ? trapFp / trapIdx.length : 0,
      n: trapIdx.length,
      bySubkind: bySub,
    },
    evasion,
    byLanguage: group((it) => it.lang),
    byContext: group((it) => it.context),
    ...(policy ? { policy } : {}),
    latency: {
      p50: percentile(lat, 50),
      p95: percentile(lat, 95),
      ...(routes.size ? { byRoute } : {}),
    },
    ...(routes.size ? { routeMix } : {}),
    ...(preds.some((p) => p.degraded !== undefined)
      ? { degraded: preds.filter((p) => p.degraded).length / preds.length }
      : {}),
    ...(withTokens
      ? { tokens: { input: tokIn, output: tokOut, perCheck: tokIn / withTokens } }
      : {}),
    costPer1k: preds.length ? (cost / preds.length) * 1000 : 0,
  };
}
