import { getBookHighlightedVerseHref } from "@/lib/bible/utils";
import type {
  BibleSearchStrongsVerseEntry,
  BibleSearchVerseEntry,
  StrongsEntry
} from "@/lib/bible/types";

let strongsLexiconPromise: Promise<Record<string, StrongsEntry>> | null = null;
let strongsVerseIndexPromise: Promise<BibleSearchStrongsVerseEntry[]> | null = null;
let kjvVerseSearchPromise: Promise<BibleSearchVerseEntry[]> | null = null;

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

async function loadStrongsLexicon() {
  if (!strongsLexiconPromise) {
    strongsLexiconPromise = import("@/data/bible/strongs/lexicon.json").then(
      (module) => (module.default ?? {}) as Record<string, StrongsEntry>
    );
  }

  return strongsLexiconPromise;
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
