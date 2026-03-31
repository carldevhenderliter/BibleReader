import { notFound } from "next/navigation";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import { getBookBySlug, getBookPayload, getBooks } from "@/lib/bible/data";

type BookPageProps = {
  params: Promise<{
    book: string;
  }>;
  searchParams?: Promise<{
    chapter?: string | string[];
    highlightChapter?: string | string[];
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

  return books.map((book) => ({ book: book.slug }));
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const { book: bookSlug } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const chapterParam = parsePositiveNumber(resolvedSearchParams.chapter);
  const highlightChapterParam = parsePositiveNumber(resolvedSearchParams.highlightChapter);
  const highlightParam = parsePositiveNumber(resolvedSearchParams.highlight);
  const highlightStartParam = parsePositiveNumber(resolvedSearchParams.highlightStart);
  const highlightEndParam = parsePositiveNumber(resolvedSearchParams.highlightEnd);

  const [books, book, webPayload, kjvPayload] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getBookPayload(bookSlug, "web"),
    getBookPayload(bookSlug, "kjv")
  ]);

  if (!book || !webPayload || !kjvPayload) {
    notFound();
  }

  const highlightedVerseRange =
    highlightStartParam !== null &&
    highlightEndParam !== null &&
    highlightEndParam >= highlightStartParam
      ? {
          start: highlightStartParam,
          end: highlightEndParam
        }
      : null;
  const highlightedChapterNumber =
    highlightChapterParam && highlightChapterParam <= book.chapterCount ? highlightChapterParam : null;
  const focusedChapterNumber =
    highlightedChapterNumber ?? (chapterParam && chapterParam <= book.chapterCount ? chapterParam : 1);

  return (
    <WholeBookContent
      book={book}
      books={books}
      chaptersByVersion={{
        web: webPayload.chapters,
        kjv: kjvPayload.chapters
      }}
      focusedChapterNumber={focusedChapterNumber}
      highlightedChapterNumber={highlightedChapterNumber}
      highlightedVerseNumber={highlightedVerseRange ? null : highlightParam}
      highlightedVerseRange={highlightedVerseRange}
    />
  );
}
