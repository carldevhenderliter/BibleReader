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
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
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
import { useLookup } from "@/app/components/LookupProvider";
import { useLocationSearch } from "@/app/components/useLocationSearch";
import { useBookAudioSource } from "@/app/components/useBookAudioSource";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type {
  BookMeta,
  BundledBibleVersion,
  BundledBookChapterMap,
  Chapter,
  EsvInterlinearDisplayChapter,
  EsvInterlinearDisplayVerse
} from "@/lib/bible/types";
import { getBookHref } from "@/lib/bible/utils";
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
  forceRender: boolean;
  initialRender: boolean;
  highlightedVerseNumber: number | null;
  highlightedVerseRange: {
    start: number;
    end: number;
  } | null;
  interlinearVerseMap?: Record<number, EsvInterlinearDisplayVerse>;
  showCompanionVerseTranslation: boolean;
  showAnnotatedGreekUndertext: boolean;
  showCustomVerseTranslation: boolean;
  showGreekGloss: boolean;
  showGreekLemma: boolean;
  showGreekSurface: boolean;
  showGreekTransliteration: boolean;
  showStrongs: boolean;
  showChapterHeadings: boolean;
  showVerseNumbers: boolean;
  showVerseText: boolean;
  onRenderChapter: (chapterNumber: number) => void;
  annotationMode: boolean;
  version: string;
};

function LazyBookChapterSection({
  bookSlug,
  chapter,
  forceRender,
  initialRender,
  highlightedVerseNumber,
  highlightedVerseRange,
  interlinearVerseMap,
  showCompanionVerseTranslation,
  showAnnotatedGreekUndertext,
  showCustomVerseTranslation,
  showGreekGloss,
  showGreekLemma,
  showGreekSurface,
  showGreekTransliteration,
  showStrongs,
  showChapterHeadings,
  showVerseNumbers,
  showVerseText,
  onRenderChapter,
  annotationMode,
  version
}: LazyBookChapterSectionProps) {
  const [shouldRenderChapter, setShouldRenderChapter] = useState(initialRender || forceRender);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialRender || forceRender) {
      setShouldRenderChapter(true);
    }
  }, [forceRender, initialRender]);

  useEffect(() => {
    if (!shouldRenderChapter) {
      return;
    }

    onRenderChapter(chapter.chapterNumber);
  }, [chapter.chapterNumber, onRenderChapter, shouldRenderChapter]);

  useEffect(() => {
    if (shouldRenderChapter || forceRender) {
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
  }, [forceRender, shouldRenderChapter]);

  return (
    <section
      className="book-section"
      id={`chapter-${bookSlug}-${chapter.chapterNumber}`}
      key={chapter.chapterNumber}
      ref={sectionRef}
    >
      {showChapterHeadings ? (
        <div className="book-section-header">
          <h2 className="book-section-title">Chapter {chapter.chapterNumber}</h2>
          <p className="book-section-subtitle">{chapter.verses.length} verses</p>
        </div>
      ) : null}
      {shouldRenderChapter ? (
        <VerseList
          bookSlug={bookSlug}
          chapterNumber={chapter.chapterNumber}
          highlightedVerseNumber={highlightedVerseNumber}
          highlightedVerseRange={highlightedVerseRange}
          interlinearVerseMap={interlinearVerseMap}
          key={`${version}:${bookSlug}:${chapter.chapterNumber}`}
          annotationMode={annotationMode}
          showAnnotatedGreekUndertext={showAnnotatedGreekUndertext}
          showCompanionVerseTranslation={showCompanionVerseTranslation}
          showCustomVerseTranslation={showCustomVerseTranslation}
          showGreekGloss={showGreekGloss}
          showGreekLemma={showGreekLemma}
          showGreekSurface={showGreekSurface}
          showGreekTransliteration={showGreekTransliteration}
          showStrongs={showStrongs}
          showVerseNumbers={showVerseNumbers}
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
  const router = useRouter();
  const locationSearch = useLocationSearch();
  const { version, setVersion } = useReaderVersion();
  const { isPanelOpen, settings } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    isGreekLearningMode,
    setActiveReaderPane,
    setActiveStudyVerseNumber,
    setIsGreekLearningMode,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const fallbackVersion =
    (Object.entries(chaptersByVersion).find(([, candidateChapters]) => Boolean(candidateChapters?.length))?.[0] as
      | BundledBibleVersion
      | undefined) ?? version;
  const effectiveVersion = chaptersByVersion[version]?.length ? version : fallbackVersion;
  const isStandaloneGreekVersion =
    effectiveVersion === "greek" || effectiveVersion === "tr";
  const chapters = chaptersByVersion[effectiveVersion] ?? Object.values(chaptersByVersion)[0] ?? [];
  const showStrongs = effectiveVersion === "kjv" && settings.showStrongs;
  const showEsvInterlinear =
    effectiveVersion === "esv" &&
    book.testament === "New" &&
    settings.showEsvInterlinear &&
    esvInterlinearBook !== null;
  const showKjvGreekCompanion =
    effectiveVersion === "kjv" &&
    book.testament === "New" &&
    settings.showStrongs &&
    esvInterlinearBook !== null;
  const interlinearByChapter = showEsvInterlinear || showKjvGreekCompanion
    ? new Map(
        (esvInterlinearBook ?? []).map((chapter) => [
          chapter.chapterNumber,
          Object.fromEntries(chapter.verses.map((verse) => [verse.number, verse]))
        ])
      )
    : null;
  const versionBadge = getBibleVersionBadge(effectiveVersion);
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

    router.push(getBookHref(nextBook.slug, effectiveVersion));
  }, [book.slug, bookAudioSource, books, effectiveVersion, router]);
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
          chapter: 1,
          view: "book",
          version: effectiveVersion,
          href: getBookHref(book.slug, effectiveVersion)
        }}
      />
    ),
    [
      book.name,
      book.slug,
      bookAudioSource,
      effectiveVersion,
      handleBookAudioEnded,
      nextAudioBook?.name
    ]
  );
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showStrongsInline = !isSplitViewActive && activeUtilityPane === "strongs";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const showHarmonyInline = !isSplitViewActive && activeUtilityPane === "harmony";
  const readingSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [annotationMode, setAnnotationMode] = useState(false);
  useRegisterReaderBottomBarPanel(bottomBarPanel);
  const searchParams = new URLSearchParams(locationSearch);
  const forceRenderAllChapters = settings.disableLazyLoading;
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
  const activeHighlightedChapterNumber = highlightedChapterNumber ?? urlHighlightedChapterNumber;
  const activeHighlightedVerseRange = highlightedVerseRange ?? urlHighlightedVerseRange;
  const activeHighlightedVerseNumber =
    activeHighlightedVerseRange !== null ? null : highlightedVerseNumber ?? urlHighlightedVerseNumber;
  const activeFocusedChapterNumber =
    activeHighlightedChapterNumber && activeHighlightedChapterNumber <= book.chapterCount
      ? activeHighlightedChapterNumber
      : focusedChapterNumber && focusedChapterNumber <= book.chapterCount
        ? focusedChapterNumber
        : urlFocusedChapterNumber && urlFocusedChapterNumber <= book.chapterCount
          ? urlFocusedChapterNumber
          : 1;
  const isFocusReading = settings.focusReadingMode;
  const focusedChapter =
    chapters.find((chapter) => chapter.chapterNumber === activeFocusedChapterNumber) ??
    chapters[0] ??
    null;
  const isOldTestament = book.testament === "Old";
  const hasGreekLearningSurface =
    (isStandaloneGreekVersion &&
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
    (isStandaloneGreekVersion &&
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
  const initialRenderedChapterNumbers = useMemo(
    () =>
      forceRenderAllChapters
        ? chapters.map((chapter) => chapter.chapterNumber)
        : chapters
            .filter(
              (chapter) =>
                Math.abs(chapter.chapterNumber - activeFocusedChapterNumber) <= 1 ||
                chapter.chapterNumber === activeHighlightedChapterNumber
            )
            .map((chapter) => chapter.chapterNumber),
    [activeFocusedChapterNumber, activeHighlightedChapterNumber, chapters, forceRenderAllChapters]
  );
  const [renderedChapterNumbers, setRenderedChapterNumbers] = useState<number[]>(
    initialRenderedChapterNumbers
  );

  useEffect(() => {
    if (effectiveVersion !== version) {
      setVersion(effectiveVersion);
    }
  }, [effectiveVersion, setVersion, version]);

  const handleRenderChapter = useCallback((chapterNumber: number) => {
    setRenderedChapterNumbers((current) =>
      current.includes(chapterNumber)
        ? current
        : [...current, chapterNumber].sort((left, right) => left - right)
    );
  }, []);

  useEffect(() => {
    setRenderedChapterNumbers(initialRenderedChapterNumbers);
  }, [initialRenderedChapterNumbers]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [book.slug, clearGreekLearningQuiz, effectiveVersion, renderedChapterNumbers]);

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
    <ReaderCustomizationShell
      className={`reader-shell reader-customizable-shell${isFocusReading ? " is-focus-reading" : ""}`}
    >
      <ReadingSessionSync book={book.slug} chapter={1} view="book" version={effectiveVersion} />
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
                view="book"
              />
            </div>
          </div>
        </div>
        {!isFocusReading ? <ReaderContentTabs showHarmony showOtCompare={isOldTestament} /> : null}
        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={1} />
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
              focusedChapterNumber={activeFocusedChapterNumber}
              view="book"
            />
          </div>
        ) : activeReaderPane === "ot-compare" ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
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
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderNotebookEditor />
          </div>
        ) : showStrongsInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderStrongsPanel />
          </div>
        ) : showSermonsInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderSermonWorkspace currentChapter={chapters[0] ?? null} />
          </div>
        ) : showHarmonyInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderHarmonyWorkspace />
          </div>
        ) : (
          <div className="reading-surface chapter-stack" ref={readingSurfaceRef}>
            {chapters.map((chapter) => (
              <LazyBookChapterSection
                annotationMode={annotationMode}
                bookSlug={book.slug}
                chapter={chapter}
                forceRender={forceRenderAllChapters}
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
                  forceRenderAllChapters ||
                  Math.abs(chapter.chapterNumber - activeFocusedChapterNumber) <= 1 ||
                  chapter.chapterNumber === activeHighlightedChapterNumber
                }
                interlinearVerseMap={interlinearByChapter?.get(chapter.chapterNumber)}
                key={chapter.chapterNumber}
                onRenderChapter={handleRenderChapter}
                showCompanionVerseTranslation={settings.showCompanionVerseTranslation}
                showAnnotatedGreekUndertext={settings.showAnnotatedGreekUndertext}
                showCustomVerseTranslation={settings.showCustomVerseTranslation}
                showGreekGloss={settings.showGreekGloss}
                showGreekLemma={settings.showGreekLemma}
                showGreekSurface={settings.showGreekSurface}
                showGreekTransliteration={settings.showGreekTransliteration}
                showStrongs={showStrongs}
                showChapterHeadings={settings.showChapterHeadings}
                showVerseNumbers={settings.showVerseNumbers}
                showVerseText={settings.showVerseText}
                version={effectiveVersion}
              />
            ))}
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
