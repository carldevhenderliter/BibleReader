"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type { VerseNote } from "@/lib/bible/types";
import {
  VERSE_NOTES_STORAGE_KEY,
  createVerseNote,
  getVerseNoteId,
  normalizeVerseNotesStorage,
  type VerseNotesStorage
} from "@/lib/verse-notes";

type ReaderNotesContextValue = {
  expandedNoteId: string | null;
  getNote: (noteId: string) => VerseNote | null;
  getNoteId: (bookSlug: string, chapterNumber: number, verseNumber: number) => string;
  saveNote: (input: { bookSlug: string; chapterNumber: number; verseNumber: number; text: string }) => void;
  deleteNote: (noteId: string) => void;
  toggleNoteEditor: (noteId: string) => void;
};

const ReaderNotesContext = createContext<ReaderNotesContextValue | null>(null);

export function ReaderNotesProvider({ children }: PropsWithChildren) {
  const { version } = useReaderVersion();
  const [notes, setNotes] = useState<VerseNotesStorage>({});
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VERSE_NOTES_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setNotes(normalizeVerseNotesStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(VERSE_NOTES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(VERSE_NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    setExpandedNoteId(null);
  }, [version]);

  const value = useMemo<ReaderNotesContextValue>(
    () => ({
      expandedNoteId,
      getNote: (noteId) => notes[noteId] ?? null,
      getNoteId: (bookSlug, chapterNumber, verseNumber) =>
        getVerseNoteId({ version, bookSlug, chapterNumber, verseNumber }),
      saveNote: ({ bookSlug, chapterNumber, verseNumber, text }) => {
        const trimmedText = text.trim();
        const noteId = getVerseNoteId({ version, bookSlug, chapterNumber, verseNumber });

        if (trimmedText.length === 0) {
          setNotes((current) => {
            if (!(noteId in current)) {
              return current;
            }

            const next = { ...current };
            delete next[noteId];
            return next;
          });
          setExpandedNoteId(null);
          return;
        }

        setNotes((current) => ({
          ...current,
          [noteId]: createVerseNote({
            version,
            bookSlug,
            chapterNumber,
            verseNumber,
            text: trimmedText
          })
        }));
        setExpandedNoteId(noteId);
      },
      deleteNote: (noteId) => {
        setNotes((current) => {
          if (!(noteId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[noteId];
          return next;
        });

        setExpandedNoteId((current) => (current === noteId ? null : current));
      },
      toggleNoteEditor: (noteId) => {
        setExpandedNoteId((current) => (current === noteId ? null : noteId));
      }
    }),
    [expandedNoteId, notes, version]
  );

  return <ReaderNotesContext.Provider value={value}>{children}</ReaderNotesContext.Provider>;
}

export function useReaderNotes() {
  const context = useContext(ReaderNotesContext);

  if (!context) {
    throw new Error("useReaderNotes must be used within ReaderNotesProvider.");
  }

  return context;
}
