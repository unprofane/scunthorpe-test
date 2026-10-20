/**
 * The few names the runner shares with Unprofane's engine, written out so
 * this repository stands on its own. Languages, contexts, severities and
 * evasion tags are plain strings here: the corpus file is their list.
 */
export type Action = 'allow' | 'review' | 'block';
export type PolicyPreset = 'kids' | 'teen' | 'standard' | 'strict';
/** The presets the corpus gives an action for: every one this repository knows. */
export type CalibratedPreset = PolicyPreset;
export type EvasionTag = string;
export type Context = string;
export type Language = string;
export type Severity = string;

/** The lexicon a run read, which the monorepo's runner records by its
 * manifest hash. Unprofane's word lists are not in this repository, so a
 * run here names none. */
export const MANIFEST: { hash?: string } = {};
