"use client";

import { useEffect, useState } from "react";

import { useReaderNotes } from "@/app/components/ReaderNotesProvider";
import type { Verse } from "@/lib/bible/types";

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
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

export function VerseList({ bookSlug, chapterNumber, verses }: VerseListProps) {
  const { expandedNoteId, getNote, getNoteId, toggleNoteEditor } = useReaderNotes();

  return (
    <div className="verse-stack">
      {verses.map((verse) => {
        const noteId = getNoteId(bookSlug, chapterNumber, verse.number);
        const note = getNote(noteId);
        const isExpanded = expandedNoteId === noteId;

        return (
          <div className="verse-row" key={verse.number}>
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
