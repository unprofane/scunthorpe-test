/**
 * npm run bench -- run [--adapters a,b] [--limit N]   (N items evenly spaced)
 * npm run bench -- list
 *
 * Runs the named systems over the public dev split (data/), prints the
 * tables and writes one JSON per run under results/.
 */
import type { Adapter } from './adapter.ts';
import {
  badWordsAdapter,
  leoProfanityAdapter,
  obscenityAdapter,
  twoToadAdapter,
} from './adapters/libraries.ts';
import { unprofaneAdapter } from './adapters/unprofane.ts';
import { readCorpus } from './corpus.ts';
import { markdownReport } from './report.ts';
import { runAll } from './runner.ts';

const CORPUS = new URL('../data/scunthorpe-test-dev.jsonl', import.meta.url).pathname;

const ADAPTERS: Record<string, () => Adapter | Promise<Adapter>> = {
  obscenity: obscenityAdapter,
  'bad-words': badWordsAdapter,
  'leo-profanity': leoProfanityAdapter,
  '2toad-profanity': twoToadAdapter,
  'unprofane-fast': () => unprofaneAdapter('fast'),
  'unprofane-balanced': () => unprofaneAdapter('balanced'),
};

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args[0] === 'list') {
  console.log(Object.keys(ADAPTERS).join('\n'));
} else if (args[0] === 'run') {
  const names = (flag('adapters') ?? 'obscenity,bad-words,leo-profanity,2toad-profanity').split(
    ',',
  );
  const unknown = names.filter((n) => !ADAPTERS[n]);
  if (unknown.length) {
    console.error(`Unknown adapter: ${unknown.join(', ')}. \`npm run bench -- list\` names them.`);
    process.exit(1);
  }
  // --limit N takes N items evenly spaced through the split, so a short run
  // still covers every kind (the file is grouped by kind).
  const all = readCorpus(CORPUS, 'dev');
  const limit = Math.min(Number(flag('limit') ?? 0) || all.length, all.length);
  const items = Array.from({ length: limit }, (_, i) => all[Math.floor((i * all.length) / limit)]!);
  const adapters = await Promise.all(
    names.map((n) => (ADAPTERS[n] as () => Adapter | Promise<Adapter>)()),
  );
  const run = await runAll(adapters, items, 'dev', 'scunthorpe-test-dev.jsonl');
  console.log(`\n${markdownReport(run)}`);
} else {
  console.error('Usage: npm run bench -- run [--adapters a,b] [--limit N] | list');
  process.exit(1);
}
