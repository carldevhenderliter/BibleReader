import { getHebrewVerseOccurrences } from "@/lib/bible/hebrew";

describe("Hebrew verse lookup", () => {
  it("limits Hebrew verse occurrences to an exact selected form", async () => {
    const matches = await getHebrewVerseOccurrences("H7225", "בראשית");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatchObject({
      bookSlug: "genesis",
      chapterNumber: 1,
      verseNumber: 1
    });
    expect(
      matches.every((match) =>
        match.hebrewTokens?.some((token) => token.strongs === "H7225" && token.surface === "בראשית")
      )
    ).toBe(true);
  });
});
