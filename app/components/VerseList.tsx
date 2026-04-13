"use client";

import { useEffect } from "react";

import { GreekInterlinearLine } from "@/app/components/GreekInterlinearLine";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseTranslationEditor } from "@/app/components/VerseTranslationEditor";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import type { EsvInterlinearDisplayVerse, Verse } from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
  interlinearVerseMap?: Record<number, EsvInterlinearDisplayVerse>;
  showInterlinearOnly?: boolean;
  showVerseText?: boolean;
  showCustomVerseTranslation?: boolean;
  showGreekSurface?: boolean;
  showGreekLemma?: boolean;
  showGreekTransliteration?: boolean;
  showGreekGloss?: boolean;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
  showStrongs?: boolean;
  verses: Verse[];
};

export function VerseList({
  bookSlug,
  chapterNumber,
  interlinearVerseMap,
  showInterlinearOnly = false,
  showVerseText,
  showCustomVerseTranslation = true,
  showGreekSurface = true,
  showGreekLemma = true,
  showGreekTransliteration = true,
  showGreekGloss = true,
  highlightedVerseNumber,
  highlightedVerseRange,
  showStrongs = false,
  verses
}: VerseListProps) {
  const { version } = useReaderVersion();
  const {
    cycleHighlight,
    getBookmark,
    getHighlight,
    openGreekDictionary,
    openNotebook,
    openCrossReferences,
    openStrongs,
    saveReferenceToStudySet,
    toggleBookmark,
    updateBookmarkLabel,
    updateHighlightLabel
  } = useReaderWorkspace();
  const activeHighlightedVerseNumber = highlightedVerseNumber ?? null;
  const activeHighlightedVerseRange = highlightedVerseRange ?? null;
  const shouldShowVerseText = showVerseText ?? !showInterlinearOnly;
  const shouldShowGreekTokens =
    showGreekSurface ||
    showGreekLemma ||
    showGreekTransliteration ||
    showGreekGloss;

  useEffect(() => {
    const scrollTargetVerseNumber =
      activeHighlightedVerseRange?.start ?? activeHighlightedVerseNumber ?? null;

    if (!scrollTargetVerseNumber) {
      return;
    }

    const element = document.getElementById(
      `verse-${bookSlug}-${chapterNumber}-${scrollTargetVerseNumber}`
    );

    element?.scrollIntoView?.({ block: "center" });
  }, [activeHighlightedVerseNumber, activeHighlightedVerseRange, bookSlug, chapterNumber]);

  return (
    <>
      <div className="verse-stack">
        {verses.map((verse) => {
          const highlight = getHighlight(bookSlug, chapterNumber, verse.number);
          const bookmark = getBookmark(bookSlug, chapterNumber, verse.number);
          const isHighlighted =
            activeHighlightedVerseRange !== null
              ? verse.number >= activeHighlightedVerseRange.start &&
                verse.number <= activeHighlightedVerseRange.end
              : activeHighlightedVerseNumber === verse.number;

          return (
            <div
              className={`verse-row${isHighlighted ? " is-highlighted" : ""}${
                highlight ? ` has-study-highlight has-study-highlight-${highlight.color}` : ""
              }`}
              id={`verse-${bookSlug}-${chapterNumber}-${verse.number}`}
              key={verse.number}
            >
              <span className="verse-number" aria-hidden="true">
                {verse.number}
              </span>
              <div className="verse-content">
                {shouldShowVerseText
                  ? showStrongs && verse.tokens?.length ? (
                      <VerseTextContent
                        className="verse-text verse-text-rich"
                        onOpenStrongs={(strongsNumbers) =>
                          openStrongs(strongsNumbers, strongsNumbers.join(" "))
                        }
                        showStrongs
                        verse={verse}
                      />
                    ) : (
                      <VerseTextContent className="verse-text" verse={verse} />
                    )
                  : null}
                {interlinearVerseMap?.[verse.number] && shouldShowGreekTokens ? (
                  <GreekInterlinearLine
                    bookSlug={bookSlug}
                    chapterNumber={chapterNumber}
                    onOpenGreekDictionary={(token) =>
                      openGreekDictionary({
                        strongs: token.strongs,
                        lemma: token.lemma,
                        label: token.lemma,
                        selectedForm: token.surface,
                        selectedFormMorphology: token.morphology ?? null,
                        matchedQuery: token.surface
                      })
                    }
                    showGloss={showGreekGloss}
                    showLemma={showGreekLemma}
                    showSurface={showGreekSurface}
                    showTransliteration={showGreekTransliteration}
                    verse={interlinearVerseMap[verse.number]}
                  />
                ) : null}
                {showCustomVerseTranslation ? (
                  <VerseTranslationEditor
                    bookSlug={bookSlug}
                    chapterNumber={chapterNumber}
                    verseNumber={verse.number}
                  />
                ) : null}
                <div className="verse-study-actions">
                  <button
                    className={`reader-inline-button verse-study-button${
                      highlight ? ` is-${highlight.color}` : ""
                    }`}
                    onClick={() => cycleHighlight(bookSlug, chapterNumber, verse.number)}
                    type="button"
                  >
                    {highlight ? `Highlight: ${highlight.color}` : "Highlight"}
                  </button>
                  <button
                    className={`reader-inline-button verse-study-button${
                      bookmark ? " is-bookmarked" : ""
                    }`}
                    onClick={() => toggleBookmark(bookSlug, chapterNumber, verse.number)}
                    type="button"
                  >
                    {bookmark ? "Bookmarked" : "Bookmark"}
                  </button>
                  <button
                    className="reader-inline-button verse-study-button"
                    onClick={() => openCrossReferences(verse.number)}
                    type="button"
                  >
                    Cross refs
                  </button>
                  <button
                    className="reader-inline-button verse-study-button"
                    onClick={() => {
                      openNotebook(
                        createPassageReference({
                          version,
                          bookSlug,
                          chapterNumber,
                          verseNumber: verse.number,
                          sourceType: "manual"
                        })
                      );
                    }}
                    type="button"
                  >
                    To notebook
                  </button>
                  <button
                    className="reader-inline-button verse-study-button"
                    onClick={() => {
                      const setName = window.prompt(
                        "Add this verse to which study set?",
                        "Current study"
                      );

                      if (!setName) {
                        return;
                      }

                      saveReferenceToStudySet(
                        setName,
                        createPassageReference({
                          version,
                          bookSlug,
                          chapterNumber,
                          verseNumber: verse.number,
                          sourceType: "manual"
                        })
                      );
                    }}
                    type="button"
                  >
                    Save
                  </button>
                </div>
                {highlight || bookmark ? (
                  <div className="verse-study-meta">
                    {highlight ? (
                      <div className="verse-study-chip">
                        <span>{highlight.label || `Highlighted ${highlight.color}`}</span>
                        <button
                          className="reader-inline-button"
                          onClick={() => {
                            const nextLabel = window.prompt(
                              "Highlight label",
                              highlight.label
                            );

                            if (nextLabel !== null) {
                              updateHighlightLabel(
                                bookSlug,
                                chapterNumber,
                                verse.number,
                                nextLabel
                              );
                            }
                          }}
                          type="button"
                        >
                          Label
                        </button>
                      </div>
                    ) : null}
                    {bookmark ? (
                      <div className="verse-study-chip">
                        <span>{bookmark.label || "Bookmarked verse"}</span>
                        <button
                          className="reader-inline-button"
                          onClick={() => {
                            const nextLabel = window.prompt(
                              "Bookmark label",
                              bookmark.label
                            );

                            if (nextLabel !== null) {
                              updateBookmarkLabel(
                                bookSlug,
                                chapterNumber,
                                verse.number,
                                nextLabel
                              );
                            }
                          }}
                          type="button"
                        >
                          Label
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
