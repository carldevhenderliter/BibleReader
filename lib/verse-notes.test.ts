import {
  createVerseNote,
  getVerseNoteId,
  normalizeVerseNotesStorage
} from "@/lib/verse-notes";

describe("verse notes", () => {
  it("builds a stable verse note id", () => {
    expect(
      getVerseNoteId({
        version: "web",
        bookSlug: "genesis",
        chapterNumber: 1,
        verseNumber: 1
      })
    ).toBe("web:genesis:1:1");
  });

  it("normalizes only valid stored notes", () => {
    const notes = normalizeVerseNotesStorage({
      "web:genesis:1:1": {
        version: "web",
        bookSlug: "genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "Valid note",
        updatedAt: "2026-03-26T00:00:00.000Z"
      },
      bad: {
        version: "esv",
        bookSlug: "john",
        chapterNumber: 3,
        verseNumber: 16,
        text: "Should be removed"
      }
    });

    expect(Object.keys(notes)).toEqual(["web:genesis:1:1"]);
    expect(notes["web:genesis:1:1"]?.text).toBe("Valid note");
  });

  it("creates trimmed notes with stable metadata", () => {
    const note = createVerseNote({
      version: "kjv",
      bookSlug: "psalms",
      chapterNumber: 23,
      verseNumber: 1,
      text: "  The Lord as shepherd theme.  "
    });

    expect(note.id).toBe("kjv:psalms:23:1");
    expect(note.text).toBe("The Lord as shepherd theme.");
    expect(note.updatedAt).toMatch(/T/);
  });
});
