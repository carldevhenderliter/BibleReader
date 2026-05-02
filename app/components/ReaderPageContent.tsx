"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderBookAudioPlayer } from "@/app/components/ReaderBookAudioPlayer";
import { useRegisterReaderBottomBarPanel } from "@/app/components/ReaderBottomBarProvider";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderCopyButton } from "@/app/components/ReaderCopyButton";
import { ReaderHarmonyPanel } from "@/app/components/ReaderHarmonyPanel";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderOtComparePanel } from "@/app/components/ReaderOtComparePanel";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { useBookAudioSource } from "@/app/components/useBookAudioSource";
import { useLocationSearch } from "@/app/components/useLocationSearch";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import {
  BIBLE_BOOK_ORDER_STORAGE_KEY,
  normalizeBibleBookOrderMode
} from "@/lib/bible/book-order";
import {
  BOOK_AUDIO_AUTOPLAY_STORAGE_KEY,
  getBookAudioSource,
  getNextBookWithAudio
} from "@/lib/bible/book-audio";
import type {
  BookMeta,
  BundledChapterMap,
  Chapter,
  EsvInterlinearDisplayChapter
} from "@/lib/bible/types";
import { getChapterHref } from "@/lib/bible/utils";
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
  masoreticChapter?: Chapter | null;
  esvInterlinearChapter?: EsvInterlinearDisplayChapter | null;
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
  masoreticChapter = null,
  esvInterlinearChapter = null,
  highlightedVerseNumber,
  highlightedVerseRange
}: ReaderPageContentProps) {
  const router = useRouter();
  const locationSearch = useLocationSearch();
  const { version } = useReaderVersion();
  const { isPanelOpen, settings } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    isGreekLearningMode,
    setActiveReaderPane,
    setIsGreekLearningMode,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const chapter = chaptersByVersion[version] ?? Object.values(chaptersByVersion)[0] ?? null;
  const showStrongs = version === "kjv" && settings.showStrongs;
  const showEsvInterlinear =
    version === "esv" &&
    book.testament === "New" &&
    settings.showEsvInterlinear &&
    esvInterlinearChapter !== null;
  const interlinearVerseMap = showEsvInterlinear
    ? Object.fromEntries(
        esvInterlinearChapter.verses.map((verse) => [verse.number, verse])
      )
    : undefined;
  const versionBadge = getBibleVersionBadge(version);
  const bookAudioSource = useBookAudioSource(book.slug);
  const [audioBookOrderMode, setAudioBookOrderMode] = useState<
    "canonical" | "chronological-old-testament" | "chronological-new-testament"
  >("canonical");
  const nextAudioBook = useMemo(
    () => getNextBookWithAudio(books, book.slug, audioBookOrderMode),
    [audioBookOrderMode, book.slug, books]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setAudioBookOrderMode(
      normalizeBibleBookOrderMode(window.localStorage.getItem(BIBLE_BOOK_ORDER_STORAGE_KEY))
    );
  }, [book.slug]);

  const handleBookAudioEnded = useCallback(() => {
    if (!bookAudioSource) {
      return;
    }

    const bookOrderMode =
      typeof window === "undefined"
        ? "canonical"
        : normalizeBibleBookOrderMode(
            window.localStorage.getItem(BIBLE_BOOK_ORDER_STORAGE_KEY)
          );
    const nextBook = getNextBookWithAudio(books, book.slug, bookOrderMode);

    if (!nextBook) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY);
      }
      return;
    }

    if (typeof window !== "undefined" && getBookAudioSource(nextBook.slug)) {
      window.sessionStorage.setItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY, nextBook.slug);
    }

    router.push(getChapterHref(nextBook.slug, 1, version));
  }, [book.slug, bookAudioSource, books, router, version]);
  const bottomBarPanel = useMemo(
    () => (
      <ReaderBookAudioPlayer
        audioSource={bookAudioSource}
        autoPlayBookSlug={book.slug}
        nextUpLabel={nextAudioBook?.name ?? null}
        onEnded={handleBookAudioEnded}
        resumeSession={{
          autoplayKey: book.slug,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: chapter?.chapterNumber ?? 1,
          view: "chapter",
          version,
          href: getChapterHref(book.slug, chapter?.chapterNumber ?? 1, version)
        }}
      />
    ),
    [
      book.name,
      book.slug,
      bookAudioSource,
      chapter?.chapterNumber,
      handleBookAudioEnded,
      nextAudioBook?.name,
      version
    ]
  );
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showStrongsInline = !isSplitViewActive && activeUtilityPane === "strongs";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const showHarmonyInline = !isSplitViewActive && activeUtilityPane === "harmony";
  const readingSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
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
  const isOldTestament = book.testament === "Old";
  const isFocusReading = settings.focusReadingMode;
  useRegisterReaderBottomBarPanel(bottomBarPanel);
  const hasGreekLearningSurface =
    version === "greek"
      ? chapter.verses.some((verse) => Boolean(verse.greekTokens?.length))
      : showEsvInterlinear &&
        chapter.verses.some((verse) => Boolean(interlinearVerseMap?.[verse.number]?.tokens?.length));
  const hasBibleGreekAnnotationSurface =
    (version === "greek" &&
      chapter.verses.some(
        (verse) => Boolean(verse.greekTokens?.length) && Boolean(verse.translationText?.trim())
      )) ||
    (showEsvInterlinear &&
      chapter.verses.some((verse) => Boolean(interlinearVerseMap?.[verse.number]?.tokens?.length)));

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
    if (!isOldTestament && activeReaderPane === "ot-compare") {
      setActiveReaderPane("reading");
    }
  }, [activeReaderPane, isOldTestament, setActiveReaderPane]);

  useEffect(() => {
    if (!hasBibleGreekAnnotationSurface && annotationMode) {
      setAnnotationMode(false);
    }
  }, [annotationMode, hasBibleGreekAnnotationSurface]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [book.slug, chapter.chapterNumber, clearGreekLearningQuiz, version]);

  return (
    <ReaderCustomizationShell
      className={`reader-shell reader-customizable-shell${isFocusReading ? " is-focus-reading" : ""}`}
    >
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
                showBookOrderControl={!isFocusReading}
                trailingActions={
                  <>
                    {!isFocusReading && hasBibleGreekAnnotationSurface ? (
                      <button
                        className={`reader-inline-button${annotationMode ? " is-active" : ""}`}
                        onClick={() => setAnnotationMode((current) => !current)}
                        type="button"
                      >
                        {annotationMode ? "Done annotating" : "Annotate Greek"}
                      </button>
                    ) : null}
                    {!isFocusReading && hasGreekLearningSurface ? (
                      <button
                        className={`reader-inline-button${isGreekLearningMode ? " is-active" : ""}`}
                        onClick={() => setIsGreekLearningMode(!isGreekLearningMode)}
                        type="button"
                      >
                        {isGreekLearningMode ? "Stop Learning" : "Learn Greek"}
                      </button>
                    ) : null}
                    {!isFocusReading ? <ReaderCopyButton targetRef={readingSurfaceRef} /> : null}
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
                utilityMode={isFocusReading ? "menu-only" : "full"}
                view="chapter"
              />
            </div>
          </div>
        </div>
        {!isFocusReading ? <ReaderContentTabs showHarmony showOtCompare={isOldTestament} /> : null}
        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={chapter.chapterNumber} />
          </div>
        ) : activeReaderPane === "harmony" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderHarmonyPanel />
          </div>
        ) : activeReaderPane === "compare" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderComparePanel
              book={book}
              chaptersByVersion={chaptersByVersion}
              view="chapter"
            />
          </div>
        ) : activeReaderPane === "ot-compare" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderOtComparePanel
              book={book}
              focusedChapterNumber={chapter.chapterNumber}
              greekChapters={chaptersByVersion.greek ? [chaptersByVersion.greek] : null}
              masoreticChapters={masoreticChapter ? [masoreticChapter] : null}
              view="chapter"
            />
            {!isSplitViewActive && activeUtilityPane === "strongs" ? (
              <div className="reader-ot-compare-study-panel">
                <ReaderStrongsPanel />
              </div>
            ) : null}
          </div>
        ) : showNotebookInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderNotebookEditor />
          </div>
        ) : showStrongsInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderStrongsPanel />
          </div>
        ) : showSermonsInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderSermonWorkspace currentChapter={chapter} />
          </div>
        ) : showHarmonyInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderHarmonyWorkspace />
          </div>
        ) : (
          <div className="reading-surface" ref={readingSurfaceRef}>
            <VerseList
              bookSlug={book.slug}
              chapterNumber={chapter.chapterNumber}
              highlightedVerseNumber={activeHighlightedVerseNumber}
              highlightedVerseRange={activeHighlightedVerseRange}
              interlinearVerseMap={interlinearVerseMap}
              key={`${version}:${book.slug}:${chapter.chapterNumber}`}
              annotationMode={annotationMode}
              showAnnotatedGreekUndertext={settings.showAnnotatedGreekUndertext}
              showCompanionVerseTranslation={settings.showCompanionVerseTranslation}
              showCustomVerseTranslation={settings.showCustomVerseTranslation}
              showGreekGloss={settings.showGreekGloss}
              showGreekLemma={settings.showGreekLemma}
              showGreekSurface={settings.showGreekSurface}
              showGreekTransliteration={settings.showGreekTransliteration}
              showStrongs={showStrongs}
              showVerseNumbers={settings.showVerseNumbers}
              showVerseText={settings.showVerseText}
              verses={chapter.verses}
            />
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
