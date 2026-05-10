import { getBookHighlightedVerseHref } from "@/lib/bible/utils";
import type {
  BundledBibleVersion,
  BibleSearchStrongsVerseEntry,
  BibleSearchVerseEntry,
  SearchMatchMode,
  StrongsEntry
} from "@/lib/bible/types";

type SearchableGreekStrongsEntry = StrongsEntry & {
  normalizedLemma: string;
  normalizedTransliteration: string;
};

type SearchableEnglishStrongsEntry = StrongsEntry & {
  normalizedDefinition: string;
  normalizedDefinitionPhrases: string[];
  normalizedOutlineUsage: string;
  normalizedOutlineUsagePhrases: string[];
  normalizedBdagSummary: string;
  normalizedBdagSummaryPhrases: string[];
};

let strongsLexiconPromise: Promise<Record<string, StrongsEntry>> | null = null;
let strongsVerseIndexPromise: Promise<BibleSearchStrongsVerseEntry[]> | null = null;
let searchableGreekEntriesPromise: Promise<SearchableGreekStrongsEntry[]> | null = null;
let searchableEnglishEntriesPromise: Promise<SearchableEnglishStrongsEntry[]> | null = null;
const verseSearchPromises = new Map<BundledBibleVersion, Promise<BibleSearchVerseEntry[]>>();

const verseSearchLoaders: Record<BundledBibleVersion, () => Promise<unknown>> = {
  web: () => import("@/data/bible/search/web.json"),
  kjv: () => import("@/data/bible/search/kjv.json"),
  nlt: () => import("@/data/bible/search/nlt.json"),
  esv: () => import("@/data/bible/search/esv.json"),
  greek: () => import("@/data/bible/search/greek.json"),
  tr: () => import("@/data/bible/search/tr.json")
};

export type StrongsParallelVerseVersion = {
  version: BundledBibleVersion;
  entry: BibleSearchVerseEntry | null;
  href: string;
};

export type VerseReferenceAnchor = Pick<
  BibleSearchVerseEntry,
  "bookSlug" | "chapterNumber" | "verseNumber"
>;

export type StrongsParallelVerseRow = {
  strongsNumber: string;
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  versions: StrongsParallelVerseVersion[];
};

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

function normalizeEnglishStrongsLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^\p{L}0-9\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEnglishStrongsLookupPhrases(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[;,]|\.\s+/)
        .map((part) => normalizeEnglishStrongsLookupValue(part))
        .filter(Boolean)
    )
  );
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

async function loadSearchableEnglishEntries() {
  if (!searchableEnglishEntriesPromise) {
    searchableEnglishEntriesPromise = loadStrongsLexicon().then((lexicon) =>
      Object.values(lexicon).map((entry) => ({
        ...entry,
        normalizedDefinition: normalizeEnglishStrongsLookupValue(entry.definition),
        normalizedDefinitionPhrases: normalizeEnglishStrongsLookupPhrases(entry.definition),
        normalizedOutlineUsage: normalizeEnglishStrongsLookupValue(entry.outlineUsage),
        normalizedOutlineUsagePhrases: normalizeEnglishStrongsLookupPhrases(entry.outlineUsage),
        normalizedBdagSummary: normalizeEnglishStrongsLookupValue(
          entry.bdagArticles
            ?.flatMap((article) =>
              [article.summary.plainMeaning, article.summary.commonUse, article.summary.ntNote]
                .filter(Boolean)
                .join(" ")
            )
            .join(" ") ?? ""
        ),
        normalizedBdagSummaryPhrases: normalizeEnglishStrongsLookupPhrases(
          entry.bdagArticles
            ?.flatMap((article) =>
              [article.summary.plainMeaning, article.summary.commonUse, article.summary.ntNote]
                .filter(Boolean)
                .join(" ")
            )
            .join(" ") ?? ""
        )
      }))
    );
  }

  return searchableEnglishEntriesPromise;
}

async function loadStrongsVerseIndex() {
  if (!strongsVerseIndexPromise) {
    strongsVerseIndexPromise = import("@/data/bible/search/strongs-kjv.json").then(
      (module) => ((module.default ?? []) as BibleSearchStrongsVerseEntry[])
    );
  }

  return strongsVerseIndexPromise;
}

async function loadVerseSearchIndex(version: BundledBibleVersion) {
  const existing = verseSearchPromises.get(version);

  if (existing) {
    return existing;
  }

  const promise = verseSearchLoaders[version]().then(
    (module) => ((module as { default?: BibleSearchVerseEntry[] }).default ?? [])
  );

  verseSearchPromises.set(version, promise);
  return promise;
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

function getFieldEnglishSearchScore(
  candidate: string,
  candidatePhrases: readonly string[],
  normalizedQuery: string,
  matchMode: SearchMatchMode
) {
  if (candidatePhrases.some((phrase) => phrase === normalizedQuery)) {
    return 0;
  }

  if (` ${candidate} `.includes(` ${normalizedQuery} `)) {
    return 1;
  }

  if (candidate.startsWith(normalizedQuery)) {
    return 2;
  }

  if (matchMode === "complete") {
    return null;
  }

  if (candidate.includes(normalizedQuery)) {
    return 3;
  }

  return null;
}

function getEnglishSearchScoreForMode(
  entry: SearchableEnglishStrongsEntry,
  normalizedQuery: string,
  matchMode: SearchMatchMode
) {
  const outlineScore = entry.normalizedOutlineUsage
    ? getFieldEnglishSearchScore(
        entry.normalizedOutlineUsage,
        entry.normalizedOutlineUsagePhrases,
        normalizedQuery,
        matchMode
      )
    : null;

  if (outlineScore !== null) {
    return outlineScore;
  }

  const bdagScore = entry.normalizedBdagSummary
    ? getFieldEnglishSearchScore(
        entry.normalizedBdagSummary,
        entry.normalizedBdagSummaryPhrases,
        normalizedQuery,
        matchMode
      )
    : null;

  if (bdagScore !== null) {
    return bdagScore + 4;
  }

  const definitionScore = entry.normalizedDefinition
    ? getFieldEnglishSearchScore(
        entry.normalizedDefinition,
        entry.normalizedDefinitionPhrases,
        normalizedQuery,
        matchMode
      )
    : null;

  return definitionScore !== null ? definitionScore + 8 : null;
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

export async function searchEnglishStrongsEntries(
  query: string,
  limit = 8,
  matchMode: SearchMatchMode = "partial"
) {
  const normalizedQuery = normalizeEnglishStrongsLookupValue(query);

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return [];
  }

  const entries = await loadSearchableEnglishEntries();

  return entries
    .map((entry) => ({
      entry,
      score: getEnglishSearchScoreForMode(entry, normalizedQuery, matchMode)
    }))
    .filter((entry): entry is { entry: SearchableEnglishStrongsEntry; score: number } => entry.score !== null)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return left.score - right.score;
      }

      if (left.entry.language !== right.entry.language) {
        return left.entry.language === "hebrew" ? -1 : 1;
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
  const verseIndex = await loadVerseSearchIndex("kjv");

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

export async function getVerseEntriesForVersion(
  anchors: readonly VerseReferenceAnchor[],
  version: BundledBibleVersion
) {
  const verseIndex = await loadVerseSearchIndex(version);

  return anchors.map<StrongsParallelVerseVersion>((anchor) => {
    const entry =
      verseIndex.find(
        (candidate) =>
          candidate.bookSlug === anchor.bookSlug &&
          candidate.chapterNumber === anchor.chapterNumber &&
          candidate.verseNumber === anchor.verseNumber
      ) ?? null;

    return {
      version,
      entry,
      href: getBookHighlightedVerseHref(
        anchor.bookSlug,
        anchor.chapterNumber,
        anchor.verseNumber,
        version
      )
    };
  });
}

export async function getStrongsParallelVerseRows(
  strongsNumber: string,
  versions: readonly BundledBibleVersion[]
) {
  const normalized = normalizeStrongsNumber(strongsNumber);
  const uniqueVersions = Array.from(new Set(versions));

  if (uniqueVersions.length === 0) {
    return [];
  }

  const [baseMatches, ...verseIndexes] = await Promise.all([
    getStrongsVerseOccurrences(normalized),
    ...uniqueVersions.map((version) => loadVerseSearchIndex(version))
  ]);

  return baseMatches.map<StrongsParallelVerseRow>((match) => ({
    strongsNumber: normalized,
    bookSlug: match.bookSlug,
    bookName: match.bookName,
    chapterNumber: match.chapterNumber,
    verseNumber: match.verseNumber,
    versions: uniqueVersions.map((version, index) => {
      const entry =
        verseIndexes[index]?.find(
          (candidate) =>
            candidate.bookSlug === match.bookSlug &&
            candidate.chapterNumber === match.chapterNumber &&
            candidate.verseNumber === match.verseNumber
        ) ?? null;

      return {
        version,
        entry,
        href: getBookHighlightedVerseHref(
          match.bookSlug,
          match.chapterNumber,
          match.verseNumber,
          version
        )
      };
    })
  }));
}
