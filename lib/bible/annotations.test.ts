import {
  getBibleVerseAnnotationKey,
  normalizeBibleGreekUndertextAnnotations,
  tokenizeBibleEnglishText
} from "@/lib/bible/annotations";

describe("bible annotations", () => {
  it("builds stable verse annotation keys", () => {
    expect(getBibleVerseAnnotationKey("john", 1, 1)).toBe("john:1:1");
  });

  it("tokenizes Bible English text into stable word and separator tokens", () => {
    expect(tokenizeBibleEnglishText("In the beginning, God created.")).toEqual([
      { type: "word", text: "In", wordIndex: 0 },
      { type: "separator", text: " " },
      { type: "word", text: "the", wordIndex: 1 },
      { type: "separator", text: " " },
      { type: "word", text: "beginning", wordIndex: 2 },
      { type: "separator", text: ", " },
      { type: "word", text: "God", wordIndex: 3 },
      { type: "separator", text: " " },
      { type: "word", text: "created", wordIndex: 4 },
      { type: "separator", text: "." }
    ]);
  });

  it("normalizes and sorts stored verse annotations", () => {
    expect(
      normalizeBibleGreekUndertextAnnotations(
        "john:1:1",
        [
          {
            verseKey: "john:1:1",
            startToken: 2,
            endToken: 2,
            greekText: "ἀρχῇ",
            source: "verse-token"
          },
          {
            verseKey: "john:1:1",
            startToken: 0,
            endToken: 0,
            greekText: "ἐν",
            source: "custom"
          },
          {
            verseKey: "john:1:1",
            startToken: -1,
            endToken: 0,
            greekText: "bad",
            source: "custom"
          }
        ],
        5
      )
    ).toEqual([
      {
        verseKey: "john:1:1",
        startToken: 0,
        endToken: 0,
        greekText: "ἐν",
        entryKey: undefined,
        lemma: undefined,
        strongs: undefined,
        transliteration: undefined,
        gloss: undefined,
        source: "custom"
      },
      {
        verseKey: "john:1:1",
        startToken: 2,
        endToken: 2,
        greekText: "ἀρχῇ",
        entryKey: undefined,
        lemma: undefined,
        strongs: undefined,
        transliteration: undefined,
        gloss: undefined,
        source: "verse-token"
      }
    ]);
  });
});
