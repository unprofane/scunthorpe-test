import { describe, expect, it } from 'vitest';
import { obscenityAdapter } from './adapters/libraries.ts';
import { unprofaneAdapter } from './adapters/unprofane.ts';
import { readCorpus } from './corpus.ts';
import { report } from './metrics.ts';
import { runAdapter } from './runner.ts';

const CORPUS = new URL('../data/scunthorpe-test-dev.jsonl', import.meta.url).pathname;

describe('the harness', () => {
  const items = readCorpus(CORPUS, 'dev');

  it('reads the public dev split and nothing else', () => {
    expect(items.length).toBeGreaterThan(10_000);
    expect(items.every((i) => i.split === 'dev')).toBe(true);
    expect(new Set(items.map((i) => i.kind))).toContain('trap');
  });

  it('runs a library adapter end to end and scores it', async () => {
    const sample = items.slice(0, 300);
    const adapter = await obscenityAdapter();
    const preds = await runAdapter(adapter, sample, 1);
    const r = report(adapter, sample, preds);
    expect(r.n).toBe(300);
    expect(r.errors).toBe(0);
    expect(r.overall.f1).toBeGreaterThanOrEqual(0);
    expect(r.overall.f1).toBeLessThanOrEqual(1);
  });

  it('skips Unprofane without a key instead of scoring it zero', async () => {
    const saved = process.env.UNPROFANE_API_KEY;
    delete process.env.UNPROFANE_API_KEY;
    expect(await unprofaneAdapter('fast').available()).toBe('no UNPROFANE_API_KEY');
    if (saved) process.env.UNPROFANE_API_KEY = saved;
  });
});
