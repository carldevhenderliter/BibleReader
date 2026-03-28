import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type {
  BibleSearchResult,
  BibleSearchResultGroup,
  BibleSearchVerseEntry,
  BookMeta,
  BundledBibleVersion
} from "@/lib/bible/types";
import { getChapterHref } from "@/lib/bible/utils";

type SearchableBook = BookMeta & {
  normalizedAbbreviation: string;
  normalizedName: string;
  normalizedSlug: string;
};

type SearchableVerseEntry = BibleSearchVerseEntry & {
  normalizedText: string;
};

type ParsedReference = {
  book: SearchableBook;
  chapterNumber: number;
  verseNumber: number | null;
  endVerseNumber: number | null;
};

const MIN_VERSE_QUERY_LENGTH = 2;
const MAX_BOOK_RESULTS = 6;
const MAX_VERSE_RESULTS = 24;
const MAX_MULTI_QUERY_PARTS = 5;

const verseIndexLoaders: Record<BundledBibleVersion, () => Promise<unknown>> = {
  web: () => import("@/data/bible/search/web.json"),
  kjv: () => import("@/data/bible/search/kjv.json")
};

let booksPromise: Promise<SearchableBook[]> | null = null;
const verseIndexCache = new Map<BundledBibleVersion, Promise<SearchableVerseEntry[]>>();

function normalizeValue(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeBookValue(value: string) {
  return normalizeValue(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function normalizeVerseValue(value: string) {
  return normalizeValue(value)
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHighlightedVerseHref(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  version: BundledBibleVersion
) {
  const href = getChapterHref(bookSlug, chapterNumber, version);
  const [pathname, searchValue] = href.split("?");
  const searchParams = new URLSearchParams(searchValue ?? "");
  searchParams.set("highlight", String(verseNumber));
  const serialized = searchParams.toString();

  return serialized ? `${pathname}?${serialized}` : pathname;
}

function getHighlightedVerseRangeHref(
  bookSlug: string,
  chapterNumber: number,
  startVerseNumber: number,
  endVerseNumber: number,
  version: BundledBibleVersion
) {
  const href = getChapterHref(bookSlug, chapterNumber, version);
  const [pathname, searchValue] = href.split("?");
  const searchParams = new URLSearchParams(searchValue ?? "");
  searchParams.set("highlightStart", String(startVerseNumber));
  searchParams.set("highlightEnd", String(endVerseNumber));
  const serialized = searchParams.toString();

  return serialized ? `${pathname}?${serialized}` : pathname;
}

function getVersePreview(text: string, query: string) {
  const normalizedQuery = normalizeVerseValue(query);
  const normalizedText = normalizeVerseValue(text);
  const matchIndex = normalizedText.indexOf(normalizedQuery);

  if (matchIndex === -1 || text.length <= 160) {
    return text;
  }

  const start = Math.max(0, matchIndex - 48);
  const end = Math.min(text.length, start + 160);
  const snippet = text.slice(start, end).trim();

  return `${start > 0 ? "…" : ""}${snippet}${end < text.length ? "…" : ""}`;
}

function getRangePreview(texts: string[]) {
  const combined = texts.join(" ").trim();

  if (combined.length <= 220) {
    return combined;
  }

  return `${combined.slice(0, 220).trim()}…`;
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
    if (seen.has(result.href)) {
      return false;
    }

    seen.add(result.href);
    return true;
  });
}

async function searchSingleBibleQuery(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION
): Promise<BibleSearchResult[]> {
  const query = normalizeValue(rawQuery);
  const normalizedBookQuery = normalizeBookValue(query);
  const normalizedVerseQuery = normalizeVerseValue(query);

  if (!query) {
    return [];
  }

  const books = await loadBooks();
  const parsedReference = parseReferenceQuery(query, books);

  let directReferenceResults: BibleSearchResult[] = [];

  if (parsedReference) {
    if (parsedReference.verseNumber === null) {
      directReferenceResults = [
        {
          type: "chapter",
          id: `chapter:${parsedReference.book.slug}:${parsedReference.chapterNumber}:${version}`,
          bookSlug: parsedReference.book.slug,
          chapterNumber: parsedReference.chapterNumber,
          label: `${parsedReference.book.name} ${parsedReference.chapterNumber}`,
          description: "Chapter reference",
          href: getChapterHref(parsedReference.book.slug, parsedReference.chapterNumber, version)
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
              description: `${version.toUpperCase()} range`,
              href: getHighlightedVerseRangeHref(
                parsedReference.book.slug,
                parsedReference.chapterNumber,
                startVerseNumber,
                endVerseNumber,
                version
              ),
              preview: getRangePreview(rangeEntries.map((entry) => entry.text))
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
        directReferenceResults = [
          {
            type: "verse",
            id: `verse:${verseEntry.bookSlug}:${verseEntry.chapterNumber}:${verseEntry.verseNumber}:${version}`,
            bookSlug: verseEntry.bookSlug,
            chapterNumber: verseEntry.chapterNumber,
            verseNumber: verseEntry.verseNumber,
            label: `${verseEntry.bookName} ${verseEntry.chapterNumber}:${verseEntry.verseNumber}`,
            description: `${version.toUpperCase()} reference`,
            href: getHighlightedVerseHref(
              verseEntry.bookSlug,
              verseEntry.chapterNumber,
              verseEntry.verseNumber,
              version
            ),
            preview: verseEntry.text
          }
        ];
      }
    }
  }

  const bookResults = books
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
      href: getChapterHref(entry.book.slug, 1, version)
    }));

  if (normalizedVerseQuery.length < MIN_VERSE_QUERY_LENGTH) {
    return [...directReferenceResults, ...bookResults];
  }

  const verseIndex = await loadVerseIndex(version);
  const verseResults = verseIndex
    .filter((entry) => entry.normalizedText.includes(normalizedVerseQuery))
    .slice(0, MAX_VERSE_RESULTS)
    .map<BibleSearchResult>((entry) => ({
      type: "verse",
      id: `verse:${entry.bookSlug}:${entry.chapterNumber}:${entry.verseNumber}:${version}`,
      bookSlug: entry.bookSlug,
      chapterNumber: entry.chapterNumber,
      verseNumber: entry.verseNumber,
      label: `${entry.bookName} ${entry.chapterNumber}:${entry.verseNumber}`,
      description: version.toUpperCase(),
      href: getHighlightedVerseHref(
        entry.bookSlug,
        entry.chapterNumber,
        entry.verseNumber,
        version
      ),
      preview: getVersePreview(entry.text, normalizedVerseQuery)
    }));

  return dedupeSearchResults([...directReferenceResults, ...bookResults, ...verseResults]);
}

export async function searchBible(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION
): Promise<BibleSearchResult[]> {
  return searchSingleBibleQuery(rawQuery, version);
}

export async function searchBibleGroups(
  rawQuery: string,
  version: BundledBibleVersion = DEFAULT_BIBLE_VERSION
): Promise<BibleSearchResultGroup[]> {
  const queries = parseBibleSearchQueries(rawQuery);

  if (queries.length === 0) {
    return [];
  }

  const groups = await Promise.all(
    queries.map(async (query, index) => ({
      id: `group:${index}:${normalizeValue(query)}`,
      query,
      results: await searchSingleBibleQuery(query, version),
      emptyMessage: "No matches found in the active translation."
    }))
  );

  return groups;
}
