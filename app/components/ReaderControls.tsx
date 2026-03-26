"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import type { BibleVersion, BookMeta, ReadingView } from "@/lib/bible/types";
import { getBookHref, getChapterHref, getViewToggleHref } from "@/lib/bible/utils";
import {
  BIBLE_VERSION_METADATA,
  getBibleVersionOptions,
  isBibleVersion
} from "@/lib/bible/version";

type ReaderControlsProps = {
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  view: ReadingView;
  version: BibleVersion;
  esvEnabled: boolean;
};

export function ReaderControls({
  books,
  book,
  currentChapter,
  view,
  version,
  esvEnabled
}: ReaderControlsProps) {
  const router = useRouter();
  const { isPanelOpen, setIsPanelOpen } = useReaderCustomization();
  const versionOptions = getBibleVersionOptions(esvEnabled);
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
    router.push(getChapterHref(book.slug, nextChapter, version));
  };

  const handleVersionChange = (nextVersion: string) => {
    if (!isBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    if (view === "book" && nextVersion !== "esv") {
      router.push(getBookHref(book.slug, nextVersion));
      return;
    }

    router.push(getChapterHref(book.slug, currentChapter, nextVersion));
  };

  return (
    <section className="reader-controls" aria-label="Reader controls">
      <div className="reader-controls-header">
        <span className="reader-controls-title">Navigation Grid</span>
        <div className="reader-controls-actions">
          <span className="reader-controls-status">
            {versionMeta.label} · {view === "book" ? "Whole book" : "Chapter"}
          </span>
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
      </div>
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
          <select id="version-select" onChange={(event) => handleVersionChange(event.target.value)} value={version}>
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
        {versionMeta.supportsWholeBook ? (
          <Link className="toggle-link" href={getViewToggleHref(book.slug, currentChapter, view, version)}>
            {view === "book" ? "Switch to chapter view" : "Switch to whole book view"}
          </Link>
        ) : (
          <span aria-disabled="true" className="toggle-link toggle-link-disabled">
            Whole book view is unavailable for ESV
          </span>
        )}
      </div>
    </section>
  );
}
