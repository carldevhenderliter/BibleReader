import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type {
  BibleSearchResult,
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

const MIN_VERSE_QUERY_LENGTH = 2;
const MAX_BOOK_RESULTS = 6;
const MAX_VERSE_RESULTS = 24;

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

export async function searchBible(
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
    return bookResults;
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

  return [...bookResults, ...verseResults];
}
