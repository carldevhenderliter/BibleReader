"use client";

import { useEffect, useState } from "react";

import type { Verse } from "@/lib/bible/types";

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
  verses: Verse[];
};

export function VerseList({
  bookSlug,
  chapterNumber,
  highlightedVerseNumber = null,
  highlightedVerseRange = null,
  verses
}: VerseListProps) {
  const [urlHighlightedVerseNumber, setUrlHighlightedVerseNumber] = useState<number | null>(null);
  const [urlHighlightedVerseRange, setUrlHighlightedVerseRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const activeHighlightedVerseNumber = highlightedVerseNumber ?? urlHighlightedVerseNumber;
  const activeHighlightedVerseRange = highlightedVerseRange ?? urlHighlightedVerseRange;

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

  return (
    <div className="verse-stack">
      {verses.map((verse) => {
        const isHighlighted =
          activeHighlightedVerseRange !== null
            ? verse.number >= activeHighlightedVerseRange.start &&
              verse.number <= activeHighlightedVerseRange.end
            : activeHighlightedVerseNumber === verse.number;

        return (
          <div
            className={`verse-row${isHighlighted ? " is-highlighted" : ""}`}
            id={`verse-${bookSlug}-${chapterNumber}-${verse.number}`}
            key={verse.number}
          >
            <span className="verse-number" aria-hidden="true">
              {verse.number}
            </span>
            <div className="verse-content">
              <p className="verse-text">{verse.text}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
