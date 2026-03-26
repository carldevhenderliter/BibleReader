import { notFound } from "next/navigation";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import { getBookBySlug, getBookPayload, getBooks } from "@/lib/bible/data";

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

  const [books, book, webPayload, kjvPayload] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web"),
    getBookPayload(bookSlug, "web"),
    getBookPayload(bookSlug, "kjv")
  ]);

  if (!book || !webPayload || !kjvPayload) {
    notFound();
  }

  return (
    <WholeBookContent
      book={book}
      books={books}
      chaptersByVersion={{
        web: webPayload.chapters,
        kjv: kjvPayload.chapters
      }}
    />
  );
}
