# The Scunthorpe Test

A profanity-filter benchmark where blocking Scunthorpe counts against you.

Every profanity-filter benchmark we could find measured one thing: how much
profanity a filter caught. None measured how many innocent words it
blocked, so a filter that blocks "Scunthorpe", "cockatoo" and "breast
cancer" scores the same as one that does not. That is the number a product
team needs, and this benchmark reports it beside recall: plain profanity,
every disguise technique alone and combined, usernames, contextual cases
(emphasis versus insult, medical, quoted), a Civil Comments sample of
running text, and innocent words and phrases that merely contain a profane
string, bare and in sentences.

Each label is a function of the data, not a guess: generated items carry
the label of the seed they were made from and the exact technique applied;
Civil Comments items carry the annotators' own fractions. How every kind of
item is made, labelled and scored, and which systems may be run, is in
[METHOD.md](METHOD.md).

## Leaderboard

The dev split, as unprofane.com prints it (`results/leaderboard.json`, generated 2026-10-20). Trap FPR is the share of innocent items a system flagged: lower is better. The Workers AI rows ran on a 600-item sample.

| System | Version | Items | F1 | Precision | Recall | Trap FPR |
|---|---|---|---|---|---|---|
| unprofane-fast | 2026-10-18 | 15,550 | 0.919 | 0.996 | 0.853 | 0.0% |
| workers-ai-llama-3.3-70b | @cf/meta/llama-3.3-70b-instruct-fp8-fast | 600 | 0.909 | 0.957 | 0.866 | 6.0% |
| openai-moderation | omni-moderation-latest | 15,501 | 0.553 | 0.948 | 0.390 | 3.2% |
| obscenity | 0.4.6 | 15,550 | 0.364 | 0.928 | 0.227 | 20.2% |
| perspective | v1alpha1 | 15,501 | 0.314 | 0.990 | 0.187 | 3.0% |
| workers-ai-llama-guard-3-8b | @cf/meta/llama-guard-3-8b | 600 | 0.235 | 0.932 | 0.134 | 1.8% |
| bad-words | 4.1.5 | 15,501 | 0.142 | 0.855 | 0.077 | 12.5% |
| 2toad-profanity | 3.3.0 | 15,501 | 0.128 | 0.878 | 0.069 | 11.5% |
| leo-profanity | 1.9.0 | 15,501 | 0.057 | 0.793 | 0.030 | 8.7% |
| workers-ai-gemma-4-26b | @cf/google/gemma-4-26b-a4b-it | 600 | 0.000 | 0.000 | 0.000 | 0.0% |

## Run it

Node 22.18 or later.

```bash
npm install
npm run bench -- run
```

runs the four open-source word-list libraries over the dev split, prints
the tables and writes a result file under `results/`. `--limit 500` runs
500 items spread evenly through the split; `npm run bench -- list` names every adapter.

Unprofane runs through its public API with your own key:

```bash
UNPROFANE_API_KEY=up_live_… npm run bench -- run --adapters unprofane-fast
```

A live key is needed: test keys stop at 100 checks a day, and the dev split
is 15,530 items.

## Add your filter

An adapter is one file: `available()` says why it cannot run (a missing key),
and `run(item)` returns whether the system flags the text and how long it
took. See `src/adapter.ts` for the interface and `src/adapters/` for
examples, then add it to the list in `src/cli.ts`.

## The data

`data/scunthorpe-test-dev.jsonl` is the public dev split, one item per line:
`id`, `text`, `context`, `lang`, `kind`, `subkind`, `expected` (flagged,
the action under each policy, categories, severity, evasion tags), `source`
and `license`. It is the same file unprofane.com offers as a download.

A held-out split of the same corpus, 30% of it, is never published. Results
are reported on both, so a filter fitted to the public set is caught.

Data: CC BY 4.0, with each item's own licence where it differs
([DATA-LICENSE.md](DATA-LICENSE.md)). Code: MIT ([LICENSE](LICENSE)).

Results and the method on the web: https://unprofane.com/bench/scunthorpe/
