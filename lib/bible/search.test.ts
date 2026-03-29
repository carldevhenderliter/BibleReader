import { searchBible, searchBibleGroups } from "@/lib/bible/search";

describe("Bible search", () => {
  it("resolves direct chapter references", async () => {
    const results = await searchBible("John 1", "web");

    expect(results[0]).toMatchObject({
      type: "chapter",
      bookSlug: "john",
      chapterNumber: 1,
      label: "John 1",
      href: "/read/john/1"
    });
  });

  it("resolves direct verse references", async () => {
    const results = await searchBible("John 1:1", "web");

    expect(results[0]).toMatchObject({
      type: "verse",
      bookSlug: "john",
      chapterNumber: 1,
      verseNumber: 1,
      href: "/read/john/1?highlight=1"
    });
    expect(results[0]).toHaveProperty(
      "preview",
      "In the beginning was the Word, and the Word was with God, and the Word was God."
    );
  });

  it("resolves same-chapter verse range references", async () => {
    const results = await searchBible("John 1:1-12", "web");

    expect(results[0]).toMatchObject({
      type: "range",
      bookSlug: "john",
      chapterNumber: 1,
      startVerseNumber: 1,
      endVerseNumber: 12,
      href: "/read/john/1?highlightStart=1&highlightEnd=12"
    });
    expect(results[0]).toHaveProperty("preview");
    expect((results[0] as { preview: string }).preview).toContain(
      "In the beginning was the Word, and the Word was with God, and the Word was God."
    );
    expect((results[0] as { preview: string }).preview).toContain(
      "But as many as received him, to them he gave the right to become God’s children"
    );
  });

  it("rejects reversed same-chapter verse ranges", async () => {
    const results = await searchBible("John 1:12-1", "web");

    expect(results.some((result) => result.type === "range")).toBe(false);
  });

  it("prioritizes book matches before verse matches", async () => {
    const results = await searchBible("john", "web");

    expect(results[0]).toMatchObject({
      type: "book",
      bookSlug: "john",
      label: "John"
    });
  });

  it("finds case-insensitive phrase matches within a verse", async () => {
    const results = await searchBible("in the beginning", "web");
    const verseResult = results.find((result) => result.type === "verse");

    expect(verseResult).toMatchObject({
      type: "verse",
      bookSlug: "genesis",
      chapterNumber: 1,
      verseNumber: 1
    });
    expect(verseResult).toHaveProperty(
      "preview",
      "In the beginning, God created the heavens and the earth."
    );
  });

  it("filters verse search to the active bundled version", async () => {
    const webResults = await searchBible("without form and void", "web");
    const kjvResults = await searchBible("without form and void", "kjv");

    expect(webResults.some((result) => result.type === "verse")).toBe(false);
    expect(kjvResults.some((result) => result.type === "verse")).toBe(true);
  });

  it("groups comma-separated queries in typed order", async () => {
    const groups = await searchBibleGroups("Matthew 1:1, repent, forgiveness", "web");

    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.query)).toEqual(["Matthew 1:1", "repent", "forgiveness"]);
    expect(groups[0]?.results[0]).toMatchObject({
      type: "verse",
      bookSlug: "matthew",
      chapterNumber: 1,
      verseNumber: 1
    });
  });

  it("trims empty comma-separated query parts and limits groups to five", async () => {
    const groups = await searchBibleGroups("John 1:1, , faith, hope, love, grace, mercy", "web");

    expect(groups.map((group) => group.query)).toEqual([
      "John 1:1",
      "faith",
      "hope",
      "love",
      "grace"
    ]);
  });

  it("keeps book matches before verse matches inside each group", async () => {
    const groups = await searchBibleGroups("john, light", "web");

    expect(groups[0]?.results[0]).toMatchObject({
      type: "book",
      bookSlug: "john"
    });
    expect(groups[1]?.query).toBe("light");
  });
});
