import { getBookHighlightedVerseHref } from "@/lib/bible/utils";
import type {
  BibleSearchStrongsVerseEntry,
  BibleSearchVerseEntry,
  StrongsEntry
} from "@/lib/bible/types";

type SearchableGreekStrongsEntry = StrongsEntry & {
  normalizedLemma: string;
  normalizedTransliteration: string;
};

let strongsLexiconPromise: Promise<Record<string, StrongsEntry>> | null = null;
let strongsVerseIndexPromise: Promise<BibleSearchStrongsVerseEntry[]> | null = null;
let kjvVerseSearchPromise: Promise<BibleSearchVerseEntry[]> | null = null;
let searchableGreekEntriesPromise: Promise<SearchableGreekStrongsEntry[]> | null = null;

export function normalizeStrongsNumber(value: string) {
  const match = value.trim().toUpperCase().match(/^([HG])\s*0*(\d+)$/);

  if (!match) {
    return value.trim().toUpperCase();
  }

  const [, prefix, digits] = match;
  const numericValue = Number(digits);

  return Number.isFinite(numericValue) && numericValue > 0
    ? `${prefix}${numericValue}`
    : `${prefix}${digits}`;
}

export function normalizeGreekWordLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}a-z0-9\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadStrongsLexicon() {
  if (!strongsLexiconPromise) {
    strongsLexiconPromise = import("@/data/bible/strongs/lexicon.json").then(
      (module) => (module.default ?? {}) as Record<string, StrongsEntry>
    );
  }

  return strongsLexiconPromise;
}

async function loadSearchableGreekEntries() {
  if (!searchableGreekEntriesPromise) {
    searchableGreekEntriesPromise = loadStrongsLexicon().then((lexicon) =>
      Object.values(lexicon)
        .filter((entry) => entry.language === "greek")
        .map((entry) => ({
          ...entry,
          normalizedLemma: normalizeGreekWordLookupValue(entry.lemma),
          normalizedTransliteration: normalizeGreekWordLookupValue(entry.transliteration)
        }))
    );
  }

  return searchableGreekEntriesPromise;
}

async function loadStrongsVerseIndex() {
  if (!strongsVerseIndexPromise) {
    strongsVerseIndexPromise = import("@/data/bible/search/strongs-kjv.json").then(
      (module) => ((module.default ?? []) as BibleSearchStrongsVerseEntry[])
    );
  }

  return strongsVerseIndexPromise;
}

async function loadKjvVerseSearchIndex() {
  if (!kjvVerseSearchPromise) {
    kjvVerseSearchPromise = import("@/data/bible/search/kjv.json").then(
      (module) => ((module.default ?? []) as BibleSearchVerseEntry[])
    );
  }

  return kjvVerseSearchPromise;
}

function getGreekSearchScore(
  entry: Pick<SearchableGreekStrongsEntry, "normalizedLemma" | "normalizedTransliteration">,
  normalizedQuery: string
) {
  const candidates = [entry.normalizedLemma, entry.normalizedTransliteration].filter(Boolean);

  if (candidates.some((candidate) => candidate === normalizedQuery)) {
    return 0;
  }

  if (candidates.some((candidate) => candidate.startsWith(normalizedQuery))) {
    return 1;
  }

  if (candidates.some((candidate) => candidate.includes(normalizedQuery))) {
    return 2;
  }

  return null;
}

export async function getStrongsEntries(strongsNumbers: string[]) {
  const lexicon = await loadStrongsLexicon();

  return strongsNumbers
    .map((strongsNumber) => lexicon[normalizeStrongsNumber(strongsNumber)] ?? null)
    .filter((entry): entry is StrongsEntry => entry !== null);
}

export async function getStrongsEntry(strongsNumber: string) {
  const lexicon = await loadStrongsLexicon();

  return lexicon[normalizeStrongsNumber(strongsNumber)] ?? null;
}

export async function searchGreekStrongsEntries(query: string, limit = 8) {
  const normalizedQuery = normalizeGreekWordLookupValue(query);

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  const entries = await loadSearchableGreekEntries();

  return entries
    .map((entry) => ({
      entry,
      score: getGreekSearchScore(entry, normalizedQuery)
    }))
    .filter((entry): entry is { entry: SearchableGreekStrongsEntry; score: number } => entry.score !== null)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      return Number.parseInt(left.entry.id.slice(1), 10) - Number.parseInt(right.entry.id.slice(1), 10);
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export async function getStrongsVerseOccurrences(strongsNumber: string) {
  const normalized = normalizeStrongsNumber(strongsNumber);
  const verseIndex = await loadStrongsVerseIndex();

  return verseIndex
    .filter((entry) => entry.strongsNumber === normalized)
    .map((entry) => ({
      ...entry,
      href: getBookHighlightedVerseHref(entry.bookSlug, entry.chapterNumber, entry.verseNumber, "kjv")
    }));
}

export async function getStrongsVerseOccurrencesWithTokens(strongsNumber: string) {
  const normalized = normalizeStrongsNumber(strongsNumber);
  const verseIndex = await loadKjvVerseSearchIndex();

  return verseIndex
    .filter((entry) =>
      entry.tokens?.some((token) =>
        token.strongsNumbers?.some(
          (tokenStrongsNumber) => normalizeStrongsNumber(tokenStrongsNumber) === normalized
        )
      )
    )
    .map((entry) => ({
      ...entry,
      href: getBookHighlightedVerseHref(entry.bookSlug, entry.chapterNumber, entry.verseNumber, "kjv")
    }));
}
