import { searchBible } from "@/lib/bible/search";

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
  });

  it("filters verse search to the active bundled version", async () => {
    const webResults = await searchBible("without form and void", "web");
    const kjvResults = await searchBible("without form and void", "kjv");

    expect(webResults.some((result) => result.type === "verse")).toBe(false);
    expect(kjvResults.some((result) => result.type === "verse")).toBe(true);
  });
});
