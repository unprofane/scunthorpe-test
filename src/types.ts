/**
 * The few names the runner shares with Unprofane's engine, written out so
 * this repository stands on its own. Languages, contexts, severities and
 * evasion tags are plain strings here: the corpus file is their list.
 */
export type Action = 'allow' | 'review' | 'block';
export type PolicyPreset = 'kids' | 'teen' | 'standard' | 'strict';
export type EvasionTag = string;
export type Context = string;
export type Language = string;
export type Severity = string;
