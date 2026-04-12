"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBookChapterHref, getBookHref, getChapterHref } from "@/lib/bible/utils";
import { BIBLE_VERSION_METADATA } from "@/lib/bible/version";

type ReaderControlsProps = {
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
  view: ReadingView;
};

export function ReaderControls({
  books,
  book,
  currentChapter,
  leadingActions,
  trailingActions,
  view
}: ReaderControlsProps) {
  const router = useRouter();
  const { isPanelOpen, setIsPanelOpen } = useReaderCustomization();
  const { version } = useReaderVersion();
  const versionMeta = BIBLE_VERSION_METADATA[version];

  const handleBookChange = (nextBookSlug: string) => {
    const nextBook = books.find(({ slug }) => slug === nextBookSlug);

    if (!nextBook) {
      return;
    }

    if (view === "book" && versionMeta.supportsWholeBook) {
      router.push(getBookHref(nextBook.slug, version));
      return;
    }

    router.push(getChapterHref(nextBook.slug, Math.min(currentChapter, nextBook.chapterCount), version));
  };

  const handleChapterChange = (nextChapter: number) => {
    if (view === "book" && versionMeta.supportsWholeBook) {
      router.push(getBookChapterHref(book.slug, nextChapter, version));
      return;
    }

    router.push(getChapterHref(book.slug, nextChapter, version));
  };

  return (
    <section className="reader-controls" aria-label="Passage controls">
      <div className="reader-controls-bar">
        <div className="reader-controls-primary">
          <div className="control-group control-group-compact">
            <label className="sr-only" htmlFor="book-select">
              Book
            </label>
            <select
              aria-label="Book"
              id="book-select"
              value={book.slug}
              onChange={(event) => handleBookChange(event.target.value)}
            >
              {books.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group control-group-compact">
            <label className="sr-only" htmlFor="chapter-select">
              Chapter
            </label>
            <select
              aria-label="Chapter"
              id="chapter-select"
              value={String(currentChapter)}
              onChange={(event) => handleChapterChange(Number(event.target.value))}
            >
              {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((chapter) => (
                <option key={chapter} value={chapter}>
                  Chapter {chapter}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="reader-controls-actions">
          {leadingActions}
          <button
            aria-controls="reader-settings-panel"
            aria-expanded={isPanelOpen}
            className="reader-inline-button reader-menu-button"
            onClick={() => setIsPanelOpen((current) => !current)}
            type="button"
          >
            Menu
          </button>
          {trailingActions}
        </div>
      </div>
    </section>
  );
}
