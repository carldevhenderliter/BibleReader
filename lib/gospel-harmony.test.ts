import {
  createDefaultHarmonyDocument,
  getGospelHarmonyChapterCount,
  normalizeHarmonyDocumentStorage
} from "@/lib/gospel-harmony";

describe("gospel harmony documents", () => {
  it("creates a default local ESV harmony document", () => {
    const harmony = createDefaultHarmonyDocument();

    expect(harmony.title).toBe("Chronological Harmony of the Gospels");
    expect(harmony.sourceVersion).toBe("esv");
    expect(harmony.events.length).toBeGreaterThan(50);
    expect(harmony.events[0]?.references.length).toBeGreaterThan(0);
    expect(harmony.events[0]?.lines.length).toBeGreaterThan(0);
  });

  it("covers all four Gospels and keeps references on every line", () => {
    const harmony = createDefaultHarmonyDocument();
    const books = new Set(
      harmony.events.flatMap((event) =>
        event.references.map((reference) => reference.bookSlug)
      )
    );

    expect(books.has("matthew")).toBe(true);
    expect(books.has("mark")).toBe(true);
    expect(books.has("luke")).toBe(true);
    expect(books.has("john")).toBe(true);

    harmony.events.forEach((event) => {
      expect(event.references.length).toBeGreaterThan(0);
      event.lines.forEach((line) => {
        expect(line.references.length).toBeGreaterThan(0);
      });
    });
  });

  it("exposes the template event count as the harmony chapter count", () => {
    const harmony = createDefaultHarmonyDocument();

    expect(getGospelHarmonyChapterCount()).toBe(harmony.events.length);
  });

  it("normalizes only valid stored harmony documents", () => {
    const sample = createDefaultHarmonyDocument();
    const normalized = normalizeHarmonyDocumentStorage({
      [sample.id]: sample,
      broken: {
        title: "Broken harmony",
        sourceVersion: "esv",
        events: []
      }
    });

    expect(Object.keys(normalized)).toEqual([sample.id]);
    expect(normalized[sample.id]?.events[0]?.lines[0]?.references.length).toBeGreaterThan(0);
  });
});
