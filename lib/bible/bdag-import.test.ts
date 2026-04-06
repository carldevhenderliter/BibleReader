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
        "first line of the article. continuation line for logos.\n\nmore content after a page break.",
      summary: {
        plainMeaning: ""
      }
    });
    expect(articles[1]).toEqual({
      headword: "λέγω",
      transliteration: "légō",
      entry: "to say something clearly.",
      summary: {
        plainMeaning: ""
      }
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
          entry: "communication, word, statement",
          summary: {
            plainMeaning: ""
          }
        },
        {
          headword: "ἀγάπη",
          transliteration: "agápē",
          entry: "love, esteem, affection",
          summary: {
            plainMeaning: ""
          }
        },
        {
          headword: "ἀββα",
          transliteration: "abba",
          entry: "father",
          summary: {
            plainMeaning: ""
          }
        }
      ]);

    expect(matchedArticles).toBe(1);
    expect(ambiguousArticles).toBe(1);
    expect(unmatchedArticles).toBe(1);
    expect(mergedLexicon.G3056?.bdagArticles).toEqual([
      {
        headword: "λόγος",
        transliteration: "lógos",
        entry: "communication, word, statement",
        summary: {
          plainMeaning: "Communication, word, statement.",
          commonUse: undefined,
          ntNote: undefined
        }
      }
    ]);
    expect(mergedLexicon.G26?.bdagArticles).toBeUndefined();
    expect(mergedLexicon.H7225?.bdagArticles).toBeUndefined();
  });

  it("generates readable BDAG summaries from Strongs definition data", () => {
    const lexicon: Record<string, StrongsEntry> = {
      G3056: {
        id: "G3056",
        language: "greek",
        lemma: "λόγος",
        transliteration: "logos",
        definition: "something said; by implication, a topic, reasoning, or divine expression",
        partOfSpeech: "noun",
        rootWord: "G3004",
        outlineUsage: "word, saying, message, account, reason"
      }
    };

    const { mergedLexicon } = mergeBdagIntoStrongsLexicon(lexicon, [
      {
        headword: "λόγος",
        transliteration: "lógos",
        entry:
          "communication, speech, or message in a broad sense. In John's writings, the term can point to God's self-expression.",
        summary: {
          plainMeaning: ""
        }
      }
    ]);

    expect(mergedLexicon.G3056?.bdagArticles?.[0]?.summary).toEqual({
      plainMeaning: "Usually means word, saying, or message.",
      commonUse: "Communication, speech, or message in a broad sense.",
      ntNote: "In the New Testament, the term can point to God's self-expression."
    });
  });
});
