import { searchBible, searchBibleGroups } from "@/lib/bible/search";
import type { VerseToken } from "@/lib/bible/types";

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

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "range",
      bookSlug: "john",
      chapterNumber: 1,
      startVerseNumber: 1,
      endVerseNumber: 12
    });
    expect((results[0] as { verses: Array<{ verseNumber: number; href: string; preview: string }> }).verses).toHaveLength(12);
    expect((results[0] as { verses: Array<{ verseNumber: number; href: string; preview: string }> }).verses[0]).toMatchObject({
      verseNumber: 1,
      href: "/read/john/1?highlight=1"
    });
    expect((results[0] as { verses: Array<{ verseNumber: number; href: string; preview: string }> }).verses[0]?.preview).toContain(
      "In the beginning was the Word, and the Word was with God, and the Word was God."
    );
    expect((results[0] as { verses: Array<{ verseNumber: number; href: string }> }).verses.at(-1)).toMatchObject({
      verseNumber: 12,
      href: "/read/john/1?highlight=12"
    });
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

  it("includes KJV token metadata on word-search verse hits", async () => {
    const results = await searchBible("beginning", "kjv");
    const verseResult = results.find(
      (result) =>
        result.type === "verse" &&
        result.bookSlug === "genesis" &&
        result.chapterNumber === 1 &&
        result.verseNumber === 1
    );

    expect(verseResult).toMatchObject({
      type: "verse",
      href: "/read/genesis/1?version=kjv&highlight=1"
    });
    expect(verseResult && "tokens" in verseResult ? verseResult.tokens : undefined).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("beginning"),
          strongsNumbers: expect.arrayContaining(["H7225"])
        })
      ])
    );
  });

  it("resolves exact Strongs number lookups with entry details and matching KJV verses", async () => {
    const results = await searchBible("H7225", "web");

    expect(results[0]).toMatchObject({
      type: "strongs",
      strongsNumber: "H7225",
      label: "H7225",
      description: "Hebrew Strongs"
    });
    expect(results[0]).toHaveProperty("preview");
    expect((results[0] as { preview: string }).preview).toContain("Used in");

    const verseResult = results.find(
      (result) =>
        result.type === "verse" &&
        result.bookSlug === "genesis" &&
        result.chapterNumber === 1 &&
        result.verseNumber === 1
    );

    expect(verseResult).toMatchObject({
      type: "verse",
      href: "/read/genesis/1?version=kjv&highlight=1"
    });
    expect(verseResult && "tokens" in verseResult ? verseResult.tokens : undefined).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining("beginning"),
          strongsNumbers: expect.arrayContaining(["H7225"])
        })
      ])
    );
  });

  it("normalizes Strongs queries with spaces and leading zeroes", async () => {
    const results = await searchBible("g 03056", "kjv");

    expect(results[0]).toMatchObject({
      type: "strongs",
      strongsNumber: "G3056"
    });
  });

  it("resolves curated topic aliases into grouped subtopic results", async () => {
    const results = await searchBible("end times", "web");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "topic",
      topicId: "end-times",
      label: "End Times"
    });
    expect((results[0] as { subtopics: Array<{ label: string; verses: Array<{ label: string }> }> }).subtopics.map((entry) => entry.label)).toContain(
      "Return of Christ"
    );
    expect((results[0] as { subtopics: Array<{ verses: Array<{ label: string }> }> }).subtopics[0]?.verses[0]?.label).toMatch(
      /Matthew 24:30|Acts 1:11|1 Thessalonians 4:16|Revelation 1:7/
    );
  });

  it("uses the active translation for topic verse text", async () => {
    const webResults = await searchBible("last days", "web");
    const kjvResults = await searchBible("last days", "kjv");
    const webVerse = (webResults[0] as { subtopics: Array<{ verses: Array<{ preview: string }> }> }).subtopics
      .flatMap((subtopic) => subtopic.verses)
      .find((verse) => verse.preview.includes("grievous times"));
    const kjvVerse = (kjvResults[0] as { subtopics: Array<{ verses: Array<{ preview: string; tokens?: VerseToken[] }> }> }).subtopics
      .flatMap((subtopic) => subtopic.verses)
      .find((verse) => verse.preview.includes("perilous times"));

    expect(webVerse?.preview).toContain("grievous times will come");
    expect(kjvVerse?.preview).toContain("perilous times shall come");
    expect(kjvVerse?.tokens?.length).toBeGreaterThan(0);
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

  it("keeps verse-by-verse range results inside grouped searches", async () => {
    const groups = await searchBibleGroups("Job 1:1-10, repent", "kjv");

    expect(groups[0]?.results).toHaveLength(1);
    expect(groups[0]?.results[0]).toMatchObject({
      type: "range",
      bookSlug: "job",
      chapterNumber: 1,
      startVerseNumber: 1,
      endVerseNumber: 10
    });
    expect((groups[0]?.results[0] as { verses: Array<{ verseNumber: number }> }).verses[0]?.verseNumber).toBe(1);
    expect((groups[0]?.results[0] as { verses: Array<{ verseNumber: number }> }).verses.at(-1)?.verseNumber).toBe(10);
    expect(groups[1]?.query).toBe("repent");
  });

  it("supports mixed topic and non-topic grouped searches", async () => {
    const groups = await searchBibleGroups("faith, end times", "web");

    expect(groups).toHaveLength(2);
    expect(groups[0]?.results[0]).toMatchObject({
      type: "topic",
      topicId: "faith"
    });
    expect(groups[1]?.results[0]).toMatchObject({
      type: "topic",
      topicId: "end-times"
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

  it("keeps partial matching as substring search", async () => {
    const results = await searchBible("begin", "web", "partial");

    expect(results.find((result) => result.type === "verse")).toMatchObject({
      type: "verse",
      bookSlug: "genesis",
      chapterNumber: 1,
      verseNumber: 1
    });
  });

  it("uses whole-word matching in complete mode", async () => {
    const results = await searchBible("begin", "web", "complete");

    expect(
      results.some(
        (result) =>
          result.type === "verse" &&
          result.bookSlug === "genesis" &&
          result.chapterNumber === 1 &&
          result.verseNumber === 1
      )
    ).toBe(false);
  });

  it("matches full-word phrases in complete mode", async () => {
    const results = await searchBible("the beginning", "web", "complete");

    expect(results.find((result) => result.type === "verse")).toMatchObject({
      type: "verse",
      bookSlug: "genesis",
      chapterNumber: 1,
      verseNumber: 1
    });
  });

  it("keeps direct references unchanged in complete mode", async () => {
    const results = await searchBible("John 1:1", "web", "complete");

    expect(results[0]).toMatchObject({
      type: "verse",
      bookSlug: "john",
      chapterNumber: 1,
      verseNumber: 1,
      href: "/read/john/1?highlight=1"
    });
  });

  it("applies the selected match mode to grouped multi-query searches", async () => {
    const groups = await searchBibleGroups("John 1:1, eginni", "web", "complete");

    expect(groups[0]?.results[0]).toMatchObject({
      type: "verse",
      bookSlug: "john",
      chapterNumber: 1,
      verseNumber: 1
    });
    expect(groups[1]?.results).toHaveLength(0);
  });
});
