import { notFound } from "next/navigation";

import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import {
  getPrototypeReaderStaticParams,
  loadPrototypeReaderPage
} from "@/app/prototype/reader/prototype-reader-data";
import { parseChapterParam } from "@/lib/bible/utils";

type ReaderPrototypeChapterPageProps = {
  params: Promise<{
    book: string;
    chapter: string;
  }>;
};

export const dynamicParams = false;

export async function generateStaticParams() {
  return getPrototypeReaderStaticParams();
}

export default async function ReaderPrototypeChapterPage({
  params
}: ReaderPrototypeChapterPageProps) {
  const { book, chapter } = await params;
  const chapterNumber = parseChapterParam(chapter);

  if (!chapterNumber) {
    notFound();
  }

  const pageData = await loadPrototypeReaderPage(book, chapterNumber);

  if (!pageData) {
    notFound();
  }

  return <ReaderPrototypePageContent {...pageData} />;
}
