"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ReaderBookAudioPlayer } from "@/app/components/ReaderBookAudioPlayer";
import { useRegisterReaderBottomBarPanel } from "@/app/components/ReaderBottomBarProvider";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderCopyButton } from "@/app/components/ReaderCopyButton";
import { ReaderHarmonyContent } from "@/app/components/ReaderHarmonyContent";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { useBookAudioSource } from "@/app/components/useBookAudioSource";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { getGospelHarmonyTemplateEvents } from "@/lib/gospel-harmony";

type HarmonyBookReaderContentProps = {
  books: BookMeta[];
  book: BookMeta;
  currentChapter: number;
  view: ReadingView;
};

export function HarmonyBookReaderContent({
  books,
  book,
  currentChapter,
  view
}: HarmonyBookReaderContentProps) {
  const { isPanelOpen, settings } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    setActiveReaderPane,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showStrongsInline = !isSplitViewActive && activeUtilityPane === "strongs";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const showHarmonyInline = !isSplitViewActive && activeUtilityPane === "harmony";
  const readingSurfaceRef = useRef<HTMLDivElement | null>(null);
  const bookAudioSource = useBookAudioSource(book.slug);
  const bottomBarPanel = useMemo(
    () => (
      <ReaderBookAudioPlayer
        audioSource={bookAudioSource}
        emptyMessage="No audio file available for the Gospel Harmony yet."
        resumeSession={{
          autoplayKey: book.slug,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: currentChapter,
          view,
          version: "esv",
          href: view === "book" ? `/read/${book.slug}` : `/read/${book.slug}/${currentChapter}`
        }}
      />
    ),
    [book.name, book.slug, bookAudioSource, currentChapter, view]
  );
  const isFocusReading = settings.focusReadingMode;
  const events = useMemo(() => getGospelHarmonyTemplateEvents(), []);
  const currentEvent = events[currentChapter - 1] ?? null;
  const visibleEvents = useMemo(() => {
    if (view === "book") {
      return events;
    }

    return currentEvent ? [currentEvent] : [];
  }, [currentEvent, events, view]);

  useEffect(() => {
    syncCurrentChapterData(book.slug, currentChapter, null);
    setActiveStudyVerseNumber(null);
  }, [book.slug, currentChapter, setActiveStudyVerseNumber, syncCurrentChapterData]);

  useEffect(() => {
    if (activeReaderPane !== "reading" && activeReaderPane !== "study-sets") {
      setActiveReaderPane("reading");
    }
  }, [activeReaderPane, setActiveReaderPane]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [book.slug, clearGreekLearningQuiz, currentChapter]);
  useRegisterReaderBottomBarPanel(bottomBarPanel);

  return (
    <ReaderCustomizationShell
      className={`reader-shell reader-customizable-shell${isFocusReading ? " is-focus-reading" : ""}`}
    >
      <ReadingSessionSync book={book.slug} chapter={currentChapter} view={view} />
      <ReaderSettingsPanel book={book} currentChapter={currentChapter} view={view} />
      <section className="reader-card reader-reading-card">
        <div className={`reader-topline${isToplineVisible ? "" : " is-hidden"}`}>
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-summary">ESV Gospel Harmony</p>
              <p className="reader-toolbar-title">
                {book.name}
                {view === "chapter" ? ` ${currentChapter}` : ""}
              </p>
              <p className="reader-toolbar-meta">
                {view === "chapter" && currentEvent ? currentEvent.title : `${events.length} events`}
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                {view === "book" ? "Continuous reading" : "Chapter view"}
              </p>
            </div>
            <div className="reader-toolbar-actions">
              <ReaderControls
                book={book}
                books={books}
                currentChapter={currentChapter}
                trailingActions={
                  <>
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
                showBookOrderControl={!isFocusReading}
                utilityMode={isFocusReading ? "menu-only" : "full"}
                view={view}
              />
            </div>
          </div>
        </div>
        {activeReaderPane === "study-sets" ? (
            <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={currentChapter} />
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
            <ReaderSermonWorkspace />
          </div>
        ) : showHarmonyInline ? (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <ReaderHarmonyWorkspace />
          </div>
        ) : (
          <div className="reading-surface reader-notebook-surface" ref={readingSurfaceRef}>
            <div className="reader-compare-panel reader-harmony-panel" role="tabpanel">
              <div className="reader-compare-header">
                <div>
                  <p className="reader-notebook-kicker">Harmony Book</p>
                  <h3 className="reader-notebook-title">Chronological Harmony of the Gospels</h3>
                  <p className="reader-ot-compare-summary">
                    Read Matthew, Mark, Luke, and John together as a single chronological book while keeping parallel references visible.
                  </p>
                </div>
              </div>

              <ReaderHarmonyContent events={visibleEvents} />
            </div>
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
