import { formatBdagArticle } from "@/lib/bible/bdag";

describe("formatBdagArticle", () => {
  it("returns reader-friendly BDAG sections", () => {
    const formatted = formatBdagArticle({
      headword: "λόγος",
      transliteration: "lógos",
      entry:
        "communication, speech, or message in a broad sense. In John's writings, the term can point to God's self-expression.",
      summary: {
        plainMeaning: "Usually means word, saying, or message.",
        commonUse: "Communication, speech, or message in a broad sense.",
        ntNote: "In the New Testament, the term can point to God's self-expression."
      }
    });

    expect(formatted.headwordLine).toBe("λόγος (lógos)");
    expect(formatted.plainMeaning).toBe("Usually means word, saying, or message.");
    expect(formatted.commonUse).toBe("Communication, speech, or message in a broad sense.");
    expect(formatted.ntNote).toBe(
      "In the New Testament, the term can point to God's self-expression."
    );
    expect(formatted.keyTerms).toEqual(
      expect.arrayContaining(["word", "saying", "message", "Communication", "speech"])
    );
    expect(formatted.fullArticle).toContain("God's self-expression");
  });
});
