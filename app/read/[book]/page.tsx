import { notFound, redirect } from "next/navigation";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import { isEsvEnabled } from "@/lib/bible/esv";
import { getBookBySlug, getBookPayload, getBooks } from "@/lib/bible/data";
import { getChapterHref } from "@/lib/bible/utils";
import { resolveBibleVersion } from "@/lib/bible/version";

type BookPageProps = {
  params: Promise<{
    book: string;
  }>;
  searchParams?: Promise<{
    view?: string | string[];
    version?: string | string[];
  }>;
};

type ResolvedBookSearchParams = {
  view?: string | string[];
  version?: string | string[];
};

export const dynamicParams = false;

export async function generateStaticParams() {
  const books = await getBooks();

  return books.map((book) => ({ book: book.slug }));
}

export default async function BookPage({ params, searchParams }: BookPageProps) {
  const esvEnabled = isEsvEnabled();
  const [{ book: bookSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<ResolvedBookSearchParams>({})
  ]);
  const view = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;
  const rawVersion = Array.isArray(resolvedSearchParams.version)
    ? resolvedSearchParams.version[0]
    : resolvedSearchParams.version;
  const version = resolveBibleVersion(rawVersion, { esvEnabled });

  if (!version) {
    notFound();
  }

  if (view !== "book" || version === "esv") {
    redirect(getChapterHref(bookSlug, 1, version));
  }

  const [books, book, payload] = await Promise.all([
    getBooks(version),
    getBookBySlug(bookSlug, version),
    getBookPayload(bookSlug, version)
  ]);

  if (!book || !payload) {
    notFound();
  }

  return (
    <WholeBookContent
      book={book}
      books={books}
      chapters={payload.chapters}
      esvEnabled={esvEnabled}
      version={version}
    />
  );
}
