import { VERSE_NOTES_STORAGE_KEY } from "@/lib/bible/constants";
import type { BundledBibleVersion, VerseNote } from "@/lib/bible/types";

export { VERSE_NOTES_STORAGE_KEY };

export type VerseNotesStorage = Record<string, VerseNote>;

type CreateVerseNoteInput = {
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
};

export function getVerseNoteId({
  version,
  bookSlug,
  chapterNumber,
  verseNumber
}: Omit<CreateVerseNoteInput, "text">): string {
  return `${version}:${bookSlug}:${chapterNumber}:${verseNumber}`;
}

export function normalizeVerseNotesStorage(value: unknown): VerseNotesStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, Partial<VerseNote>>;

  return Object.entries(candidate).reduce<VerseNotesStorage>((notes, [id, note]) => {
    if (
      typeof note?.text !== "string" ||
      note.text.trim().length === 0 ||
      (note.version !== "web" && note.version !== "kjv") ||
      typeof note.bookSlug !== "string" ||
      typeof note.chapterNumber !== "number" ||
      typeof note.verseNumber !== "number"
    ) {
      return notes;
    }

    notes[id] = {
      id,
      version: note.version,
      bookSlug: note.bookSlug,
      chapterNumber: note.chapterNumber,
      verseNumber: note.verseNumber,
      text: note.text,
      updatedAt:
        typeof note.updatedAt === "string" && note.updatedAt.length > 0
          ? note.updatedAt
          : new Date(0).toISOString()
    };

    return notes;
  }, {});
}

export function createVerseNote({
  version,
  bookSlug,
  chapterNumber,
  verseNumber,
  text
}: CreateVerseNoteInput): VerseNote {
  return {
    id: getVerseNoteId({ version, bookSlug, chapterNumber, verseNumber }),
    version,
    bookSlug,
    chapterNumber,
    verseNumber,
    text: text.trim(),
    updatedAt: new Date().toISOString()
  };
}
