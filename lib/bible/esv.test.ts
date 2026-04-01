import { normalizeEsvSourceBookName, parseEsvSourceVerse } from "@/lib/bible/esv";

describe("esv source helpers", () => {
  it("normalizes mdbible book names with roman numerals", () => {
    expect(normalizeEsvSourceBookName("I Corinthians")).toBe("1 corinthians");
    expect(normalizeEsvSourceBookName("III John")).toBe("3 john");
  });

  it("joins tokenized verse segments into readable text", () => {
    expect(
      parseEsvSourceVerse([
        ["For", "G1063"],
        ["God", "G2316"],
        ["so", "G3779"],
        ["loved", "G25"],
        ["the"],
        ["world", "G2889"],
        [","],
        ["that", "G5620"],
        ["he"],
        ["gave", "G1325"],
        ["his", "G846"],
        ["only", "G3439"],
        ["Son", "G5207"],
        [","]
      ])
    ).toBe("For God so loved the world, that he gave his only Son,");
  });
});
