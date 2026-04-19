"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBookChapterHref, getBookHref, getChapterHref } from "@/lib/bible/utils";
import { BIBLE_VERSION_METADATA } from "@/lib/bible/version";

type ReaderControlOption = {
  value: string;
  label: string;
};

type BibleReaderControlsProps = {
  mode?: "bible";
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
  view: ReadingView;
};

type FathersReaderControlsProps = {
  mode: "fathers";
  works: Array<{
    slug: string;
    title: string;
  }>;
  currentWorkSlug: string;
  sections: ReaderControlOption[];
  currentSectionId: string;
  libraryHref?: string;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
  onSectionChange: (sectionId: string) => void;
};

type ReaderControlsProps = BibleReaderControlsProps | FathersReaderControlsProps;

export function ReaderControls({
  mode = "bible",
  leadingActions,
  trailingActions,
  ...props
}: ReaderControlsProps) {
  const router = useRouter();
  const { isPanelOpen, setIsPanelOpen } = useReaderCustomization();
  const { version } = useReaderVersion();
  const versionMeta = BIBLE_VERSION_METADATA[version] ?? null;
  const isBibleMode = mode !== "fathers";

  const handleBookChange = (nextBookSlug: string) => {
    if (!isBibleMode) {
      return;
    }

    const { books, currentChapter, view } = props as BibleReaderControlsProps;
    const nextBook = books.find(({ slug }) => slug === nextBookSlug);

    if (!nextBook || !versionMeta) {
      return;
    }

    if (view === "book" && versionMeta.supportsWholeBook) {
      router.push(getBookHref(nextBook.slug, version));
      return;
    }

    router.push(
      getChapterHref(nextBook.slug, Math.min(currentChapter, nextBook.chapterCount), version)
    );
  };

  const handleChapterChange = (nextChapter: number) => {
    if (!isBibleMode || !versionMeta) {
      return;
    }

    const { book, view } = props as BibleReaderControlsProps;

    if (view === "book" && versionMeta.supportsWholeBook) {
      router.push(getBookChapterHref(book.slug, nextChapter, version));
      return;
    }

    router.push(getChapterHref(book.slug, nextChapter, version));
  };

  const handleWorkChange = (nextWorkSlug: string) => {
    if (isBibleMode) {
      return;
    }

    router.push(`/fathers/${nextWorkSlug}`);
  };

  return (
    <section
      className="reader-controls"
      aria-label={isBibleMode ? "Passage controls" : "Fathers reader controls"}
    >
      <div className="reader-controls-bar">
        <div className="reader-controls-primary">
          {isBibleMode ? (
            <>
              <div className="control-group control-group-compact">
                <label className="sr-only" htmlFor="book-select">
                  Book
                </label>
                <select
                  aria-label="Book"
                  id="book-select"
                  value={(props as BibleReaderControlsProps).book.slug}
                  onChange={(event) => handleBookChange(event.target.value)}
                >
                  {(props as BibleReaderControlsProps).books.map((item) => (
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
                  value={String((props as BibleReaderControlsProps).currentChapter)}
                  onChange={(event) => handleChapterChange(Number(event.target.value))}
                >
                  {Array.from(
                    { length: (props as BibleReaderControlsProps).book.chapterCount },
                    (_, index) => index + 1
                  ).map((chapter) => (
                    <option key={chapter} value={chapter}>
                      Chapter {chapter}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="control-group control-group-compact">
                <label className="sr-only" htmlFor="fathers-work-select">
                  Work
                </label>
                <select
                  aria-label="Work"
                  id="fathers-work-select"
                  value={(props as FathersReaderControlsProps).currentWorkSlug}
                  onChange={(event) => handleWorkChange(event.target.value)}
                >
                  {(props as FathersReaderControlsProps).works.map((work) => (
                    <option key={work.slug} value={work.slug}>
                      {work.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="control-group control-group-compact">
                <label className="sr-only" htmlFor="fathers-section-select">
                  Section
                </label>
                <select
                  aria-label="Section"
                  id="fathers-section-select"
                  value={(props as FathersReaderControlsProps).currentSectionId}
                  onChange={(event) =>
                    (props as FathersReaderControlsProps).onSectionChange(event.target.value)
                  }
                >
                  {(props as FathersReaderControlsProps).sections.map((section) => (
                    <option key={section.value} value={section.value}>
                      {section.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
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
          {!isBibleMode && (props as FathersReaderControlsProps).libraryHref ? (
            <Link
              className="reader-inline-action reader-settings-link"
              href={(props as FathersReaderControlsProps).libraryHref ?? "/fathers"}
            >
              Library
            </Link>
          ) : null}
          {trailingActions}
        </div>
      </div>
    </section>
  );
}
