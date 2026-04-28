"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import {
  getBooksForOrderMode,
  type BibleBookOrderMode
} from "@/lib/bible/book-order";
import {
  getGospelHarmonyChapterOptions,
  isGospelHarmonyBookSlug
} from "@/lib/gospel-harmony";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBookChapterHref, getBookHref, getChapterHref } from "@/lib/bible/utils";
import { BIBLE_VERSION_METADATA } from "@/lib/bible/version";

const BIBLE_BOOK_ORDER_STORAGE_KEY = "bible-reader.book-order";

type ReaderControlOption = {
  value: string;
  label: string;
};

type BibleReaderControlsProps = {
  mode?: "bible";
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  controlLabelPrefix?: string;
  idPrefix?: string;
  leadingActions?: ReactNode;
  showNavigationControls?: boolean;
  showUtilityActions?: boolean;
  trailingActions?: ReactNode;
  view: ReadingView;
};

type FathersReaderControlsProps = {
  mode: "fathers";
  works: Array<{
    slug: string;
    title: string;
  }>;
  controlLabelPrefix?: string;
  currentWorkSlug: string;
  idPrefix?: string;
  sections: ReaderControlOption[];
  currentSectionId: string;
  libraryHref?: string;
  leadingActions?: ReactNode;
  showNavigationControls?: boolean;
  showUtilityActions?: boolean;
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
  const controlLabelPrefix = props.controlLabelPrefix?.trim();
  const idPrefix = props.idPrefix?.trim() || (isBibleMode ? "reader-controls" : "fathers-reader-controls");
  const getControlLabel = (label: string) =>
    controlLabelPrefix ? `${controlLabelPrefix} ${label}` : label;
  const showNavigationControls = props.showNavigationControls ?? true;
  const showUtilityActions = props.showUtilityActions ?? true;
  const getControlId = (id: string) => `${idPrefix}-${id}`;
  const [bookOrderMode, setBookOrderMode] = useState<BibleBookOrderMode>("canonical");
  const displayedBooks = useMemo(() => {
    if (!isBibleMode) {
      return [];
    }

    const { books } = props as BibleReaderControlsProps;
    return getBooksForOrderMode(books, bookOrderMode);
  }, [bookOrderMode, isBibleMode, props]);
  const displayedChapterOptions = useMemo(() => {
    if (!isBibleMode) {
      return [];
    }

    const { book } = props as BibleReaderControlsProps;

    if (isGospelHarmonyBookSlug(book.slug)) {
      return getGospelHarmonyChapterOptions().map((option) => ({
        value: String(option.chapterNumber),
        label: option.label
      }));
    }

    return Array.from({ length: book.chapterCount }, (_, index) => ({
      value: String(index + 1),
      label: `Chapter ${index + 1}`
    }));
  }, [isBibleMode, props]);
  const hasOldTestamentBooks = isBibleMode
    ? (props as BibleReaderControlsProps).books.some((book) => book.testament === "Old")
    : false;
  const hasNewTestamentBooks = isBibleMode
    ? (props as BibleReaderControlsProps).books.some((book) => book.testament === "New")
    : false;

  useEffect(() => {
    if (!isBibleMode || typeof window === "undefined") {
      return;
    }

    const storedValue = window.localStorage.getItem(BIBLE_BOOK_ORDER_STORAGE_KEY);

    if (
      storedValue === "chronological-old-testament" ||
      storedValue === "chronological-new-testament"
    ) {
      setBookOrderMode(storedValue);
      return;
    }

    if (storedValue === "chronological") {
      setBookOrderMode("chronological-new-testament");
      return;
    }

    setBookOrderMode("canonical");
  }, [isBibleMode]);

  useEffect(() => {
    if (!isBibleMode || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(BIBLE_BOOK_ORDER_STORAGE_KEY, bookOrderMode);
  }, [bookOrderMode, isBibleMode]);

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
      className={`reader-controls ${isBibleMode ? "reader-controls-bible" : "reader-controls-fathers"}`}
      aria-label={isBibleMode ? "Passage controls" : "Fathers reader controls"}
    >
      <div className="reader-controls-bar">
        {showNavigationControls ? (
          <div
            className={`reader-controls-primary ${
              isBibleMode ? "reader-controls-primary-bible" : "reader-controls-primary-fathers"
            }`}
          >
            {isBibleMode ? (
              <>
                <div className="control-group control-group-compact">
                  <label className="sr-only" htmlFor={getControlId("book-order-select")}>
                    {getControlLabel("Book order")}
                  </label>
                  <select
                    aria-label={getControlLabel("Book order")}
                    id={getControlId("book-order-select")}
                    value={bookOrderMode}
                    onChange={(event) =>
                      setBookOrderMode(
                        event.target.value === "chronological-old-testament" ||
                          event.target.value === "chronological-new-testament"
                          ? event.target.value
                          : "canonical"
                      )
                    }
                  >
                    <option value="canonical">Canonical</option>
                    {hasOldTestamentBooks ? (
                      <option value="chronological-old-testament">Chronological OT</option>
                    ) : null}
                    {hasNewTestamentBooks ? (
                      <option value="chronological-new-testament">Chronological NT</option>
                    ) : null}
                  </select>
                </div>
                <div className="control-group control-group-compact">
                  <label className="sr-only" htmlFor={getControlId("book-select")}>
                    {getControlLabel("Book")}
                  </label>
                  <select
                    aria-label={getControlLabel("Book")}
                    id={getControlId("book-select")}
                    value={(props as BibleReaderControlsProps).book.slug}
                    onChange={(event) => handleBookChange(event.target.value)}
                  >
                    {displayedBooks.map((item) => (
                      <option key={item.slug} value={item.slug}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="control-group control-group-compact">
                  <label className="sr-only" htmlFor={getControlId("chapter-select")}>
                    {getControlLabel("Chapter")}
                  </label>
                  <select
                    aria-label={getControlLabel("Chapter")}
                    id={getControlId("chapter-select")}
                    value={String((props as BibleReaderControlsProps).currentChapter)}
                    onChange={(event) => handleChapterChange(Number(event.target.value))}
                  >
                    {displayedChapterOptions.map((chapter) => (
                      <option key={chapter.value} value={chapter.value}>
                        {chapter.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="control-group control-group-compact">
                  <label className="sr-only" htmlFor={getControlId("fathers-work-select")}>
                    {getControlLabel("Work")}
                  </label>
                  <select
                    aria-label={getControlLabel("Work")}
                    id={getControlId("fathers-work-select")}
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
                  <label className="sr-only" htmlFor={getControlId("fathers-section-select")}>
                    {getControlLabel("Section")}
                  </label>
                  <select
                    aria-label={getControlLabel("Section")}
                    id={getControlId("fathers-section-select")}
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
        ) : null}
        {showUtilityActions || leadingActions || trailingActions ? (
          <div className="reader-controls-actions">
            {leadingActions}
            {showUtilityActions ? (
              <>
                <Link className="reader-inline-action reader-settings-link" href="/">
                  Home
                </Link>
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
              </>
            ) : null}
            {trailingActions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
