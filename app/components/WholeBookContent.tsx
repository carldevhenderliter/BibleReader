"use client";

import { useEffect } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import type { BookMeta, BundledBibleVersion, Chapter } from "@/lib/bible/types";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type WholeBookContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: Record<BundledBibleVersion, Chapter[]>;
  focusedChapterNumber?: number | null;
  highlightedChapterNumber?: number | null;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
};

export function WholeBookContent({
  books,
  book,
  chaptersByVersion,
  focusedChapterNumber = null,
  highlightedChapterNumber = null,
  highlightedVerseNumber = null,
  highlightedVerseRange = null
}: WholeBookContentProps) {
  const { version } = useReaderVersion();
  const { settings } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const chapters = chaptersByVersion[version];
  const showStrongs = version === "kjv" && settings.showStrongs;
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const activeFocusedChapterNumber =
    focusedChapterNumber && focusedChapterNumber <= book.chapterCount ? focusedChapterNumber : 1;
  const focusedChapter =
    chapters.find((chapter) => chapter.chapterNumber === activeFocusedChapterNumber) ??
    chapters[0] ??
    null;

  useEffect(() => {
    syncCurrentChapterData(book.slug, focusedChapter?.chapterNumber ?? 1, null);
    setActiveStudyVerseNumber(
      highlightedVerseRange?.start ??
        highlightedVerseNumber ??
        focusedChapter?.verses[0]?.number ??
        null
    );
  }, [
    book.slug,
    focusedChapter,
    highlightedVerseNumber,
    highlightedVerseRange,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  ]);

  useEffect(() => {
    if (!activeFocusedChapterNumber || activeFocusedChapterNumber > book.chapterCount) {
      return;
    }

    const element = document.getElementById(`chapter-${book.slug}-${activeFocusedChapterNumber}`);
    element?.scrollIntoView?.({ block: "start" });
  }, [activeFocusedChapterNumber, book.chapterCount, book.slug]);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={1} view="book" />
      <ReaderSettingsPanel book={book} currentChapter={1} view="book" />
      <section className="reader-card reader-reading-card">
        <div className="reader-topline">
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-label">{book.testament} Testament</p>
              <p className="reader-toolbar-summary">{versionLabel}</p>
            </div>
            <div className="reader-toolbar-actions">
              <ReaderControls
                book={book}
                books={books}
                currentChapter={1}
                view="book"
              />
              {isSplitViewActive ? (
                <div className="reader-toolbar-utilities">
                  <button
                    aria-label="Hide reader pane"
                    className="split-pane-hide-button reader-pane-hide-button"
                    disabled={!canCollapseSplitPane("reader")}
                    onClick={() => collapseSplitPane("reader")}
                    type="button"
                  >
                    Hide
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <header className="reader-heading">
            <p className="reader-section-label">{versionBadge}</p>
            <h1>{book.name}</h1>
            <p className="reader-meta">
              {book.chapterCount} chapters
              <span className="reader-meta-separator" aria-hidden="true">
                ·
              </span>
              Continuous reading
            </p>
          </header>
        </div>
        <ReaderContentTabs />
        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={1} />
          </div>
        ) : showNotebookInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderNotebookEditor />
          </div>
        ) : showSermonsInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderSermonWorkspace currentChapter={chapters[0] ?? null} />
          </div>
        ) : (
          <div className="reading-surface chapter-stack">
            {chapters.map((chapter) => (
              <section
                className="book-section"
                id={`chapter-${book.slug}-${chapter.chapterNumber}`}
                key={chapter.chapterNumber}
              >
                <div className="book-section-header">
                  <h2 className="book-section-title">Chapter {chapter.chapterNumber}</h2>
                  <p className="book-section-subtitle">{chapter.verses.length} verses</p>
                </div>
                <VerseList
                  bookSlug={book.slug}
                  chapterNumber={chapter.chapterNumber}
                  highlightedVerseNumber={
                    chapter.chapterNumber === highlightedChapterNumber ? highlightedVerseNumber : null
                  }
                  highlightedVerseRange={
                    chapter.chapterNumber === highlightedChapterNumber ? highlightedVerseRange : null
                  }
                  key={`${version}:${book.slug}:${chapter.chapterNumber}`}
                  showStrongs={showStrongs}
                  verses={chapter.verses}
                />
              </section>
            ))}
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
