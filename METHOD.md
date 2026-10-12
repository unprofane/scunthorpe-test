# Method

## Corpus

The corpus is built from graded seeds and templates, so a label is a
function of the data. Items are split 70/30 into `dev` and `heldout` by a
seeded hash of the id, fixed for good. This repository carries the dev
split only; the held-out split is read only to report on it.

| Kind | How it is made | Label |
|---|---|---|
| clean | Hand-written sentences and usernames, plus generated sentences from a neutral vocabulary | allow under every policy |
| trap | Every entry of the innocent list, bare and in a sentence, in a context it claims; sub-kinds place, surname, brand, animal, tool, medical, and the rest | allow under every policy |
| profanity, username | Curated head terms in a sentence or a username template | the seed's category and severity, actions from the policy presets |
| evasion | One disguise technique applied to a strong seed, alone or combined | the seed's label plus the technique tag |
| multilingual | Curated non-English seeds in a short template, plus a hand set | the seed's label |
| contextual | Hand-labelled: emphasis versus insult, medical, quoted | as labelled |
| toxicity | A Civil Comments sample (Jigsaw, CC0): toxicity below 0.2 is clean, 0.5 and above is toxic; the middle is dropped | see below |

**Toxicity labels.** `flagged` is the annotators' toxicity fraction at or
above 0.5. The category is the largest of obscene (profanity), insult,
threat, identity_attack (slur) and sexual_explicit (sexual); the severity
is the fraction banded 0.5 to 0.7 moderate, 0.7 to 0.9 strong, 0.9 and
above extreme. Clean items allow everywhere.

**Review.** Generated evasion items are checked mechanically (the disguise
differs from the seed and keeps most of its letters; the expected tag is
exactly the technique applied), and a stratified 5% is read by a person.
Every trap and every contextual item is hand-labelled at the seed.

## Metrics

`src/metrics.ts`. Binary detection (flagged or not) gives precision, recall
and F1, overall and per kind; the false-positive rate on traps, overall and
by sub-kind; recall per evasion technique; F1 per language and per context;
latency p50 and p95; cost per 1,000 checks where a system's price is
public.

## Systems and their terms

A third-party system appears only where its terms allow benchmarking and
publishing the result. The check was made on 2026-09-24; a system whose
terms forbid it, or could not be read, is left out and named here.

| System | In this repository | Terms |
|---|---|---|
| obscenity, bad-words, leo-profanity, @2toad/profanity | adapters, run by default | MIT |
| Unprofane | adapter through the public API, with your key | ours |
| Perspective API, OpenAI moderation | results only | Perspective's terms allow use of its scores (the API shuts down after 2026-12-31); OpenAI's usage policies allow evaluation. Published as comparisons, without claims beyond the measured numbers. |
| Llama Guard 3 8B, Llama 3.3 70B, Gemma 4 26B (Workers AI) | results only, a 600-item sample | The Llama and Gemma community licences allow evaluation. Kept for the record; they are classifiers or generators, not filters. |
| WebPurify, CleanSpeak, hosted word-list APIs | no | Commercial terms that forbid benchmarking without permission, or none readable. Not run. |

A system without its key is skipped, and the report says so; a skipped
system never appears as a zero.
