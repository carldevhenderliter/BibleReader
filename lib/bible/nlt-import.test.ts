import { parseNltPdfText } from "@/lib/bible/nlt-import";

describe("nlt import parser", () => {
  it("parses wrapped verses and cleans PDF artifacts", () => {
    const sourceBooks = [
      {
        name: "Genesis",
        slug: "genesis",
        sourceKey: "genesis",
        abbreviation: "Gen",
        testament: "Old",
        chapterCount: 2,
        order: 1
      },
      {
        name: "Exodus",
        slug: "exodus",
        sourceKey: "exodus",
        abbreviation: "Exod",
        testament: "Old",
        chapterCount: 1,
        order: 2
      }
    ] as const;

    const payloadBySlug = parseNltPdfText(
      [
        "The Holy Bible",
        "New Living Translation NLT",
        "Gen 1:1 In the beginning God created the heavens and the earth.",
        "Gen 1:2 The earth was empty, a formless mass cloaked in darkness.",
        "And the Spirit of God was hovering over its surface.",
        "Gen 2:1 So the creation of the heavens and the earth was completed.",
        "\fGen 2:2 On the seventh day, the LORD] rested from all his work.",
        "Exo 1:1 These are the names of the sons of Israel.",
        "who moved to Egypt with Jacob."
      ].join("\n"),
      sourceBooks
    );

    expect(payloadBySlug.size).toBe(2);
    expect(payloadBySlug.get("genesis")?.chapters).toHaveLength(2);
    expect(payloadBySlug.get("genesis")?.chapters[0]?.verses[1]?.text).toBe(
      "The earth was empty, a formless mass cloaked in darkness. And the Spirit of God was hovering over its surface."
    );
    expect(payloadBySlug.get("genesis")?.chapters[1]?.verses[1]?.text).toContain("the LORD rested");
    expect(payloadBySlug.get("exodus")?.chapters[0]?.verses[0]?.text).toBe(
      "These are the names of the sons of Israel. who moved to Egypt with Jacob."
    );
  });

  it("throws when a configured chapter is missing", () => {
    const sourceBooks = [
      {
        name: "Genesis",
        slug: "genesis",
        sourceKey: "genesis",
        abbreviation: "Gen",
        testament: "Old",
        chapterCount: 2,
        order: 1
      }
    ] as const;

    expect(() =>
      parseNltPdfText("Gen 1:1 In the beginning God created the heavens and the earth.", sourceBooks)
    ).toThrow("NLT is missing Genesis chapter 2.");
  });
});
