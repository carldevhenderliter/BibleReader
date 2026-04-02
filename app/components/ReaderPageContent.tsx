"use client";

import { useEffect } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
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
import type { BookMeta, BundledChapterMap } from "@/lib/bible/types";
import { buildChapterSpeechText } from "@/lib/reader-tts";
import { getBibleVersionBadge } from "@/lib/bible/version";

function parsePositiveNumber(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return parsedValue > 0 ? parsedValue : null;
}

type ReaderPageContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: BundledChapterMap;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
};

export function ReaderPageContent({
  books,
  book,
  chaptersByVersion,
  highlightedVerseNumber,
  highlightedVerseRange
}: ReaderPageContentProps) {
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
  const chapter = chaptersByVersion[version] ?? Object.values(chaptersByVersion)[0] ?? null;
  const showStrongs = version === "kjv" && settings.showStrongs;
  const versionBadge = getBibleVersionBadge(version);
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const searchParams = new URLSearchParams(locationSearch);
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
  const activeHighlightedVerseRange = highlightedVerseRange ?? urlHighlightedVerseRange;
  const activeHighlightedVerseNumber =
    activeHighlightedVerseRange !== null ? null : (highlightedVerseNumber ?? urlHighlightedVerseNumber);

  if (!chapter) {
    return null;
  }

  useEffect(() => {
    syncCurrentChapterData(book.slug, chapter.chapterNumber, chaptersByVersion);
    setActiveStudyVerseNumber(
      activeHighlightedVerseRange?.start ??
        activeHighlightedVerseNumber ??
        chapter.verses[0]?.number ??
        null
    );
  }, [
    activeHighlightedVerseNumber,
    activeHighlightedVerseRange,
    book.slug,
    chapter.chapterNumber,
    chapter.verses,
    chaptersByVersion,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  ]);

  useEffect(() => {
    setReadingSource({
      bookSlug: book.slug,
      bookName: book.name,
      chapterCount: book.chapterCount,
      currentChapterNumber: chapter.chapterNumber,
      chapters: [
        {
          chapterNumber: chapter.chapterNumber,
          text: buildChapterSpeechText(book.name, chapter.chapterNumber, chapter.verses)
        }
      ],
      view: "chapter"
    });

    return () => {
      setReadingSource(null);
    };
  }, [book.chapterCount, book.name, book.slug, chapter.chapterNumber, chapter.verses, setReadingSource]);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={chapter.chapterNumber} view="chapter" />
      <ReaderSettingsPanel book={book} currentChapter={chapter.chapterNumber} view="chapter" />
      <section className="reader-card reader-reading-card">
        <div className={`reader-topline${isToplineVisible ? "" : " is-hidden"}`}>
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-summary">{versionBadge}</p>
              <p className="reader-toolbar-title">
                {book.name} {chapter.chapterNumber}
              </p>
              <p className="reader-toolbar-meta">
                {chapter.verses.length} verses
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                Chapter view
              </p>
            </div>
            <div className="reader-toolbar-actions">
              <ReaderControls
                book={book}
                books={books}
                currentChapter={chapter.chapterNumber}
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
                view="chapter"
              />
            </div>
          </div>
        </div>
        <ReaderContentTabs />
        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={chapter.chapterNumber} />
          </div>
        ) : activeReaderPane === "compare" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderComparePanel />
          </div>
        ) : showNotebookInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderNotebookEditor />
          </div>
        ) : showSermonsInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderSermonWorkspace currentChapter={chapter} />
          </div>
        ) : (
          <div className="reading-surface">
            <VerseList
              bookSlug={book.slug}
              chapterNumber={chapter.chapterNumber}
              highlightedVerseNumber={activeHighlightedVerseNumber}
              highlightedVerseRange={activeHighlightedVerseRange}
              key={`${version}:${book.slug}:${chapter.chapterNumber}`}
              showStrongs={showStrongs}
              verses={chapter.verses}
            />
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
