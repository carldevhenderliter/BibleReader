"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { THEME_PRESETS } from "@/lib/reader-customization";
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
  const { isPanelOpen, setIsPanelOpen, settings, updateSettings } = useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
  const versionOptions = getBibleVersionOptions(false);
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
    if (!isBundledBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
  };

  const handleTextSizeShift = (delta: number) => {
    updateSettings({
      textSize: Number((settings.textSize + delta).toFixed(2))
    });
  };

  return (
    <section className="reader-controls" aria-label="Reader controls">
      <div className="reader-controls-scroller">
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
        <div className="control-group control-group-compact">
          <label className="sr-only" htmlFor="version-select">
            Version
          </label>
          <select
            aria-label="Version"
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
        <div className="control-group control-group-compact">
          <label className="sr-only" htmlFor="theme-select">
            Theme
          </label>
          <select
            aria-label="Theme"
            id="theme-select"
            onChange={(event) => updateSettings({ themePreset: event.target.value as (typeof settings)["themePreset"] })}
            value={settings.themePreset}
          >
            {THEME_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>
        <div className="reader-size-controls" role="group" aria-label="Text size controls">
          <button
            aria-label="Decrease text size"
            className="reader-inline-button"
            onClick={() => handleTextSizeShift(-0.04)}
            type="button"
          >
            A-
          </button>
          <span className="reader-controls-status">{settings.textSize.toFixed(2)}rem</span>
          <button
            aria-label="Increase text size"
            className="reader-inline-button"
            onClick={() => handleTextSizeShift(0.04)}
            type="button"
          >
            A+
          </button>
        </div>
        <Link
          className="toggle-link reader-inline-action"
          href={getViewToggleHref(book.slug, currentChapter, view, version)}
        >
          {view === "book" ? "Chapter view" : "Whole book view"}
        </Link>
        <button
          aria-controls="reader-settings-panel"
          aria-expanded={isPanelOpen}
          className="reader-inline-button"
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          type="button"
        >
          Advanced
        </button>
      </div>
    </section>
  );
}
