/**
 * The Scunthorpe Test corpus: JSONL records, one per line. `split` keeps
 * the held-out set out of every tuning script; only `run --split heldout`
 * reads it, and only for a report.
 */
import { readFileSync } from 'node:fs';
import type { Action, CalibratedPreset, EvasionTag } from './types.ts';
import type { Context, Language, Severity } from './types.ts';

export type CorpusCategory =
  | 'clean'
  | 'trap'
  | 'profanity'
  | 'evasion'
  | 'multilingual'
  | 'username'
  | 'contextual'
  | 'toxicity';

export interface CorpusItem {
  id: string;
  text: string;
  context: Context;
  lang: Language | 'und';
  /** What the item is for; a report groups by it. */
  kind: CorpusCategory;
  /** The trap's sub-kind (place, surname, medical…), or the seed's category. */
  subkind?: string;
  expected: {
    flagged: boolean;
    action_by_policy: Record<CalibratedPreset, Action>;
    categories: string[];
    severity: Severity | 'none';
    evasion: EvasionTag[];
  };
  split: 'dev' | 'heldout';
  source: string;
  license: string;
  /** Civil Comments items only: the annotators' fractions per attribute,
   * for the Perspective-scale fit. */
  annotations?: Record<string, number>;
}

export function readCorpus(path: string, split?: 'dev' | 'heldout'): CorpusItem[] {
  const items = readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CorpusItem);
  return split ? items.filter((i) => i.split === split) : items;
}
