import { notFound } from "next/navigation";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";
import { isValidChapter, parseChapterParam } from "@/lib/bible/utils";

type ReaderChapterPageProps = {
  params: Promise<{
    book: string;
    chapter: string;
  }>;
};

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

export default async function ReaderChapterPage({ params }: ReaderChapterPageProps) {
  const { book: bookSlug, chapter: chapterParam } = await params;
  const chapterNumber = parseChapterParam(chapterParam);

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
    />
  );
}
