import { notFound } from "next/navigation";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { isEsvEnabled } from "@/lib/bible/esv";
import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";
import { isValidChapter, parseChapterParam } from "@/lib/bible/utils";
import { resolveBibleVersion } from "@/lib/bible/version";

type ReaderChapterPageProps = {
  params: Promise<{
    book: string;
    chapter: string;
  }>;
  searchParams?: Promise<{
    version?: string | string[];
  }>;
};

type ResolvedChapterSearchParams = {
  version?: string | string[];
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

export default async function ReaderChapterPage({
  params,
  searchParams
}: ReaderChapterPageProps) {
  const esvEnabled = isEsvEnabled();
  const [{ book: bookSlug, chapter: chapterParam }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<ResolvedChapterSearchParams>({})
  ]);
  const chapterNumber = parseChapterParam(chapterParam);
  const rawVersion = Array.isArray(resolvedSearchParams.version)
    ? resolvedSearchParams.version[0]
    : resolvedSearchParams.version;
  const version = resolveBibleVersion(rawVersion, { esvEnabled });

  if (!chapterNumber || !version) {
    notFound();
  }

  const [books, book, chapter] = await Promise.all([
    getBooks(version),
    getBookBySlug(bookSlug, version),
    getChapter(bookSlug, chapterNumber, version)
  ]);

  if (!book || !isValidChapter(book, chapterNumber) || !chapter) {
    notFound();
  }

  return (
    <ReaderPageContent
      book={book}
      books={books}
      chapter={chapter}
      esvEnabled={esvEnabled}
      version={version}
    />
  );
}
