"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { HebrewVerseTextContent } from "@/app/components/HebrewVerseTextContent";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { BookMeta, Chapter, ReadingView, Verse } from "@/lib/bible/types";
import { formatBookLabel } from "@/lib/study-workspace";

type ReaderOtComparePanelProps = {
  book: BookMeta;
  view: ReadingView;
  greekChapters: Chapter[] | null;
  masoreticChapters: Chapter[] | null;
  focusedChapterNumber?: number | null;
};

type OtCompareRow = {
  chapterNumber: number;
  verseNumber: number;
  greekVerse: Verse | null;
  masoreticVerse: Verse | null;
};

type OtCompareSection = {
  chapterNumber: number;
  rows: OtCompareRow[];
};

type LazyOtCompareSectionProps = {
  bookSlug: string;
  section: OtCompareSection;
  initialRender: boolean;
  isFocused: boolean;
};

function buildCompareRows(greekChapter: Chapter | null, masoreticChapter: Chapter | null): OtCompareRow[] {
  const verseNumbers = Array.from(
    new Set([
      ...(greekChapter?.verses.map((verse) => verse.number) ?? []),
      ...(masoreticChapter?.verses.map((verse) => verse.number) ?? [])
    ])
  ).sort((left, right) => left - right);

  return verseNumbers.map((verseNumber) => ({
    chapterNumber: greekChapter?.chapterNumber ?? masoreticChapter?.chapterNumber ?? 1,
    verseNumber,
    greekVerse: greekChapter?.verses.find((verse) => verse.number === verseNumber) ?? null,
    masoreticVerse: masoreticChapter?.verses.find((verse) => verse.number === verseNumber) ?? null
  }));
}

function LazyOtCompareSection({
  bookSlug,
  section,
  initialRender,
  isFocused
}: LazyOtCompareSectionProps) {
  const { settings } = useReaderCustomization();
  const { activeStudyVerseNumber, openGreekDictionaryInCurrentPane, openStrongsInCurrentPane } =
    useReaderWorkspace();
  const [shouldRenderSection, setShouldRenderSection] = useState(initialRender);
  const sectionRef = useRef<HTMLElement | null>(null);
  const greekPaneBodyRef = useRef<HTMLDivElement | null>(null);
  const hebrewPaneBodyRef = useRef<HTMLDivElement | null>(null);
  const syncingPaneScrollRef = useRef(false);

  const releasePaneScrollLock = () => {
    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        syncingPaneScrollRef.current = false;
      });
      return;
    }

    setTimeout(() => {
      syncingPaneScrollRef.current = false;
    }, 0);
  };

  const syncPaneScroll = (source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (!target || syncingPaneScrollRef.current) {
      return;
    }

    syncingPaneScrollRef.current = true;
    target.scrollTop = source.scrollTop;
    releasePaneScrollLock();
  };

  useEffect(() => {
    if (initialRender) {
      setShouldRenderSection(true);
    }
  }, [initialRender]);

  useEffect(() => {
    if (shouldRenderSection) {
      return;
    }

    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRenderSection(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderSection(true);
        }
      },
      { rootMargin: "1400px 0px" }
    );

    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldRenderSection]);

  return (
    <section
      className="reader-compare-section reader-ot-compare-section"
      id={`ot-compare-chapter-${bookSlug}-${section.chapterNumber}`}
      ref={sectionRef}
    >
      <div className="reader-compare-section-header">
        <h4>Chapter {section.chapterNumber}</h4>
      </div>
      {shouldRenderSection ? (
        <div className="reader-compare-scroll" aria-label="LXX and Masoretic compare">
          <div className="reader-ot-compare-split">
            <section
              aria-label="LXX Greek compare pane"
              className="reader-ot-compare-pane reader-ot-compare-pane-greek"
            >
              <header className="reader-ot-compare-pane-header">
                <span>LXX Greek</span>
              </header>
              <div
                aria-label="LXX Greek compare scroller"
                className="reader-ot-compare-pane-body"
                onScroll={(event) =>
                  syncPaneScroll(event.currentTarget, hebrewPaneBodyRef.current)
                }
                ref={greekPaneBodyRef}
              >
                <div className="reader-ot-compare-pane-rows">
                  {section.rows.map((row) => (
                    <article
                      className={`reader-ot-compare-pane-row${
                        activeStudyVerseNumber === row.verseNumber && isFocused ? " is-active" : ""
                      }`}
                      key={`greek:${section.chapterNumber}:${row.verseNumber}`}
                    >
                      <span className="reader-compare-verse-number">{row.verseNumber}</span>
                      <div className="reader-compare-cell reader-ot-compare-cell">
                        <GreekVerseTextContent
                          className="verse-text verse-text-greek reader-compare-text"
                          displayMode="stacked"
                          onOpenGreekDictionary={openGreekDictionaryInCurrentPane}
                          showExpandedGrammarDetails={settings.showExpandedGreekGrammarCards}
                          showGrammarCards={settings.showGreekGrammarCards}
                          verse={row.greekVerse}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
            <section
              aria-label="Masoretic Hebrew compare pane"
              className="reader-ot-compare-pane reader-ot-compare-pane-hebrew"
            >
              <header className="reader-ot-compare-pane-header">
                <span>Masoretic Hebrew</span>
              </header>
              <div
                aria-label="Masoretic Hebrew compare scroller"
                className="reader-ot-compare-pane-body"
                onScroll={(event) =>
                  syncPaneScroll(event.currentTarget, greekPaneBodyRef.current)
                }
                ref={hebrewPaneBodyRef}
              >
                <div className="reader-ot-compare-pane-rows">
                  {section.rows.map((row) => (
                    <article
                      className={`reader-ot-compare-pane-row${
                        activeStudyVerseNumber === row.verseNumber && isFocused ? " is-active" : ""
                      }`}
                      key={`hebrew:${section.chapterNumber}:${row.verseNumber}`}
                    >
                      <span className="reader-compare-verse-number">{row.verseNumber}</span>
                      <div className="reader-compare-cell reader-ot-compare-cell">
                        <HebrewVerseTextContent
                          className="verse-text verse-text-hebrew reader-compare-text"
                          onOpenStrongs={(strongsNumbers, label) =>
                            openStrongsInCurrentPane(strongsNumbers, label ?? strongsNumbers.join(" "))
                          }
                          verse={row.masoreticVerse}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div
          aria-label={`Loading OT compare chapter ${section.chapterNumber}`}
          className="book-section-placeholder"
        />
      )}
    </section>
  );
}

export function ReaderOtComparePanel({
  book,
  view,
  greekChapters,
  masoreticChapters,
  focusedChapterNumber = null
}: ReaderOtComparePanelProps) {
  const sections = useMemo<OtCompareSection[]>(() => {
    if (!greekChapters?.length || !masoreticChapters?.length) {
      return [];
    }

    if (view === "chapter") {
      const greekChapter = greekChapters[0] ?? null;
      const masoreticChapter = masoreticChapters[0] ?? null;

      return [
        {
          chapterNumber: greekChapter?.chapterNumber ?? masoreticChapter?.chapterNumber ?? 1,
          rows: buildCompareRows(greekChapter, masoreticChapter)
        }
      ];
    }

    const chapterNumbers = Array.from(
      new Set([
        ...greekChapters.map((chapter) => chapter.chapterNumber),
        ...masoreticChapters.map((chapter) => chapter.chapterNumber)
      ])
    ).sort((left, right) => left - right);

    return chapterNumbers.map((chapterNumber) => ({
      chapterNumber,
      rows: buildCompareRows(
        greekChapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null,
        masoreticChapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null
      )
    }));
  }, [greekChapters, masoreticChapters, view]);

  useEffect(() => {
    if (view !== "book" || !focusedChapterNumber) {
      return;
    }

    const element = document.getElementById(`ot-compare-chapter-${book.slug}-${focusedChapterNumber}`);
    element?.scrollIntoView?.({ block: "start" });
  }, [book.slug, focusedChapterNumber, view]);

  if (book.testament !== "Old") {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">OT compare is only available in Old Testament passages.</p>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">
          This passage is missing LXX or Masoretic data for the OT compare tool.
        </p>
      </div>
    );
  }

  return (
    <div className="reader-compare-panel reader-ot-compare-panel" role="tabpanel">
      <div className="reader-compare-header">
        <div>
          <p className="search-tray-kicker">OT Textual Compare</p>
          <h3 className="search-tray-title">
            {view === "chapter"
              ? `${formatBookLabel(book.slug)} ${sections[0]?.chapterNumber ?? 1}`
              : formatBookLabel(book.slug)}
          </h3>
          <p className="reader-ot-compare-summary">LXX Greek against the Masoretic Hebrew text.</p>
        </div>
      </div>
      {sections.map((section, index) => (
        <LazyOtCompareSection
          bookSlug={book.slug}
          initialRender={view === "chapter" || index < 2 || section.chapterNumber === focusedChapterNumber}
          isFocused={view === "chapter" || section.chapterNumber === focusedChapterNumber}
          key={section.chapterNumber}
          section={section}
        />
      ))}
    </div>
  );
}
