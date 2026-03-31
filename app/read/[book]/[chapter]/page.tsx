import { notFound } from "next/navigation";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";
import { isValidChapter, parseChapterParam } from "@/lib/bible/utils";

type ReaderChapterPageProps = {
  params: Promise<{
    book: string;
    chapter: string;
  }>;
  searchParams?: Promise<{
    highlight?: string | string[];
    highlightStart?: string | string[];
    highlightEnd?: string | string[];
  }>;
};

function parsePositiveNumber(value: string | string[] | undefined) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (!normalizedValue || !/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  return numericValue > 0 ? numericValue : null;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  const books = await getBooks();

  return books.flatMap((book) =>
    Array.from({ length: book.chapterCount }, (_, index) => ({
      book: book.slug,
      chapter: String(index + 1)
    }))
  );
}

export default async function ReaderChapterPage({ params, searchParams }: ReaderChapterPageProps) {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const chapterNumber = parseChapterParam(chapterParam);
  const highlightedVerseNumber = parsePositiveNumber(resolvedSearchParams.highlight);
  const highlightedRangeStart = parsePositiveNumber(resolvedSearchParams.highlightStart);
  const highlightedRangeEnd = parsePositiveNumber(resolvedSearchParams.highlightEnd);
  const highlightedVerseRange =
    highlightedRangeStart !== null &&
    highlightedRangeEnd !== null &&
    highlightedRangeEnd >= highlightedRangeStart
      ? {
          start: highlightedRangeStart,
          end: highlightedRangeEnd
        }
      : null;

  if (!chapterNumber) {
    notFound();
  }

  const [books, book, webChapter, kjvChapter] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getChapter(bookSlug, chapterNumber, "web"),
    getChapter(bookSlug, chapterNumber, "kjv")
  ]);

  if (!book || !isValidChapter(book, chapterNumber) || !webChapter || !kjvChapter) {
    notFound();
  }

  return (
    <ReaderPageContent
      book={book}
      books={books}
      chaptersByVersion={{
        web: webChapter,
        kjv: kjvChapter
      }}
      highlightedVerseNumber={highlightedVerseRange ? null : highlightedVerseNumber}
      highlightedVerseRange={highlightedVerseRange}
    />
  );
}
