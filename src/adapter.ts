/**
 * What every system under test looks like to the runner. `available()`
 * says why an adapter cannot run (a missing key, a probe that is down) so
 * the report can say "skipped: no PERSPECTIVE_API_KEY" instead of a zero.
 */
import type { Action } from './types.ts';
import type { CorpusItem } from './corpus.ts';

export interface Prediction {
  /** Whether the system flags the text at all: the binary every system answers. */
  flagged: boolean;
  /** The action under each policy, for systems that have policies (ours). */
  action_by_policy?: Partial<Record<'kids' | 'teen' | 'standard' | 'strict', Action>>;
  categories?: Record<string, number>;
  /** Ours: the standard preset acted for the reserved-name check alone
   * (reserved.ts), counted apart from abuse. */
  reserved?: boolean;
  /** Wall-clock for the call, excluding the cache. */
  latencyMs: number;
  /** Which route answered, for ours. */
  route?: 'rules' | 'model' | 'cache';
  degraded?: boolean;
  tokens?: { input: number; output: number };
  /** Model calls made for this item in this run (a two-step ask can make
   * two); the replay cache answers the rest. */
  calls?: number;
  /** USD, when the system's price is public. */
  cost?: number;
  error?: string;
}

export interface Adapter {
  name: string;
  version: string;
  /** null when it can run, otherwise the reason it cannot. */
  available(): Promise<string | null>;
  run(item: CorpusItem): Promise<Prediction>;
  /** Cached answers are replayed; a rules-only library needs no cache. */
  cacheable: boolean;
  /** Parallel calls in flight; default four, the Worker's own outbound cap. */
  concurrency?: number;
}
