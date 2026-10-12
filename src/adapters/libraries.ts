/**
 * The open-source word-list libraries, as people actually use them: the
 * default constructor, the default list, `isProfane`-style calls. Each
 * carries the version installed from the lock file.
 */
import { readFileSync } from 'node:fs';
import type { Adapter } from '../adapter.ts';

const version = (pkg: string) =>
  (
    JSON.parse(
      readFileSync(new URL(`../../node_modules/${pkg}/package.json`, import.meta.url), 'utf8'),
    ) as { version: string }
  ).version;

export async function obscenityAdapter(): Promise<Adapter> {
  const { RegExpMatcher, englishDataset, englishRecommendedTransformers } = await import(
    'obscenity'
  );
  const matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });
  return {
    name: 'obscenity',
    version: version('obscenity'),
    cacheable: false,
    available: async () => null,
    async run(item) {
      const t0 = performance.now();
      const flagged = matcher.hasMatch(item.text);
      return { flagged, latencyMs: performance.now() - t0, cost: 0 };
    },
  };
}

export async function badWordsAdapter(): Promise<Adapter> {
  const mod = (await import('bad-words')) as {
    Filter?: new () => { isProfane(s: string): boolean };
    default?: new () => { isProfane(s: string): boolean };
  };
  const Filter = mod.Filter ?? mod.default!;
  const filter = new Filter();
  return {
    name: 'bad-words',
    version: version('bad-words'),
    cacheable: false,
    available: async () => null,
    async run(item) {
      const t0 = performance.now();
      let flagged = false;
      try {
        flagged = filter.isProfane(item.text);
      } catch {
        flagged = false;
      }
      return { flagged, latencyMs: performance.now() - t0, cost: 0 };
    },
  };
}

export async function leoProfanityAdapter(): Promise<Adapter> {
  const mod = (await import('leo-profanity')) as {
    default?: { loadDictionary(l: string): void; check(s: string): boolean };
  } & { loadDictionary?(l: string): void; check?(s: string): boolean };
  const leo = (mod.default ?? mod) as {
    loadDictionary(l: string): void;
    check(s: string): boolean;
  };
  leo.loadDictionary('en');
  return {
    name: 'leo-profanity',
    version: version('leo-profanity'),
    cacheable: false,
    available: async () => null,
    async run(item) {
      const t0 = performance.now();
      const flagged = leo.check(item.text);
      return { flagged, latencyMs: performance.now() - t0, cost: 0 };
    },
  };
}

export async function twoToadAdapter(): Promise<Adapter> {
  const { profanity } = await import('@2toad/profanity');
  return {
    name: '2toad-profanity',
    version: version('@2toad/profanity'),
    cacheable: false,
    available: async () => null,
    async run(item) {
      const t0 = performance.now();
      const flagged = profanity.exists(item.text);
      return { flagged, latencyMs: performance.now() - t0, cost: 0 };
    },
  };
}
