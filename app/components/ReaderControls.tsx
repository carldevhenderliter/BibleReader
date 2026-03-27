"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { getBookHref, getChapterHref, getViewToggleHref } from "@/lib/bible/utils";
import {
  BIBLE_VERSION_METADATA,
  getBibleVersionOptions,
  isBundledBibleVersion
} from "@/lib/bible/version";

type ReaderControlsProps = {
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  view: ReadingView;
};

export function ReaderControls({ books, book, currentChapter, view }: ReaderControlsProps) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isPanelOpen, setIsPanelOpen } = useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
  const versionOptions = getBibleVersionOptions(false);
  const versionMeta = BIBLE_VERSION_METADATA[version];

  const handleBookChange = (nextBookSlug: string) => {
    const nextBook = books.find(({ slug }) => slug === nextBookSlug);

    if (!nextBook) {
      return;
    }

    if (view === "book" && versionMeta.supportsWholeBook) {
      setIsMobileMenuOpen(false);
      router.push(getBookHref(nextBook.slug, version));
      return;
    }

    setIsMobileMenuOpen(false);
    router.push(getChapterHref(nextBook.slug, Math.min(currentChapter, nextBook.chapterCount), version));
  };

  const handleChapterChange = (nextChapter: number) => {
    setIsMobileMenuOpen(false);
    router.push(getChapterHref(book.slug, nextChapter, version));
  };

  const handleVersionChange = (nextVersion: string) => {
    if (!isBundledBibleVersion(nextVersion)) {
      return;
    }

    if (nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="reader-controls-shell">
      <div className="reader-mobile-toolbar">
        <span className="reader-controls-status reader-mobile-status">
          {versionMeta.label} · {view === "book" ? "Whole book" : `Chapter ${currentChapter}`}
        </span>
        <button
          aria-controls="reader-controls-panel"
          aria-expanded={isMobileMenuOpen}
          className="reader-mobile-toggle"
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          type="button"
        >
          {isMobileMenuOpen ? "Close controls" : "Reader controls"}
        </button>
      </div>
      <section
        aria-label="Reader controls"
        className={`reader-controls${isMobileMenuOpen ? " is-mobile-open" : ""}`}
        id="reader-controls-panel"
      >
        <div className="control-grid">
          <div className="control-group">
            <label htmlFor="book-select">Book</label>
            <select
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
          <div className="control-group">
            <label htmlFor="version-select">Version</label>
            <select
              id="version-select"
              onChange={(event) => handleVersionChange(event.target.value)}
              value={version}
            >
              {versionOptions.map((option) => (
                <option disabled={option.disabled} key={option.id} value={option.id}>
                  {option.disabled ? `${option.label} (API key required)` : option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="control-group">
            <label htmlFor="chapter-select">Chapter</label>
            <select
              id="chapter-select"
              value={String(currentChapter)}
              onChange={(event) => handleChapterChange(Number(event.target.value))}
            >
              {Array.from({ length: book.chapterCount }, (_, index) => index + 1).map((chapter) => (
                <option key={chapter} value={chapter}>
                  {chapter}
                </option>
              ))}
            </select>
          </div>
          <Link
            className="toggle-link"
            href={getViewToggleHref(book.slug, currentChapter, view, version)}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {view === "book" ? "Switch to chapter view" : "Switch to whole book view"}
          </Link>
          <button
            aria-controls="reader-settings-panel"
            aria-expanded={isPanelOpen}
            className="reader-settings-trigger"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            type="button"
          >
            Customize
          </button>
        </div>
      </section>
    </div>
  );
}
