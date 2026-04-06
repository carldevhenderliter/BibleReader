import { mergeBdagIntoStrongsLexicon, parseBdagPdfText } from "@/lib/bible/bdag-import";
import type { StrongsEntry } from "@/lib/bible/types";

describe("bdag import parser", () => {
  it("parses BDAG entries and removes page headers", () => {
    const articles = parseBdagPdfText(
      [
        "λόγος, ου, ὁ ⟦lógos⟧ first line of the article.",
        "continuation line for logos.",
        "",
        "530",
        "",
        "A Greek-English Lexicon of the New Testament",
        "",
        "λόγος",
        "λόγος",
        "",
        "more content after a page break.",
        "λέγω ⟦légō⟧ to say something clearly."
      ].join("\n")
    );

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      headword: "λόγος",
      transliteration: "lógos",
      entry:
        "first line of the article. continuation line for logos.\n\nmore content after a page break."
    });
    expect(articles[1]).toEqual({
      headword: "λέγω",
      transliteration: "légō",
      entry: "to say something clearly."
    });
  });

  it("merges uniquely matched Greek BDAG articles into the Strongs lexicon", () => {
    const lexicon: Record<string, StrongsEntry> = {
      G3004: {
        id: "G3004",
        language: "greek",
        lemma: "λέγω",
        transliteration: "legō",
        definition: "say",
        partOfSpeech: "verb",
        rootWord: "primitive root",
        outlineUsage: "to say"
      },
      G3056: {
        id: "G3056",
        language: "greek",
        lemma: "λόγος",
        transliteration: "logos",
        definition: "word",
        partOfSpeech: "noun",
        rootWord: "G3004",
        outlineUsage: "word"
      },
      G26: {
        id: "G26",
        language: "greek",
        lemma: "ἀγάπη",
        transliteration: "agapē",
        definition: "love",
        partOfSpeech: "noun",
        rootWord: "G25",
        outlineUsage: "love"
      },
      G9999: {
        id: "G9999",
        language: "greek",
        lemma: "ἀγάπη",
        transliteration: "agape",
        definition: "alternate love entry",
        partOfSpeech: "noun",
        rootWord: "G25",
        outlineUsage: "alternate love entry"
      },
      H7225: {
        id: "H7225",
        language: "hebrew",
        lemma: "רֵאשִׁית",
        transliteration: "re'shiyth",
        definition: "beginning",
        partOfSpeech: "noun",
        rootWord: "primitive root",
        outlineUsage: "beginning"
      }
    };

    const { mergedLexicon, matchedArticles, ambiguousArticles, unmatchedArticles } =
      mergeBdagIntoStrongsLexicon(lexicon, [
        {
          headword: "λόγος",
          transliteration: "lógos",
          entry: "communication, word, statement"
        },
        {
          headword: "ἀγάπη",
          transliteration: "agápē",
          entry: "love, esteem, affection"
        },
        {
          headword: "ἀββα",
          transliteration: "abba",
          entry: "father"
        }
      ]);

    expect(matchedArticles).toBe(1);
    expect(ambiguousArticles).toBe(1);
    expect(unmatchedArticles).toBe(1);
    expect(mergedLexicon.G3056?.bdagArticles).toEqual([
      {
        headword: "λόγος",
        transliteration: "lógos",
        entry: "communication, word, statement"
      }
    ]);
    expect(mergedLexicon.G26?.bdagArticles).toBeUndefined();
    expect(mergedLexicon.H7225?.bdagArticles).toBeUndefined();
  });
});
