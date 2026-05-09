import { getStrongsEnglishHighlightPhrases } from "@/lib/bible/strongs-highlighting";

describe("getStrongsEnglishHighlightPhrases", () => {
  it("expands Greek glosses into safe singular and plural English variants", () => {
    const phrases = getStrongsEnglishHighlightPhrases(
      "G4172",
      {
        greekTokens: [
          {
            surface: "πόλεις",
            lemma: "πόλις",
            gloss: "city",
            strongs: "G4172",
            entryKey: "G4172"
          }
        ]
      },
      "greek"
    );

    expect(phrases).toContain("city");
    expect(phrases).toContain("cities");
  });

  it("splits gloss lists into separate highlight candidates", () => {
    const phrases = getStrongsEnglishHighlightPhrases(
      "G4172",
      {
        greekTokens: [
          {
            surface: "πόλις",
            lemma: "πόλις",
            gloss: "city, town",
            strongs: "G4172",
            entryKey: "G4172"
          }
        ]
      },
      "greek"
    );

    expect(phrases).toContain("city");
    expect(phrases).toContain("cities");
    expect(phrases).toContain("town");
    expect(phrases).toContain("towns");
  });

  it("strips leading articles before generating variants", () => {
    const phrases = getStrongsEnglishHighlightPhrases(
      "G4172",
      {
        greekTokens: [
          {
            surface: "πόλις",
            lemma: "πόλις",
            gloss: "the city",
            strongs: "G4172",
            entryKey: "G4172"
          }
        ]
      },
      "greek"
    );

    expect(phrases).toContain("the city");
    expect(phrases).toContain("city");
    expect(phrases).toContain("cities");
  });
});
