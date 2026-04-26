import { notFound } from "next/navigation";

import { HarmonyBookReaderContent } from "@/app/components/HarmonyBookReaderContent";
import { WholeBookContent } from "@/app/components/WholeBookContent";
import { getBookBySlug, getBookPayload, getBooks } from "@/lib/bible/data";
import { getEsvInterlinearBook } from "@/lib/bible/esv-interlinear";
import { isGospelHarmonyBookSlug } from "@/lib/gospel-harmony";
import { getMasoreticBookPayload } from "@/lib/bible/masoretic";
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

  if (isGospelHarmonyBookSlug(bookSlug)) {
    const [books, book] = await Promise.all([getBooks("web"), getBookBySlug(bookSlug, "web")]);

    if (!book) {
      notFound();
    }

    return <HarmonyBookReaderContent book={book} books={books} view="book" />;
  }

  const installedBundledVersions = getInstalledBundledBibleVersions();
  const [books, book, esvInterlinearBook, masoreticBookPayload, ...payloads] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getEsvInterlinearBook(bookSlug),
    getMasoreticBookPayload(bookSlug),
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
      masoreticBookChapters={masoreticBookPayload?.chapters ?? null}
    />
  );
}
