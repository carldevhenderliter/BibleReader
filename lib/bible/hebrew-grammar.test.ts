import { buildHebrewGrammarInfos } from "@/lib/bible/hebrew-grammar";

describe("hebrew grammar helper", () => {
  it("builds noun grammar info from Masoretic token morphology", () => {
    const [info] = buildHebrewGrammarInfos([
      {
        surface: "בראשית",
        lemma: "רֵאשִׁית",
        strongs: "H7225",
        morphology: "Ncfsa",
        decodedMorphology: "feminine noun",
        transliteration: "rē'šîṯ",
        gloss: "beginning"
      }
    ]);

    expect(info.quickInfo.partOfSpeech).toBe("Noun");
    expect(info.gender).toBe("Feminine");
    expect(info.number).toBe("Singular");
    expect(info.expandedInfo.fullMorphology).toBe("feminine noun");
    expect(info.expandedInfo.details.map((detail) => detail.label)).toEqual(
      expect.arrayContaining(["Noun", "Feminine", "Singular", "Absolute"])
    );
  });

  it("builds verb grammar info from Hebrew verb codes", () => {
    const [info] = buildHebrewGrammarInfos([
      {
        surface: "ברא",
        lemma: "בָּרָא",
        strongs: "H1254",
        morphology: "Vqp3ms",
        decodedMorphology: "verb",
        transliteration: "bārā'",
        gloss: "create"
      }
    ]);

    expect(info.quickInfo.partOfSpeech).toBe("Verb");
    expect(info.expandedInfo.details.map((detail) => detail.label)).toEqual(
      expect.arrayContaining(["Verb", "Qal", "Perfect", "Third person"])
    );
    expect(info.expandedInfo.paradigmPattern).toContain("Hebrew Qal verbs");
  });
});
