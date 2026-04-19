import { jest } from "@jest/globals";

import {
  buildGreekUndertextSuggestions,
  getAddableFathersAnnotationWordIndexes,
  getFathersEnglishSpanText,
  normalizeSegmentAnnotations,
  searchGreekUndertextSuggestions,
  tokenizeFathersEnglishText
} from "@/lib/fathers/annotations";

const lookupGreekDictionaryMock = jest.fn();
const searchBibleMock = jest.fn();

jest.mock("@/lib/bible/greek", () => ({
  lookupGreekDictionary: (...args: unknown[]) => lookupGreekDictionaryMock(...args)
}));

jest.mock("@/lib/bible/search", () => ({
  searchBible: (...args: unknown[]) => searchBibleMock(...args)
}));

describe("fathers annotations", () => {
  beforeEach(() => {
    lookupGreekDictionaryMock.mockReset();
    searchBibleMock.mockReset();
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

  it("allows every word before the first undertext annotation", () => {
    const tokens = tokenizeFathersEnglishText("Kefa’s Letter to Ya’akov.");

    expect(getAddableFathersAnnotationWordIndexes(tokens, [])).toEqual([0, 1, 2, 3]);
  });

  it("keeps every unannotated word addable after annotations exist", () => {
    const tokens = tokenizeFathersEnglishText("Kefa’s Letter to Ya’akov.");

    expect(
      getAddableFathersAnnotationWordIndexes(tokens, [
        {
          segmentId: "preaching-of-peter:introduction",
          startToken: 1,
          endToken: 1,
          greekText: "ἐπιστολή",
          source: "lexicon"
        }
      ])
    ).toEqual([0, 2, 3]);

    expect(
      getAddableFathersAnnotationWordIndexes(tokens, [
        {
          segmentId: "preaching-of-peter:introduction",
          startToken: 1,
          endToken: 2,
          greekText: "ἐπιστολὴ πρός",
          source: "custom"
        }
      ])
    ).toEqual([0, 3]);

    expect(
      getAddableFathersAnnotationWordIndexes(tokens, [
        {
          segmentId: "preaching-of-peter:introduction",
          startToken: 0,
          endToken: 0,
          greekText: "Κηφᾶς",
          source: "lexicon"
        },
        {
          segmentId: "preaching-of-peter:introduction",
          startToken: 2,
          endToken: 2,
          greekText: "πρός",
          source: "lexicon"
        }
      ])
    ).toEqual([1, 3]);
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

  it("searches English glosses for popup dictionary suggestions", async () => {
    lookupGreekDictionaryMock.mockResolvedValue([
      {
        entry: {
          entryKey: "G746",
          lemma: "ἀρχή",
          strongs: "G746",
          transliteration: "arche",
          shortDefinition: "beginning",
          forms: []
        },
        matchType: "gloss"
      },
      {
        entry: {
          entryKey: "G757",
          lemma: "ἄρχω",
          strongs: "G757",
          transliteration: "archo",
          shortDefinition: "rule",
          forms: []
        },
        matchType: "transliteration"
      }
    ]);

    await expect(searchGreekUndertextSuggestions("beginning")).resolves.toEqual([
      expect.objectContaining({
        greekText: "ἀρχή",
        entryKey: "G746"
      })
    ]);
  });

  it("returns scripture lookup passages with attached Greek tokens", async () => {
    searchBibleMock.mockResolvedValue([
      {
        type: "verse",
        id: "verse:john:1:1:kjv",
        bookSlug: "john",
        chapterNumber: 1,
        verseNumber: 1,
        label: "John 1:1",
        description: "Verse match",
        href: "/read/john/1#v1",
        preview: "In the beginning was the Word.",
        tokens: [
          { text: "In", strongsNumbers: ["G1722"] },
          { text: " the beginning", strongsNumbers: ["G746"] }
        ]
      }
    ]);

    const importSearchIndex = await import("@/data/bible/search/kjv.json");
    const [entry] = (importSearchIndex.default ?? []).filter(
      (candidate) =>
        candidate.bookSlug === "john" &&
        candidate.chapterNumber === 1 &&
        candidate.verseNumber === 1
    );

    const { searchScriptureUndertextPassages } = await import("@/lib/fathers/annotations");

    await expect(searchScriptureUndertextPassages("beginning", "new-testament", 1)).resolves.toEqual([
      expect.objectContaining({
        label: "John 1:1",
        preview: "In the beginning was the Word.",
        description: "KJV New Testament lookup",
        tokens: entry?.tokens
      })
    ]);

    expect(searchBibleMock).toHaveBeenCalledWith("beginning", "kjv", "partial", undefined, "new-testament");
  });
});
