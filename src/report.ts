import type { SystemReport } from './metrics.ts';
import type { RunResult } from './runner.ts';

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const f3 = (x: number) => x.toFixed(3);

export function markdownReport(run: RunResult): string {
  const out: string[] = [];
  out.push(`Run ${run.ranAt}, split ${run.split}, corpus ${run.corpus}\n`);
  out.push(
    '| System | Version | F1 | Precision | Recall | Trap FPR | p50 ms | p95 ms | Cost / 1k | Errors |',
  );
  out.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const s of run.systems) {
    if (s.skipped) {
      out.push(`| ${s.adapter} | ${s.version} | skipped: ${s.skipped} | | | | | | | |`);
      continue;
    }
    out.push(
      `| ${s.adapter} | ${s.version} | ${f3(s.overall.f1)} | ${f3(s.overall.precision)} | ${f3(s.overall.recall)} | ${pct(s.traps.overall)} | ${s.latency.p50.toFixed(0)} | ${s.latency.p95.toFixed(0)} | $${s.costPer1k.toFixed(4)} | ${s.errors} |`,
    );
  }
  const ran = run.systems.filter((s) => !s.skipped);
  const techniques = [...new Set(ran.flatMap((s) => Object.keys(s.evasion)))].sort();
  if (techniques.length) {
    out.push('\nEvasion recall per technique\n');
    out.push(`| Technique | n | ${ran.map((s) => s.adapter).join(' | ')} |`);
    out.push(`|---|---|${ran.map(() => '---').join('|')}|`);
    for (const t of techniques) {
      const n = ran.find((s) => s.evasion[t])?.evasion[t]?.n ?? 0;
      out.push(
        `| ${t} | ${n} | ${ran.map((s) => (s.evasion[t] ? pct(s.evasion[t]!.recall) : '')).join(' | ')} |`,
      );
    }
  }
  const kinds = [...new Set(ran.flatMap((s) => Object.keys(s.byKind)))];
  if (kinds.length) {
    out.push('\nF1 by corpus kind\n');
    out.push(`| Kind | ${ran.map((s) => s.adapter).join(' | ')} |`);
    out.push(`|---|${ran.map(() => '---').join('|')}|`);
    for (const k of kinds)
      out.push(
        `| ${k} | ${ran.map((s) => (s.byKind[k] ? `${f3(s.byKind[k]!.f1)} (n=${s.byKind[k]!.n})` : '')).join(' | ')} |`,
      );
  }
  const langs = [...new Set(ran.flatMap((s) => Object.keys(s.byLanguage)))].sort();
  if (langs.length) {
    out.push('\nF1 by language\n');
    out.push(`| Language | ${ran.map((s) => s.adapter).join(' | ')} |`);
    out.push(`|---|${ran.map(() => '---').join('|')}|`);
    for (const l of langs)
      out.push(
        `| ${l} | ${ran.map((s) => (s.byLanguage[l] ? `${f3(s.byLanguage[l]!.f1)} (n=${s.byLanguage[l]!.n})` : '')).join(' | ')} |`,
      );
  }
  const trapSubs = [...new Set(ran.flatMap((s) => Object.keys(s.traps.bySubkind)))].sort();
  if (trapSubs.length) {
    out.push('\nFalse-positive rate on traps, by kind\n');
    out.push(`| Trap kind | n | ${ran.map((s) => s.adapter).join(' | ')} |`);
    out.push(`|---|---|${ran.map(() => '---').join('|')}|`);
    for (const t of trapSubs) {
      const n = ran.find((s) => s.traps.bySubkind[t])?.traps.bySubkind[t]?.n ?? 0;
      out.push(
        `| ${t} | ${n} | ${ran.map((s) => (s.traps.bySubkind[t] ? pct(s.traps.bySubkind[t]!.fpr) : '')).join(' | ')} |`,
      );
    }
  }
  for (const s of ran) {
    if (!s.policy) continue;
    out.push(`\n${s.adapter}: policy accuracy (action agreement) and trap FPR per policy\n`);
    out.push('| Policy | Accuracy | Trap FPR | n |');
    out.push('|---|---|---|---|');
    for (const [p, v] of Object.entries(s.policy))
      out.push(`| ${p} | ${pct(v.accuracy)} | ${pct(v.fprOnTraps)} | ${v.n} |`);
    if (s.latency.byRoute) {
      out.push('\nLatency by route\n');
      out.push('| Route | share | p50 ms | p95 ms |');
      out.push('|---|---|---|---|');
      for (const [r, v] of Object.entries(s.latency.byRoute))
        out.push(
          `| ${r} | ${pct(s.routeMix?.[r] ?? 0)} | ${v.p50.toFixed(0)} | ${v.p95.toFixed(0)} |`,
        );
    }
    if (s.tokens)
      out.push(
        `\nTokens: ${s.tokens.perCheck.toFixed(0)} input per model call (${s.tokens.input} in, ${s.tokens.output} out); degraded ${pct(s.degraded ?? 0)}`,
      );
  }
  return out.join('\n');
}

export type { SystemReport };
