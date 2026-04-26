"use client";

import { useEffect, useMemo, useState } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderHarmonyContent } from "@/app/components/ReaderHarmonyContent";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import type { BookMeta, ReadingView } from "@/lib/bible/types";
import { getGospelHarmonyTemplateEvents } from "@/lib/gospel-harmony";

type HarmonyBookReaderContentProps = {
  books: BookMeta[];
  book: BookMeta;
  view: ReadingView;
};

export function HarmonyBookReaderContent({
  books,
  book,
  view
}: HarmonyBookReaderContentProps) {
  const { isPanelOpen } = useReaderCustomization();
  const { canCollapseSplitPane, collapseSplitPane, isSplitViewActive } = useLookup();
  const {
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    setActiveReaderPane,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  } = useReaderWorkspace();
  const [selectedEventId, setSelectedEventId] = useState("all");
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const showNotebookInline = !isSplitViewActive && activeUtilityPane === "notebook";
  const showStrongsInline = !isSplitViewActive && activeUtilityPane === "strongs";
  const showSermonsInline = !isSplitViewActive && activeUtilityPane === "sermons";
  const showHarmonyInline = !isSplitViewActive && activeUtilityPane === "harmony";
  const events = useMemo(() => getGospelHarmonyTemplateEvents(), []);
  const visibleEvents = useMemo(
    () =>
      selectedEventId === "all"
        ? events
        : events.filter((event) => event.id === selectedEventId),
    [events, selectedEventId]
  );

  useEffect(() => {
    syncCurrentChapterData(book.slug, 1, null);
    setActiveStudyVerseNumber(null);
  }, [book.slug, setActiveStudyVerseNumber, syncCurrentChapterData]);

  useEffect(() => {
    if (activeReaderPane !== "reading" && activeReaderPane !== "study-sets") {
      setActiveReaderPane("reading");
    }
  }, [activeReaderPane, setActiveReaderPane]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [book.slug, clearGreekLearningQuiz]);

  useEffect(() => {
    if (selectedEventId === "all") {
      return;
    }

    if (!events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId("all");
    }
  }, [events, selectedEventId]);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={1} view={view} />
      <ReaderSettingsPanel book={book} currentChapter={1} view={view} />
      <section className="reader-card reader-reading-card">
        <div className={`reader-topline${isToplineVisible ? "" : " is-hidden"}`}>
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-summary">ESV Gospel Harmony</p>
              <p className="reader-toolbar-title">{book.name}</p>
              <p className="reader-toolbar-meta">
                {events.length} events
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                {view === "book" ? "Continuous reading" : "Harmony reading"}
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
                view={view}
              />
            </div>
          </div>
        </div>

        {activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={1} />
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
            <ReaderSermonWorkspace currentChapter={null} />
          </div>
        ) : showHarmonyInline ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderHarmonyWorkspace />
          </div>
        ) : (
          <div className="reading-surface reader-notebook-surface">
            <div className="reader-compare-panel reader-harmony-panel" role="tabpanel">
              <div className="reader-compare-header">
                <div>
                  <p className="reader-notebook-kicker">Harmony Book</p>
                  <h3 className="reader-notebook-title">Chronological Harmony of the Gospels</h3>
                  <p className="reader-ot-compare-summary">
                    Read Matthew, Mark, Luke, and John together as a single chronological book while keeping parallel references visible.
                  </p>
                </div>

                <label className="reader-settings-field reader-compare-select" htmlFor="harmony-book-event-select">
                  <span>Event</span>
                  <select
                    aria-label="Harmony event"
                    id="harmony-book-event-select"
                    onChange={(event) => setSelectedEventId(event.target.value)}
                    value={selectedEventId}
                  >
                    <option value="all">All events</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.eventNumber}. {event.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <ReaderHarmonyContent events={visibleEvents} />
            </div>
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
