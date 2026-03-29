"use client";

import { useEffect, useState } from "react";

import { StrongsPopover } from "@/app/components/StrongsPopover";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { Verse } from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
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
  highlightedVerseNumber = null,
  highlightedVerseRange = null,
  showStrongs = false,
  verses
}: VerseListProps) {
  const { version } = useReaderVersion();
  const {
    addNotebookReference,
    cycleHighlight,
    getBookmark,
    getHighlight,
    openNotebook,
    openCrossReferences,
    saveReferenceToStudySet,
    toggleBookmark,
    updateBookmarkLabel,
    updateHighlightLabel
  } = useReaderWorkspace();
  const [urlHighlightedVerseNumber, setUrlHighlightedVerseNumber] = useState<number | null>(null);
  const [urlHighlightedVerseRange, setUrlHighlightedVerseRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const activeHighlightedVerseNumber = highlightedVerseNumber ?? urlHighlightedVerseNumber;
  const activeHighlightedVerseRange = highlightedVerseRange ?? urlHighlightedVerseRange;
  const [activeStrongsToken, setActiveStrongsToken] = useState<{
    rect: DOMRect;
    strongsNumbers: string[];
    text: string;
  } | null>(null);

  useEffect(() => {
    if (highlightedVerseNumber !== null || highlightedVerseRange !== null) {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const rangeStartValue = searchParams.get("highlightStart");
    const rangeEndValue = searchParams.get("highlightEnd");

    if (
      rangeStartValue &&
      rangeEndValue &&
      /^\d+$/.test(rangeStartValue) &&
      /^\d+$/.test(rangeEndValue)
    ) {
      const startVerseNumber = Number(rangeStartValue);
      const endVerseNumber = Number(rangeEndValue);

      if (startVerseNumber > 0 && endVerseNumber >= startVerseNumber) {
        setUrlHighlightedVerseRange({
          start: startVerseNumber,
          end: endVerseNumber
        });
        setUrlHighlightedVerseNumber(null);
        return;
      }
    }

    setUrlHighlightedVerseRange(null);

    const value = searchParams.get("highlight");

    if (!value || !/^\d+$/.test(value)) {
      setUrlHighlightedVerseNumber(null);
      return;
    }

    const verseNumber = Number(value);
    setUrlHighlightedVerseNumber(verseNumber > 0 ? verseNumber : null);
  }, [highlightedVerseNumber, highlightedVerseRange]);

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

  useEffect(() => {
    if (!showStrongs) {
      setActiveStrongsToken(null);
    }
  }, [showStrongs]);

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
                {showStrongs && verse.tokens?.length ? (
                  <p className="verse-text verse-text-rich">
                    {verse.tokens.map((token, index) =>
                      token.strongsNumbers?.length ? (
                        <button
                          className="strongs-token"
                          key={`${verse.number}:${index}:${token.text}`}
                          onClick={(event) =>
                            setActiveStrongsToken({
                              rect: event.currentTarget.getBoundingClientRect(),
                              strongsNumbers: token.strongsNumbers ?? [],
                              text: token.text
                            })
                          }
                          type="button"
                        >
                          <span>{token.text}</span>
                          <span className="strongs-token-numbers">
                            {token.strongsNumbers.join(" ")}
                          </span>
                        </button>
                      ) : (
                        <span className="strongs-text-segment" key={`${verse.number}:${index}:${token.text}`}>
                          {token.text}
                        </span>
                      )
                    )}
                  </p>
                ) : (
                  <p className="verse-text">{verse.text}</p>
                )}
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
                      addNotebookReference(
                        bookSlug,
                        chapterNumber,
                        createPassageReference({
                          version,
                          bookSlug,
                          chapterNumber,
                          verseNumber: verse.number,
                          sourceType: "manual"
                        })
                      );
                      openNotebook();
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
      <StrongsPopover activeToken={activeStrongsToken} onClose={() => setActiveStrongsToken(null)} />
    </>
  );
}
