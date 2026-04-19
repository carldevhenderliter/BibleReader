import { jest } from "@jest/globals";

import {
  buildGreekUndertextSuggestions,
  getFathersEnglishSpanText,
  normalizeSegmentAnnotations,
  tokenizeFathersEnglishText
} from "@/lib/fathers/annotations";

const lookupGreekDictionaryMock = jest.fn();

jest.mock("@/lib/bible/greek", () => ({
  lookupGreekDictionary: (...args: unknown[]) => lookupGreekDictionaryMock(...args)
}));

describe("fathers annotations", () => {
  beforeEach(() => {
    lookupGreekDictionaryMock.mockReset();
  });

  it("tokenizes English text deterministically and preserves separators", () => {
    const tokens = tokenizeFathersEnglishText("Kefa’s Letter to Ya’akov.");

    expect(tokens).toEqual([
      { type: "word", text: "Kefa’s", wordIndex: 0 },
      { type: "separator", text: " " },
      { type: "word", text: "Letter", wordIndex: 1 },
      { type: "separator", text: " " },
      { type: "word", text: "to", wordIndex: 2 },
      { type: "separator", text: " " },
      { type: "word", text: "Ya’akov", wordIndex: 3 },
      { type: "separator", text: "." }
    ]);
    expect(getFathersEnglishSpanText(tokens, 0, 1)).toBe("Kefa’s Letter");
  });

  it("rejects overlapping annotation ranges for a segment", () => {
    expect(() =>
      normalizeSegmentAnnotations(
        "preaching-of-peter:introduction",
        [
          { startToken: 0, endToken: 1, greekText: "κηφας", source: "custom" },
          { startToken: 1, endToken: 2, greekText: "επιστολη", source: "custom" }
        ],
        4
      )
    ).toThrow(/Overlapping undertext annotations/);
  });

  it("queries the Greek dictionary by span first and falls back to the individual words", async () => {
    lookupGreekDictionaryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          entry: {
            entryKey: "G2786",
            lemma: "Κηφᾶς",
            strongs: "G2786",
            transliteration: "Kēphas",
            shortDefinition: "Cephas",
            forms: []
          },
          matchType: "gloss"
        }
      ])
      .mockResolvedValueOnce([
        {
          entry: {
            entryKey: "G1992",
            lemma: "ἐπιστολή",
            strongs: "G1992",
            transliteration: "epistolē",
            shortDefinition: "letter",
            forms: []
          },
          matchType: "gloss"
        }
      ]);

    const suggestions = await buildGreekUndertextSuggestions("Kefa’s Letter", ["Kefa’s", "Letter"]);

    expect(lookupGreekDictionaryMock).toHaveBeenNthCalledWith(1, "Kefa’s Letter", 8);
    expect(lookupGreekDictionaryMock).toHaveBeenNthCalledWith(2, "Kefa’s", 8);
    expect(lookupGreekDictionaryMock).toHaveBeenNthCalledWith(3, "Letter", 8);
    expect(suggestions).toEqual([
      expect.objectContaining({
        greekText: "Κηφᾶς",
        entryKey: "G2786"
      }),
      expect.objectContaining({
        greekText: "ἐπιστολή",
        entryKey: "G1992"
      })
    ]);
  });
});
