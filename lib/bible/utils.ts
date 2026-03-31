import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type {
  BibleVersion,
  BookMeta,
  ChapterLink,
  ReadingLocation,
  ReadingView
} from "@/lib/bible/types";

export function parseChapterParam(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const chapterNumber = Number(value);

  return chapterNumber > 0 ? chapterNumber : null;
}

function getVersionQueryParam(version: BibleVersion): string {
  return version === DEFAULT_BIBLE_VERSION ? "" : `?version=${version}`;
}

function appendQueryParams(
  href: string,
  params: Record<string, string | number | null | undefined>
): string {
  const [pathname, searchValue] = href.split("?");
  const searchParams = new URLSearchParams(searchValue ?? "");

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      searchParams.delete(key);
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export function getChapterHref(
  bookSlug: string,
  chapterNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return `/read/${bookSlug}/${chapterNumber}${getVersionQueryParam(version)}`;
}

export function getBookHref(
  bookSlug: string,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return `/read/${bookSlug}${getVersionQueryParam(version)}`;
}

export function getBookChapterHref(
  bookSlug: string,
  chapterNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return appendQueryParams(getBookHref(bookSlug, version), {
    chapter: chapterNumber,
    highlightChapter: null,
    highlight: null,
    highlightStart: null,
    highlightEnd: null
  });
}

export function getBookHighlightedVerseHref(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return appendQueryParams(getBookHref(bookSlug, version), {
    chapter: null,
    highlightChapter: chapterNumber,
    highlight: verseNumber,
    highlightStart: null,
    highlightEnd: null
  });
}

export function getBookHighlightedVerseRangeHref(
  bookSlug: string,
  chapterNumber: number,
  startVerseNumber: number,
  endVerseNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return appendQueryParams(getBookHref(bookSlug, version), {
    chapter: null,
    highlightChapter: chapterNumber,
    highlight: null,
    highlightStart: startVerseNumber,
    highlightEnd: endVerseNumber
  });
}

export function getReadingHref(location: ReadingLocation): string {
  return location.view === "book"
    ? getBookHref(location.book, location.version)
    : getChapterHref(location.book, location.chapter, location.version);
}

export function getChapterLinks(
  books: BookMeta[],
  book: BookMeta,
  chapterNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): { previous: ChapterLink | null; next: ChapterLink | null } {
  const currentBookIndex = books.findIndex(({ slug }) => slug === book.slug);

  if (currentBookIndex === -1) {
    return { previous: null, next: null };
  }

  if (chapterNumber > 1) {
    return {
      previous: {
        href: getChapterHref(book.slug, chapterNumber - 1, version),
        label: `${book.name} ${chapterNumber - 1}`
      },
      next:
        chapterNumber < book.chapterCount
          ? {
              href: getChapterHref(book.slug, chapterNumber + 1, version),
              label: `${book.name} ${chapterNumber + 1}`
            }
          : currentBookIndex < books.length - 1
            ? {
                href: getChapterHref(books[currentBookIndex + 1].slug, 1, version),
                label: `${books[currentBookIndex + 1].name} 1`
              }
            : null
    };
  }

  const previousBook = books[currentBookIndex - 1] ?? null;
  const nextBook = books[currentBookIndex + 1] ?? null;

  return {
    previous: previousBook
      ? {
          href: getChapterHref(previousBook.slug, previousBook.chapterCount, version),
          label: `${previousBook.name} ${previousBook.chapterCount}`
        }
      : null,
    next:
      chapterNumber < book.chapterCount
        ? {
            href: getChapterHref(book.slug, chapterNumber + 1, version),
            label: `${book.name} ${chapterNumber + 1}`
          }
        : nextBook
          ? {
              href: getChapterHref(nextBook.slug, 1, version),
              label: `${nextBook.name} 1`
            }
          : null
  };
}

export function isValidChapter(book: BookMeta, chapterNumber: number): boolean {
  return chapterNumber >= 1 && chapterNumber <= book.chapterCount;
}

export function getViewToggleHref(
  bookSlug: string,
  chapterNumber: number,
  currentView: ReadingView,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): string {
  return currentView === "book"
    ? getChapterHref(bookSlug, chapterNumber, version)
    : getBookHref(bookSlug, version);
}
