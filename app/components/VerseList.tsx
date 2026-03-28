"use client";

import { useEffect, useState } from "react";

import { useReaderNotes } from "@/app/components/ReaderNotesProvider";
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

type VerseNoteEditorProps = {
  noteId: string;
  bookSlug: string;
  chapterNumber: number;
  verse: Verse;
};

function VerseNoteEditor({ noteId, bookSlug, chapterNumber, verse }: VerseNoteEditorProps) {
  const { deleteNote, getNote, saveNote, toggleNoteEditor } = useReaderNotes();
  const existingNote = getNote(noteId);
  const [draftText, setDraftText] = useState(existingNote?.text ?? "");

  useEffect(() => {
    setDraftText(existingNote?.text ?? "");
  }, [existingNote?.text, noteId]);

  return (
    <div className="verse-note-card">
      <label className="sr-only" htmlFor={`verse-note-${noteId}`}>
        Note for verse {verse.number}
      </label>
      <textarea
        className="verse-note-input"
        id={`verse-note-${noteId}`}
        onChange={(event) => setDraftText(event.target.value)}
        placeholder={`Write a note for verse ${verse.number}...`}
        rows={4}
        value={draftText}
      />
      <div className="verse-note-actions">
        <button
          className="verse-note-action verse-note-save"
          onClick={() =>
            saveNote({
              bookSlug,
              chapterNumber,
              verseNumber: verse.number,
              text: draftText
            })
          }
          type="button"
        >
          Save note
        </button>
        {existingNote ? (
          <button
            className="verse-note-action verse-note-delete"
            onClick={() => {
              deleteNote(noteId);
              setDraftText("");
            }}
            type="button"
          >
            Delete
          </button>
        ) : null}
        <button
          className="verse-note-action"
          onClick={() => toggleNoteEditor(noteId)}
          type="button"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function VerseList({
  bookSlug,
  chapterNumber,
  highlightedVerseNumber = null,
  highlightedVerseRange = null,
  verses
}: VerseListProps) {
  const { expandedNoteId, getNote, getNoteId, toggleNoteEditor } = useReaderNotes();
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
        const noteId = getNoteId(bookSlug, chapterNumber, verse.number);
        const note = getNote(noteId);
        const isExpanded = expandedNoteId === noteId;
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
              <div className="verse-note-row">
                <button
                  className="verse-note-toggle"
                  onClick={() => toggleNoteEditor(noteId)}
                  type="button"
                >
                  {note ? (isExpanded ? "Hide note" : "Edit note") : "Add note"}
                </button>
                {note ? <span className="verse-note-status">Saved note</span> : null}
              </div>
              {isExpanded ? (
                <VerseNoteEditor
                  bookSlug={bookSlug}
                  chapterNumber={chapterNumber}
                  noteId={noteId}
                  verse={verse}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
