import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import { getStrongsEntry, normalizeStrongsNumber } from "@/lib/bible/strongs";
import type {
  BibleSearchResult,
  BibleSearchResultGroup,
  BibleSearchStrongsVerseEntry,
  BibleSearchTopicResult,
  BibleSearchTopicSuggestionResult,
  BibleSearchVerseResult,
  BibleTopicSearchEntry,
  BibleSearchVerseEntry,
  BookMeta,
  BundledBibleVersion,
  SearchMatchMode,
  SearchScope,
  VerseToken
} from "@/lib/bible/types";
import {
  getBookChapterHref,
  getBookHighlightedVerseHref,
  getBookHref
} from "@/lib/bible/utils";

type SearchableBook = BookMeta & {
  normalizedAbbreviation: string;
  normalizedName: string;
  normalizedSlug: string;
};

type SearchableVerseEntry = BibleSearchVerseEntry & {
  normalizedText: string;
};

type SearchableTopicEntry = BibleTopicSearchEntry & {
  order: number;
  normalizedAliases: string[];
};

type ParsedReference = {
  book: SearchableBook;
  chapterNumber: number;
  verseNumber: number | null;
  endVerseNumber: number | null;
};

type ParsedTopicQuery = {
  rawFilter: string;
  normalizedFilter: string;
};

const MIN_VERSE_QUERY_LENGTH = 2;
const MAX_BOOK_RESULTS = 6;
const MAX_VERSE_RESULTS = 24;
const MAX_MULTI_QUERY_PARTS = 5;
const MAX_TOPIC_SUGGESTIONS = 8;

const verseIndexLoaders: Record<BundledBibleVersion, () => Promise<unknown>> = {
  web: () => import("@/data/bible/search/web.json"),
  kjv: () => import("@/data/bible/search/kjv.json"),
  nlt: () => import("@/data/bible/search/nlt.json"),
  esv: () => import("@/data/bible/search/esv.json")
};
const topicIndexLoaders: Record<BundledBibleVersion, () => Promise<unknown>> = {
  web: () => import("@/data/bible/search/topics-web.json"),
  kjv: () => import("@/data/bible/search/topics-kjv.json"),
  nlt: () => import("@/data/bible/search/topics-nlt.json"),
  esv: () => import("@/data/bible/search/topics-esv.json")
};

let booksPromise: Promise<SearchableBook[]> | null = null;
const verseIndexCache = new Map<BundledBibleVersion, Promise<SearchableVerseEntry[]>>();
const topicIndexCache = new Map<BundledBibleVersion, Promise<SearchableTopicEntry[]>>();
let strongsVerseIndexPromise: Promise<BibleSearchStrongsVerseEntry[]> | null = null;

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeBookValue(value: string) {
  return normalizeValue(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeTopicValue(value: string) {
  return normalizeBookValue(value);
}

function normalizeVerseValue(value: string) {
  return normalizeValue(value)
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTopicQuery(rawQuery: string): ParsedTopicQuery | null {
  const match = rawQuery.match(/^topic\s*:(.*)$/i);

  if (!match) {
    return null;
  }

  const rawFilter = match[1]?.trim() ?? "";

  return {
    rawFilter,
    normalizedFilter: normalizeTopicValue(rawFilter)
  };
}

function parseStrongsQuery(query: string) {
  const match = query.match(/^(?:strongs\s+)?([hg])\s*0*(\d+)$/i);

  if (!match) {
    return null;
  }

  const numericValue = Number(match[2]);

  if (!Number.isFinite(numericValue) || numericValue < 1) {
    return null;
  }

  return normalizeStrongsNumber(`${match[1]}${numericValue}`);
}

function getStrongsPreview(
  strongsNumber: string,
  verseCount: number,
  entry: NonNullable<Awaited<ReturnType<typeof getStrongsEntry>>>
) {
  const detailParts = [entry.lemma, entry.transliteration]
    .map((value) => value.trim())
    .filter(Boolean);
  const header = detailParts.length > 0 ? detailParts.join(" • ") : strongsNumber;
  return `${header}\nOpen in the Strongs window\nUsed in ${verseCount} KJV verse${verseCount === 1 ? "" : "s"}.`;
}

function getTopicSuggestionResult(topic: SearchableTopicEntry, version: BundledBibleVersion): BibleSearchTopicSuggestionResult {
  const verseCount = topic.subtopics.reduce((count, subtopic) => count + subtopic.verses.length, 0);

  return {
    type: "topic-suggestion",
    id: `topic-suggestion:${topic.id}:${version}`,
    topicId: topic.id,
    label: topic.label,
    description: `${topic.subtopics.length} subtopic${topic.subtopics.length === 1 ? "" : "s"} • ${verseCount} verse${verseCount === 1 ? "" : "s"}`,
    preview: topic.aliases.join(", ")
  };
}

function getSearchScopeBookSlug(scope: SearchScope) {
  return scope.startsWith("book:") ? scope.slice(5) : null;
}

function matchesSearchScopeBook(book: Pick<BookMeta, "slug" | "testament">, scope: SearchScope) {
  if (scope === "all") {
    return true;
  }

  if (scope === "old-testament") {
    return book.testament === "Old";
  }

  if (scope === "new-testament") {
    return book.testament === "New";
  }

  return book.slug === getSearchScopeBookSlug(scope);
}

function findReferenceBook(bookQuery: string, books: SearchableBook[]) {
  const exactMatch =
    books.find(
      (book) =>
        book.normalizedName === bookQuery ||
        book.normalizedAbbreviation === bookQuery ||
        book.normalizedSlug === bookQuery
    ) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = books.filter(
    (book) =>
      book.normalizedName.startsWith(bookQuery) ||
      book.normalizedAbbreviation.startsWith(bookQuery) ||
      book.normalizedSlug.startsWith(bookQuery)
  );

  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function parseReferenceQuery(query: string, books: SearchableBook[]): ParsedReference | null {
  const rangeMatch = query.match(/^(.+?)\s+(\d+):(\d+)-(\d+)$/);

  if (rangeMatch) {
    const [, rawBookQuery, chapterValue, startVerseValue, endVerseValue] = rangeMatch;
    const bookQuery = normalizeBookValue(rawBookQuery);
    const chapterNumber = Number(chapterValue);
    const verseNumber = Number(startVerseValue);
    const endVerseNumber = Number(endVerseValue);

    if (!bookQuery || chapterNumber < 1 || verseNumber < 1 || endVerseNumber < verseNumber) {
      return null;
    }

    const book = findReferenceBook(bookQuery, books);

    if (!book || chapterNumber > book.chapterCount) {
      return null;
    }

    return {
      book,
      chapterNumber,
      verseNumber,
      endVerseNumber
    };
  }

  const referenceMatch = query.match(/^(.+?)\s+(\d+)(?::(\d+))?$/);

  if (!referenceMatch) {
    return null;
  }

  const [, rawBookQuery, chapterValue, verseValue] = referenceMatch;
  const bookQuery = normalizeBookValue(rawBookQuery);
  const chapterNumber = Number(chapterValue);
  const verseNumber = verseValue ? Number(verseValue) : null;

  if (!bookQuery || chapterNumber < 1) {
    return null;
  }

  const book = findReferenceBook(bookQuery, books);

  if (!book || chapterNumber > book.chapterCount) {
    return null;
  }

  return {
    book,
    chapterNumber,
    verseNumber,
    endVerseNumber: null
  };
}

async function loadBooks() {
  if (!booksPromise) {
    booksPromise = import("@/data/bible/versions/web/books.json").then(({ default: books }) =>
      (books as BookMeta[]).map((book) => ({
        ...book,
        normalizedAbbreviation: normalizeBookValue(book.abbreviation),
        normalizedName: normalizeBookValue(book.name),
        normalizedSlug: normalizeBookValue(book.slug.replace(/-/g, " "))
      }))
    );
  }

  return booksPromise;
}

async function loadVerseIndex(version: BundledBibleVersion) {
  const existing = verseIndexCache.get(version);

  if (existing) {
    return existing;
  }

  const promise = verseIndexLoaders[version]().then((module) =>
    ((module as { default: BibleSearchVerseEntry[] }).default ?? []).map((entry) => ({
      ...entry,
      normalizedText: normalizeVerseValue(entry.text)
    }))
  );

  verseIndexCache.set(version, promise);
  return promise;
}

async function loadTopicIndex(version: BundledBibleVersion) {
  const existing = topicIndexCache.get(version);

  if (existing) {
    return existing;
  }

  const promise = topicIndexLoaders[version]().then((module) =>
    ((module as { default: BibleTopicSearchEntry[] }).default ?? []).map((entry, index) => ({
      ...entry,
      order: index,
      normalizedAliases: [entry.label, ...entry.aliases].map((value) => normalizeTopicValue(value))
    }))
  );

  topicIndexCache.set(version, promise);
  return promise;
}

async function loadStrongsVerseIndex() {
  if (!strongsVerseIndexPromise) {
    strongsVerseIndexPromise = import("@/data/bible/search/strongs-kjv.json").then(
      (module) => ((module as { default: BibleSearchStrongsVerseEntry[] }).default ?? [])
    );
  }

  return strongsVerseIndexPromise;
}

function getBookScore(book: SearchableBook, query: string) {
  if (!query) {
    return null;
  }

  const candidates = [book.normalizedName, book.normalizedAbbreviation, book.normalizedSlug];

  if (candidates.some((candidate) => candidate === query)) {
    return 0;
  }

  if (candidates.some((candidate) => candidate.startsWith(query))) {
    return 1;
  }

  if (candidates.some((candidate) => candidate.includes(query))) {
    return 2;
  }

  return null;
}

function getTopicScore(topic: SearchableTopicEntry, normalizedFilter: string) {
  if (!normalizedFilter) {
    return 0;
  }

  if (topic.normalizedAliases.some((alias) => alias === normalizedFilter)) {
    return 0;
  }

  if (topic.normalizedAliases.some((alias) => alias.startsWith(normalizedFilter))) {
    return 1;
  }

  if (topic.normalizedAliases.some((alias) => alias.includes(normalizedFilter))) {
    return 2;
  }

  return null;
}

export function parseBibleSearchQueries(rawQuery: string) {
  return rawQuery
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, MAX_MULTI_QUERY_PARTS);
}

function dedupeSearchResults(results: BibleSearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const dedupeKey = "href" in result ? result.href : result.id;

    if (seen.has(dedupeKey)) {
      return false;
    }

    seen.add(dedupeKey);
    return true;
  });
}

function matchesVerseText(
  normalizedVerseText: string,
  normalizedQuery: string,
  matchMode: SearchMatchMode
) {
  if (matchMode === "partial") {
    return normalizedVerseText.includes(normalizedQuery);
  }

  return ` ${normalizedVerseText} `.includes(` ${normalizedQuery} `);
}

function getVerseResultId(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  version: BundledBibleVersion
) {
  return `verse:${bookSlug}:${chapterNumber}:${verseNumber}:${version}`;
}

function getVerseResult(
  entry: BibleSearchVerseEntry,
  version: BundledBibleVersion,
  description: string
): BibleSearchVerseResult {
  return {
    type: "verse",
    id: getVerseResultId(entry.bookSlug, entry.chapterNumber, entry.verseNumber, version),
    bookSlug: entry.bookSlug,
    chapterNumber: entry.chapterNumber,
    verseNumber: entry.verseNumber,
    label: `${entry.bookName} ${entry.chapterNumber}:${entry.verseNumber}`,
    description,
    href: getBookHighlightedVerseHref(
      entry.bookSlug,
      entry.chapterNumber,
      entry.verseNumber,
      version
    ),
    preview: entry.text,
    tokens: entry.tokens
  };
}

function getScopedTopicResult(
  topic: SearchableTopicEntry,
  version: BundledBibleVersion,
  scope: SearchScope,
  booksBySlug: Map<string, SearchableBook>
): BibleSearchTopicResult | null {
  const subtopics = topic.subtopics
    .map((subtopic) => ({
      id: `${topic.id}:${subtopic.id}:${version}`,
      label: subtopic.label,
      verses: subtopic.verses
        .filter((entry) => {
          const book = booksBySlug.get(entry.bookSlug);

          return book ? matchesSearchScopeBook(book, scope) : false;
        })
        .map((entry) => getVerseResult(entry, version, `${topic.label} • ${subtopic.label}`))
    }))
    .filter((subtopic) => subtopic.verses.length > 0);

  if (subtopics.length === 0) {
    return null;
  }

  const verseCount = subtopics.reduce((count, subtopic) => count + subtopic.verses.length, 0);

  return {
    type: "topic",
    id: `topic:${topic.id}:${version}`,
    topicId: topic.id,
    label: topic.label,
    description: `${subtopics.length} subtopic${subtopics.length === 1 ? "" : "s"} • ${verseCount} verse${verseCount === 1 ? "" : "s"}`,
    subtopics
  };
}

function getVerseTokenByReference(
  verseIndex: SearchableVerseEntry[],
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number
) {
  return verseIndex.find(
    (entry) =>
      entry.bookSlug === bookSlug &&
      entry.chapterNumber === chapterNumber &&
      entry.verseNumber === verseNumber
  )?.tokens;
}

async function searchSingleBibleQuery(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION,
  matchMode: SearchMatchMode = "partial",
  expandedTopicId?: string | null,
  scope: SearchScope = "all"
): Promise<BibleSearchResult[]> {
  const query = normalizeValue(rawQuery);
  const normalizedBookQuery = normalizeBookValue(query);
  const normalizedVerseQuery = normalizeVerseValue(query);
  const strongsNumber = parseStrongsQuery(query);
  const topicQuery = parseTopicQuery(rawQuery);

  if (!query) {
    return [];
  }

  const books = await loadBooks();
  const booksBySlug = new Map(books.map((book) => [book.slug, book] as const));

  if (topicQuery) {
    const topics = await loadTopicIndex(version);

    if (expandedTopicId) {
      const expandedTopic = topics.find((topic) => topic.id === expandedTopicId) ?? null;

      if (expandedTopic) {
        const scopedTopicResult = getScopedTopicResult(expandedTopic, version, scope, booksBySlug);

        return scopedTopicResult ? [scopedTopicResult] : [];
      }
    }

    const topicSuggestions = topics
      .map((topic) => {
        const scopedTopicResult = getScopedTopicResult(topic, version, scope, booksBySlug);

        return {
          topic,
          score: getTopicScore(topic, topicQuery.normalizedFilter),
          scopedTopicResult
        };
      })
      .filter(
        (
          entry
        ): entry is {
          topic: SearchableTopicEntry;
          score: number;
          scopedTopicResult: BibleSearchTopicResult;
        } =>
          topicQuery.normalizedFilter
            ? entry.score !== null && entry.scopedTopicResult !== null
            : entry.scopedTopicResult !== null
      )
      .sort((left, right) =>
        left.score === right.score
          ? left.topic.order - right.topic.order
          : left.score - right.score
      )
      .slice(0, MAX_TOPIC_SUGGESTIONS)
      .map<BibleSearchResult>(({ topic, scopedTopicResult }) => {
        const verseCount = scopedTopicResult.subtopics.reduce(
          (count, subtopic) => count + subtopic.verses.length,
          0
        );

        return {
          ...getTopicSuggestionResult(topic, version),
          description: `${scopedTopicResult.subtopics.length} subtopic${
            scopedTopicResult.subtopics.length === 1 ? "" : "s"
          } • ${verseCount} verse${verseCount === 1 ? "" : "s"}`
        };
      });

    return topicSuggestions;
  }
  const parsedReference = parseReferenceQuery(query, books);

  let directReferenceResults: BibleSearchResult[] = [];

  if (parsedReference) {
    if (!matchesSearchScopeBook(parsedReference.book, scope)) {
      directReferenceResults = [];
    } else if (parsedReference.verseNumber === null) {
      directReferenceResults = [
        {
          type: "chapter",
          id: `chapter:${parsedReference.book.slug}:${parsedReference.chapterNumber}:${version}`,
          bookSlug: parsedReference.book.slug,
          chapterNumber: parsedReference.chapterNumber,
          label: `${parsedReference.book.name} ${parsedReference.chapterNumber}`,
          description: "Chapter reference",
          href: getBookChapterHref(parsedReference.book.slug, parsedReference.chapterNumber, version)
        }
      ];
    } else if (parsedReference.endVerseNumber !== null) {
      const startVerseNumber = parsedReference.verseNumber;
      const endVerseNumber = parsedReference.endVerseNumber;

      if (startVerseNumber !== null) {
        const verseIndex = await loadVerseIndex(version);
        const rangeEntries = verseIndex.filter(
          (entry) =>
            entry.bookSlug === parsedReference.book.slug &&
            entry.chapterNumber === parsedReference.chapterNumber &&
            entry.verseNumber >= startVerseNumber &&
            entry.verseNumber <= endVerseNumber
        );

        const hasFullRange =
          rangeEntries.length === endVerseNumber - startVerseNumber + 1 &&
          rangeEntries[0]?.verseNumber === startVerseNumber &&
          rangeEntries.at(-1)?.verseNumber === endVerseNumber;

        if (hasFullRange) {
          directReferenceResults = [
            {
              type: "range",
              id: `range:${parsedReference.book.slug}:${parsedReference.chapterNumber}:${startVerseNumber}-${endVerseNumber}:${version}`,
              bookSlug: parsedReference.book.slug,
              chapterNumber: parsedReference.chapterNumber,
              startVerseNumber,
              endVerseNumber,
              label: `${parsedReference.book.name} ${parsedReference.chapterNumber}:${startVerseNumber}-${endVerseNumber}`,
              description: `${version.toUpperCase()} reference range`,
              verses: rangeEntries.map((entry) => ({
                id: `range-verse:${entry.bookSlug}:${entry.chapterNumber}:${entry.verseNumber}:${version}`,
                verseNumber: entry.verseNumber,
                label: `${entry.bookName} ${entry.chapterNumber}:${entry.verseNumber}`,
                href: getBookHighlightedVerseHref(
                  entry.bookSlug,
                  entry.chapterNumber,
                  entry.verseNumber,
                  version
                ),
                preview: entry.text,
                tokens: entry.tokens
              }))
            }
          ];
        }
      }
    } else {
      const verseIndex = await loadVerseIndex(version);
      const verseEntry = verseIndex.find(
        (entry) =>
          entry.bookSlug === parsedReference.book.slug &&
          entry.chapterNumber === parsedReference.chapterNumber &&
          entry.verseNumber === parsedReference.verseNumber
      );

      if (verseEntry) {
        directReferenceResults = [getVerseResult(verseEntry, version, `${version.toUpperCase()} reference`)];
      }
    }
  }

  const bookResults = books
    .filter((book) => matchesSearchScopeBook(book, scope))
    .map((book) => ({
      book,
      score: getBookScore(book, normalizedBookQuery)
    }))
    .filter((entry): entry is { book: SearchableBook; score: number } => entry.score !== null)
    .sort((left, right) =>
      left.score === right.score
        ? left.book.order - right.book.order
        : left.score - right.score
    )
    .slice(0, MAX_BOOK_RESULTS)
    .map<BibleSearchResult>((entry) => ({
      type: "book",
      id: `book:${entry.book.slug}`,
      bookSlug: entry.book.slug,
      label: entry.book.name,
      description: `${entry.book.chapterCount} chapters`,
      href: getBookHref(entry.book.slug, version)
    }));

  if (strongsNumber) {
    const [entry, strongsVerseIndex, kjvVerseIndex] = await Promise.all([
      getStrongsEntry(strongsNumber),
      loadStrongsVerseIndex(),
      loadVerseIndex("kjv")
    ]);
    const strongsVerseResults = strongsVerseIndex
      .filter((verseEntry) => {
        const book = booksBySlug.get(verseEntry.bookSlug);

        return (
          verseEntry.strongsNumber === strongsNumber &&
          (book ? matchesSearchScopeBook(book, scope) : false)
        );
      })
      .slice(0, MAX_VERSE_RESULTS)
      .map<BibleSearchResult>((verseEntry) => ({
        type: "verse",
        id: `strongs-verse:${verseEntry.strongsNumber}:${verseEntry.bookSlug}:${verseEntry.chapterNumber}:${verseEntry.verseNumber}`,
        bookSlug: verseEntry.bookSlug,
        chapterNumber: verseEntry.chapterNumber,
        verseNumber: verseEntry.verseNumber,
        label: `${verseEntry.bookName} ${verseEntry.chapterNumber}:${verseEntry.verseNumber}`,
        description: `KJV Strongs ${verseEntry.strongsNumber}`,
        href: getBookHighlightedVerseHref(
          verseEntry.bookSlug,
          verseEntry.chapterNumber,
          verseEntry.verseNumber,
          "kjv"
        ),
        preview: verseEntry.text,
        tokens: getVerseTokenByReference(
          kjvVerseIndex,
          verseEntry.bookSlug,
          verseEntry.chapterNumber,
          verseEntry.verseNumber
        )
      }));
    const strongsResults: BibleSearchResult[] = entry
      ? [
          {
            type: "strongs",
            id: `strongs:${entry.id}`,
            strongsNumber: entry.id,
            label: entry.id,
            description: `${entry.language === "hebrew" ? "Hebrew" : "Greek"} Strongs`,
            preview: getStrongsPreview(entry.id, strongsVerseResults.length, entry)
          }
        ]
      : [];

    return dedupeSearchResults([...strongsResults, ...strongsVerseResults, ...bookResults]);
  }

  if (normalizedVerseQuery.length < MIN_VERSE_QUERY_LENGTH) {
    return [...directReferenceResults, ...bookResults];
  }

  const verseIndex = await loadVerseIndex(version);
  const verseResults = verseIndex
    .filter((entry) => {
      const book = booksBySlug.get(entry.bookSlug);

      return (
        matchesVerseText(entry.normalizedText, normalizedVerseQuery, matchMode) &&
        (book ? matchesSearchScopeBook(book, scope) : false)
      );
    })
    .slice(0, MAX_VERSE_RESULTS)
    .map<BibleSearchResult>((entry) => getVerseResult(entry, version, version.toUpperCase()));

  return dedupeSearchResults([...directReferenceResults, ...bookResults, ...verseResults]);
}

export async function searchBible(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION,
  matchMode: SearchMatchMode = "partial",
  expandedTopicId?: string | null,
  scope: SearchScope = "all"
): Promise<BibleSearchResult[]> {
  return searchSingleBibleQuery(rawQuery, version, matchMode, expandedTopicId, scope);
}

export async function searchBibleGroups(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION,
  matchMode: SearchMatchMode = "partial",
  expandedTopicsByQuery: Record<string, string> = {},
  scope: SearchScope = "all"
): Promise<BibleSearchResultGroup[]> {
  const queries = parseBibleSearchQueries(rawQuery);

  if (queries.length === 0) {
    return [];
  }

  const groups = await Promise.all(
    queries.map(async (query, index) => ({
      id: `group:${index}:${normalizeValue(query)}`,
      query,
      results: await searchSingleBibleQuery(
        query,
        version,
        matchMode,
        expandedTopicsByQuery[query] ?? null,
        scope
      ),
      emptyMessage: "No matches found in the active translation."
    }))
  );

  return groups;
}
