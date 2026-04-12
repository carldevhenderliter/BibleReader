"use client";

import { useEffect } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { useReaderTts } from "@/app/components/ReaderTtsProvider";
import { useLocationSearch } from "@/app/components/useLocationSearch";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import type {
  BookMeta,
  BundledBookChapterMap,
  Chapter,
  EsvInterlinearDisplayChapter
} from "@/lib/bible/types";
import { buildChapterSpeechText } from "@/lib/reader-tts";
import { getBibleVersionBadge } from "@/lib/bible/version";

function parsePositiveNumber(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return parsedValue > 0 ? parsedValue : null;
}

type WholeBookContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: BundledBookChapterMap;
  esvInterlinearBook?: EsvInterlinearDisplayChapter[] | null;
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
  esvInterlinearBook = null,
  focusedChapterNumber = null,
  highlightedChapterNumber = null,
  highlightedVerseNumber = null,
  highlightedVerseRange = null
}: WholeBookContentProps) {
  const locationSearch = useLocationSearch();
  const { version } = useReaderVersion();
  const { isPanelOpen, settings } = useReaderCustomization();
  const { setReadingSource } = useReaderTts();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const chapters = chaptersByVersion[version] ?? Object.values(chaptersByVersion)[0] ?? [];
  const showStrongs = version === "kjv" && settings.showStrongs;
  const showEsvInterlinear =
    version === "esv" &&
    book.testament === "New" &&
    settings.showEsvInterlinear &&
    esvInterlinearBook !== null;
  const interlinearByChapter = showEsvInterlinear
    ? new Map(
        (esvInterlinearBook ?? []).map((chapter) => [
          chapter.chapterNumber,
          Object.fromEntries(chapter.verses.map((verse) => [verse.number, verse]))
        ])
      )
    : null;
  const versionBadge = getBibleVersionBadge(version);
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showStrongsInline = !isSplitViewActive && activeUtilityPane === "strongs";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const searchParams = new URLSearchParams(locationSearch);
  const urlFocusedChapterNumber = parsePositiveNumber(searchParams.get("chapter"));
  const urlHighlightedChapterNumber = parsePositiveNumber(searchParams.get("highlightChapter"));
  const urlHighlightedVerseNumber = parsePositiveNumber(searchParams.get("highlight"));
  const urlHighlightedRangeStart = parsePositiveNumber(searchParams.get("highlightStart"));
  const urlHighlightedRangeEnd = parsePositiveNumber(searchParams.get("highlightEnd"));
  const urlHighlightedVerseRange =
    urlHighlightedRangeStart !== null &&
    urlHighlightedRangeEnd !== null &&
    urlHighlightedRangeEnd >= urlHighlightedRangeStart
      ? {
          start: urlHighlightedRangeStart,
          end: urlHighlightedRangeEnd
        }
      : null;
  const activeHighlightedChapterNumber =
    highlightedChapterNumber ?? urlHighlightedChapterNumber;
  const activeHighlightedVerseRange = highlightedVerseRange ?? urlHighlightedVerseRange;
  const activeHighlightedVerseNumber =
    activeHighlightedVerseRange !== null ? null : (highlightedVerseNumber ?? urlHighlightedVerseNumber);
  const activeFocusedChapterNumber =
    (activeHighlightedChapterNumber && activeHighlightedChapterNumber <= book.chapterCount
      ? activeHighlightedChapterNumber
      : focusedChapterNumber && focusedChapterNumber <= book.chapterCount
        ? focusedChapterNumber
        : urlFocusedChapterNumber && urlFocusedChapterNumber <= book.chapterCount
          ? urlFocusedChapterNumber
          : 1);
  const focusedChapter =
    chapters.find((chapter) => chapter.chapterNumber === activeFocusedChapterNumber) ??
    chapters[0] ??
    null;

  useEffect(() => {
    syncCurrentChapterData(book.slug, focusedChapter?.chapterNumber ?? 1, null);
    setActiveStudyVerseNumber(
      activeHighlightedVerseRange?.start ??
        activeHighlightedVerseNumber ??
        focusedChapter?.verses[0]?.number ??
        null
    );
  }, [
    activeHighlightedVerseNumber,
    activeHighlightedVerseRange,
    book.slug,
    focusedChapter,
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

  useEffect(() => {
    setReadingSource({
      bookSlug: book.slug,
      bookName: book.name,
      chapterCount: book.chapterCount,
      currentChapterNumber: activeFocusedChapterNumber,
      chapters: chapters.map((chapter) => ({
        chapterNumber: chapter.chapterNumber,
        text: buildChapterSpeechText(book.name, chapter.chapterNumber, chapter.verses)
      })),
      view: "book",
      scrollToChapter: (chapterNumber) => {
        const element = document.getElementById(`chapter-${book.slug}-${chapterNumber}`);
        element?.scrollIntoView?.({ block: "start" });
      }
    });

    return () => {
      setReadingSource(null);
    };
  }, [
    activeFocusedChapterNumber,
    book.chapterCount,
    book.name,
    book.slug,
    chapters,
    setReadingSource
  ]);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={1} view="book" />
      <ReaderSettingsPanel book={book} currentChapter={1} view="book" />
      <section className="reader-card reader-reading-card">
        <div className={`reader-topline${isToplineVisible ? "" : " is-hidden"}`}>
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-summary">{versionBadge}</p>
              <p className="reader-toolbar-title">{book.name}</p>
              <p className="reader-toolbar-meta">
                {book.chapterCount} chapters
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                Continuous reading
              </p>
            </div>
            <div className="reader-toolbar-actions">
              <ReaderControls
                book={book}
                books={books}
                currentChapter={1}
                trailingActions={
                  isSplitViewActive ? (
                    <button
                      aria-label="Hide reader pane"
                      className="split-pane-hide-button reader-pane-hide-button"
                      disabled={!canCollapseSplitPane("reader")}
                      onClick={() => collapseSplitPane("reader")}
                      type="button"
                    >
                      Hide
                    </button>
                  ) : null
                }
                view="book"
              />
            </div>
          </div>
        </div>
        <ReaderContentTabs />
        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={1} />
          </div>
        ) : activeReaderPane === "compare" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderComparePanel
              book={book}
              chaptersByVersion={chaptersByVersion}
              focusedChapterNumber={activeFocusedChapterNumber}
              view="book"
            />
          </div>
        ) : showNotebookInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderNotebookEditor />
          </div>
        ) : showStrongsInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStrongsPanel />
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
                    chapter.chapterNumber === activeHighlightedChapterNumber
                      ? activeHighlightedVerseNumber
                      : null
                  }
                  highlightedVerseRange={
                    chapter.chapterNumber === activeHighlightedChapterNumber
                      ? activeHighlightedVerseRange
                      : null
                  }
                  interlinearVerseMap={interlinearByChapter?.get(chapter.chapterNumber)}
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
