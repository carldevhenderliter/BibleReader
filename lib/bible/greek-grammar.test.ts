import { buildGreekGrammarInfos } from "@/lib/bible/greek-grammar";
import type { GreekToken } from "@/lib/bible/types";

describe("greek grammar helper", () => {
  it("builds noun grammar info and linked article+noun phrases", () => {
    const tokens: GreekToken[] = [
      {
        surface: "τόν",
        lemma: "ὁ",
        strongs: "G3588",
        morphology: "T-ASM",
        decodedMorphology: "article accusative singular masculine",
        gloss: "the"
      },
      {
        surface: "λόγον",
        lemma: "λόγος",
        strongs: "G3056",
        morphology: "N-ASM",
        decodedMorphology: "noun accusative singular masculine",
        gloss: "word"
      }
    ];

    const [articleInfo, nounInfo] = buildGreekGrammarInfos(tokens);

    expect(articleInfo.type).toBe("Article");
    expect(articleInfo.declension).toBe("Definite article");
    expect(articleInfo.expandedInfo.linkedPhrase?.combined).toBe("τόν λόγον");
    expect(articleInfo.expandedInfo.linkedPhrase?.functionHint).toMatch(/direct object/i);
    expect(nounInfo.quickInfo.summary).toBe("Accusative Singular Masculine");
  });

  it("builds verb grammar info with aspect and paradigm details", () => {
    const [verbInfo] = buildGreekGrammarInfos([
      {
        surface: "ἐγένετο",
        lemma: "γίνομαι",
        strongs: "G1096",
        morphology: "V-3AAI-S",
        decodedMorphology: "verb aorist active indicative third person singular",
        gloss: "became"
      }
    ]);

    expect(verbInfo.type).toBe("Verb");
    expect(verbInfo.tense).toBe("Aorist");
    expect(verbInfo.aspect).toBe("Perfective");
    expect(verbInfo.quickInfo.summary).toBe("Aorist Active Indicative Third Person Singular");
    expect(verbInfo.expandedInfo.paradigmPattern).toMatch(/-σα/);
  });
});
