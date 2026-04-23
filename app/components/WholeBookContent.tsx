"use client";

import { useEffect, useRef, useState } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderOtComparePanel } from "@/app/components/ReaderOtComparePanel";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
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
  EsvInterlinearDisplayChapter,
  EsvInterlinearDisplayVerse
} from "@/lib/bible/types";
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
  masoreticBookChapters?: Chapter[] | null;
  esvInterlinearBook?: EsvInterlinearDisplayChapter[] | null;
  focusedChapterNumber?: number | null;
  highlightedChapterNumber?: number | null;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
};

type LazyBookChapterSectionProps = {
  bookSlug: string;
  chapter: Chapter;
  initialRender: boolean;
  highlightedVerseNumber: number | null;
  highlightedVerseRange: {
    start: number;
    end: number;
  } | null;
  interlinearVerseMap?: Record<number, EsvInterlinearDisplayVerse>;
  showCompanionVerseTranslation: boolean;
  showCustomVerseTranslation: boolean;
  showGreekGloss: boolean;
  showGreekLemma: boolean;
  showGreekSurface: boolean;
  showGreekTransliteration: boolean;
  showStrongs: boolean;
  showVerseText: boolean;
  annotationMode: boolean;
  version: string;
};

function LazyBookChapterSection({
  bookSlug,
  chapter,
  initialRender,
  highlightedVerseNumber,
  highlightedVerseRange,
  interlinearVerseMap,
  showCompanionVerseTranslation,
  showCustomVerseTranslation,
  showGreekGloss,
  showGreekLemma,
  showGreekSurface,
  showGreekTransliteration,
  showStrongs,
  showVerseText,
  annotationMode,
  version
}: LazyBookChapterSectionProps) {
  const [shouldRenderChapter, setShouldRenderChapter] = useState(initialRender);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialRender) {
      setShouldRenderChapter(true);
    }
  }, [initialRender]);

  useEffect(() => {
    if (shouldRenderChapter) {
      return;
    }

    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRenderChapter(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderChapter(true);
        }
      },
      {
        rootMargin: "1400px 0px"
      }
    );

    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldRenderChapter]);

  return (
    <section
      className="book-section"
      id={`chapter-${bookSlug}-${chapter.chapterNumber}`}
      key={chapter.chapterNumber}
      ref={sectionRef}
    >
      <div className="book-section-header">
        <h2 className="book-section-title">Chapter {chapter.chapterNumber}</h2>
        <p className="book-section-subtitle">{chapter.verses.length} verses</p>
      </div>
      {shouldRenderChapter ? (
        <VerseList
          bookSlug={bookSlug}
          chapterNumber={chapter.chapterNumber}
          highlightedVerseNumber={highlightedVerseNumber}
          highlightedVerseRange={highlightedVerseRange}
          interlinearVerseMap={interlinearVerseMap}
          key={`${version}:${bookSlug}:${chapter.chapterNumber}`}
          annotationMode={annotationMode}
          showCompanionVerseTranslation={showCompanionVerseTranslation}
          showCustomVerseTranslation={showCustomVerseTranslation}
          showGreekGloss={showGreekGloss}
          showGreekLemma={showGreekLemma}
          showGreekSurface={showGreekSurface}
          showGreekTransliteration={showGreekTransliteration}
          showStrongs={showStrongs}
          showVerseText={showVerseText}
          verses={chapter.verses}
        />
      ) : (
        <div
          aria-label={`Loading chapter ${chapter.chapterNumber}`}
          className="book-section-placeholder"
        />
      )}
    </section>
  );
}

export function WholeBookContent({
  books,
  book,
  chaptersByVersion,
  masoreticBookChapters = null,
  esvInterlinearBook = null,
  focusedChapterNumber = null,
  highlightedChapterNumber = null,
  highlightedVerseNumber = null,
  highlightedVerseRange = null
}: WholeBookContentProps) {
  const locationSearch = useLocationSearch();
  const { version } = useReaderVersion();
  const { isPanelOpen, settings } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeGreekLearningQuizSelection,
    activeReaderPane,
    activeUtilityPane,
    isGreekLearningMode,
    setActiveReaderPane,
    setIsGreekLearningMode,
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
  const showStrongsInline =
    !isSplitViewActive && activeUtilityPane === "strongs" && !activeGreekLearningQuizSelection;
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const [annotationMode, setAnnotationMode] = useState(false);
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
  const isOldTestament = book.testament === "Old";
  const hasGreekLearningSurface =
    (version === "greek" &&
      chapters.some((chapter) =>
        chapter.verses.some((verse) => Boolean(verse.greekTokens?.length))
      )) ||
    (showEsvInterlinear &&
      chapters.some((chapter) =>
        chapter.verses.some((verse) =>
          Boolean(interlinearByChapter?.get(chapter.chapterNumber)?.[verse.number]?.tokens?.length)
        )
      ));
  const hasBibleGreekAnnotationSurface =
    (version === "greek" &&
      chapters.some((chapter) =>
        chapter.verses.some(
          (verse) => Boolean(verse.greekTokens?.length) && Boolean(verse.translationText?.trim())
        )
      )) ||
    (showEsvInterlinear &&
      chapters.some((chapter) =>
        chapter.verses.some((verse) =>
          Boolean(interlinearByChapter?.get(chapter.chapterNumber)?.[verse.number]?.tokens?.length)
        )
      ));

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
    if (!isOldTestament && activeReaderPane === "ot-compare") {
      setActiveReaderPane("reading");
    }
  }, [activeReaderPane, isOldTestament, setActiveReaderPane]);

  useEffect(() => {
    if (!hasBibleGreekAnnotationSurface && annotationMode) {
      setAnnotationMode(false);
    }
  }, [annotationMode, hasBibleGreekAnnotationSurface]);

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
                  <>
                    {hasBibleGreekAnnotationSurface ? (
                      <button
                        className={`reader-inline-button${annotationMode ? " is-active" : ""}`}
                        onClick={() => setAnnotationMode((current) => !current)}
                        type="button"
                      >
                        {annotationMode ? "Done annotating" : "Annotate Greek"}
                      </button>
                    ) : null}
                    {hasGreekLearningSurface ? (
                      <button
                        className={`reader-inline-button${isGreekLearningMode ? " is-active" : ""}`}
                        onClick={() => setIsGreekLearningMode(!isGreekLearningMode)}
                        type="button"
                      >
                        {isGreekLearningMode ? "Stop Learning" : "Learn Greek"}
                      </button>
                    ) : null}
                    {isSplitViewActive ? (
                      <button
                        aria-label="Hide reader pane"
                        className="split-pane-hide-button reader-pane-hide-button"
                        disabled={!canCollapseSplitPane("reader")}
                        onClick={() => collapseSplitPane("reader")}
                        type="button"
                      >
                        Hide
                      </button>
                    ) : null}
                  </>
                }
                view="book"
              />
            </div>
          </div>
        </div>
        <ReaderContentTabs showOtCompare={isOldTestament} />
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
        ) : activeReaderPane === "ot-compare" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderOtComparePanel
              book={book}
              focusedChapterNumber={activeFocusedChapterNumber}
              greekChapters={chaptersByVersion.greek ?? null}
              masoreticChapters={masoreticBookChapters}
              view="book"
            />
            {!isSplitViewActive && activeUtilityPane === "strongs" ? (
              <div className="reader-ot-compare-study-panel">
                <ReaderStrongsPanel />
              </div>
            ) : null}
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
              <LazyBookChapterSection
                bookSlug={book.slug}
                chapter={chapter}
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
                initialRender={
                  Math.abs(chapter.chapterNumber - activeFocusedChapterNumber) <= 1 ||
                  chapter.chapterNumber === activeHighlightedChapterNumber
                }
                interlinearVerseMap={interlinearByChapter?.get(chapter.chapterNumber)}
                key={chapter.chapterNumber}
                showCompanionVerseTranslation={settings.showCompanionVerseTranslation}
                showCustomVerseTranslation={settings.showCustomVerseTranslation}
                showGreekGloss={settings.showGreekGloss}
                showGreekLemma={settings.showGreekLemma}
                showGreekSurface={settings.showGreekSurface}
                showGreekTransliteration={settings.showGreekTransliteration}
                showStrongs={showStrongs}
                showVerseText={settings.showVerseText}
                annotationMode={annotationMode}
                version={version}
              />
            ))}
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
