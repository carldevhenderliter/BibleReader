import {
  getStrongsEntries,
  getStrongsVerseOccurrences,
  normalizeStrongsNumber
} from "@/lib/bible/strongs";

describe("strongs lexicon", () => {
  it("loads normalized lexicon entries by number", async () => {
    const entries = await getStrongsEntries(["H7225", "G3056"]);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: "H7225",
      language: "hebrew",
      transliteration: expect.stringContaining("r")
    });
    expect(entries[1]).toMatchObject({
      id: "G3056",
      language: "greek"
    });
    expect(entries[0]?.definition).not.toContain("&#");
    expect(entries[1]?.definition).not.toContain("&#");
    expect(entries[1]?.outlineUsage).not.toContain("&quot;");
    expect(entries[0]?.bdagArticles).toBeUndefined();
    expect(entries[1]?.bdagArticles?.length).toBeGreaterThan(0);
    expect(entries[1]?.bdagArticles?.[0]?.summary.plainMeaning).toBeTruthy();
  });

  it("skips missing entries", async () => {
    const entries = await getStrongsEntries(["G999999"]);

    expect(entries).toEqual([]);
  });

  it("normalizes spaced and zero-padded strongs numbers", () => {
    expect(normalizeStrongsNumber(" g 03056 ")).toBe("G3056");
    expect(normalizeStrongsNumber("h7225")).toBe("H7225");
  });

  it("loads KJV verse occurrences for a Strongs number", async () => {
    const matches = await getStrongsVerseOccurrences("G3056");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        strongsNumber: "G3056",
        bookSlug: expect.any(String),
        chapterNumber: expect.any(Number),
        verseNumber: expect.any(Number),
        href: expect.stringContaining("/read/")
      })
    );
  });
});
