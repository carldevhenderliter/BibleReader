import { findFathersSegmentsByGreekLemma, normalizeFathersGreekText } from "@/lib/fathers/search";

describe("fathers lemma search", () => {
  it("normalizes Greek lemmas the same way as the imported Fathers tokens", () => {
    expect(normalizeFathersGreekText("λόγος")).toBe("λογοσ");
    expect(normalizeFathersGreekText("λόγος,")).toBe("λογοσ");
  });

  it("finds Apostolic Fathers segments for exact normalized Greek lemma matches", async () => {
    const matches = await findFathersSegmentsByGreekLemma("λόγος");

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some((match) => match.workSlug === "1-clement")).toBe(true);
    expect(matches[0]).toEqual(
      expect.objectContaining({
        workSlug: expect.any(String),
        workTitle: expect.any(String),
        segmentId: expect.any(String),
        label: expect.any(String),
        greek: expect.any(String),
        english: expect.any(String),
        greekContext: expect.any(String),
        englishContext: expect.any(String)
      })
    );
  });

  it("returns sentence-level context that stays close to the matched Greek word", async () => {
    const matches = await findFathersSegmentsByGreekLemma("λόγος");
    const firstClementMatch = matches.find(
      (match) => match.workSlug === "1-clement" && match.label === "13"
    );

    expect(firstClementMatch?.greekContext).toContain("ὁ ἅγιος λόγος");
    expect(firstClementMatch?.englishContext).toContain("the holy word saith");
  });

  it("returns the same hits for accentless normalized lemma input", async () => {
    const accented = await findFathersSegmentsByGreekLemma("λόγος");
    const accentless = await findFathersSegmentsByGreekLemma("λογος");

    expect(accentless).toEqual(accented);
  });

  it("returns no matches for Greek lemmas that are absent from the Apostolic Fathers corpus", async () => {
    await expect(findFathersSegmentsByGreekLemma("ἄλφα")).resolves.toEqual([]);
  });
});
