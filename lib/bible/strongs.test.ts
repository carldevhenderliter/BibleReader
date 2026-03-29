import { getStrongsEntries, normalizeStrongsNumber } from "@/lib/bible/strongs";

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
  });

  it("skips missing entries", async () => {
    const entries = await getStrongsEntries(["G999999"]);

    expect(entries).toEqual([]);
  });

  it("normalizes spaced and zero-padded strongs numbers", () => {
    expect(normalizeStrongsNumber(" g 03056 ")).toBe("G3056");
    expect(normalizeStrongsNumber("h7225")).toBe("H7225");
  });
});
