import { notFound } from "next/navigation";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";
import { getEsvInterlinearChapter } from "@/lib/bible/esv-interlinear";
import { isValidChapter, parseChapterParam } from "@/lib/bible/utils";
import { getInstalledBundledBibleVersions } from "@/lib/bible/version";

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

  const installedBundledVersions = getInstalledBundledBibleVersions();
  const [books, book, esvInterlinearChapter, ...chapters] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getEsvInterlinearChapter(bookSlug, chapterNumber),
    ...installedBundledVersions.map((version) => getChapter(bookSlug, chapterNumber, version))
  ]);
  const chaptersByVersion = Object.fromEntries(
    installedBundledVersions.map((version, index) => [version, chapters[index] ?? null])
  );

  if (
    !book ||
    !isValidChapter(book, chapterNumber) ||
    installedBundledVersions.some((version) => !chaptersByVersion[version])
  ) {
    notFound();
  }

  return (
    <ReaderPageContent
      book={book}
      books={books}
      chaptersByVersion={chaptersByVersion}
      esvInterlinearChapter={esvInterlinearChapter}
    />
  );
}
