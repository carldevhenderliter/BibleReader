import { notFound } from "next/navigation";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import { getBookBySlug, getBookPayload, getBooks } from "@/lib/bible/data";
import { getEsvInterlinearBook } from "@/lib/bible/esv-interlinear";
import { getInstalledBundledBibleVersions } from "@/lib/bible/version";

type BookPageProps = {
  params: Promise<{
    book: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const books = await getBooks();

  return books.map((book) => ({ book: book.slug }));
}

export default async function BookPage({ params }: BookPageProps) {
  const { book: bookSlug } = await params;

  const installedBundledVersions = getInstalledBundledBibleVersions();
  const [books, book, esvInterlinearBook, ...payloads] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getEsvInterlinearBook(bookSlug),
    ...installedBundledVersions.map((version) => getBookPayload(bookSlug, version))
  ]);
  const chaptersByVersion = Object.fromEntries(
    installedBundledVersions.map((version, index) => [version, payloads[index]?.chapters ?? null])
  );

  if (!book || installedBundledVersions.some((version) => !chaptersByVersion[version])) {
    notFound();
  }

  return (
    <WholeBookContent
      book={book}
      books={books}
      chaptersByVersion={chaptersByVersion}
      esvInterlinearBook={esvInterlinearBook}
    />
  );
}
