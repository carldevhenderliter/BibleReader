import { parseEsvSourceBooks } from "@/lib/bible/esv-import";

describe("esv import parser", () => {
  it("maps mdbible books into bundled payloads", () => {
    const sourceBooks = [
      {
        name: "Genesis",
        slug: "genesis",
        sourceKey: "genesis",
        abbreviation: "Gen",
        testament: "Old",
        chapterCount: 1,
        order: 1
      },
      {
        name: "1 Corinthians",
        slug: "1-corinthians",
        sourceKey: "1-corinthians",
        abbreviation: "1 Cor",
        testament: "New",
        chapterCount: 1,
        order: 46
      }
    ] as const;

    const payloadBySlug = parseEsvSourceBooks(sourceBooks, {
      Genesis: [
        [
          [["In the"], ["beginning"], [","], ["God"], ["created"], ["the"], ["heavens"], ["and"], ["the"], ["earth"], ["."]]
        ]
      ],
      "I Corinthians": [
        [
          [["Paul"], [","], ["called"], ["by"], ["the"], ["will"], ["of"], ["God"], ["."]]
        ]
      ]
    });

    expect(payloadBySlug.get("genesis")?.chapters[0]?.verses[0]?.text).toBe(
      "In the beginning, God created the heavens and the earth."
    );
    expect(payloadBySlug.get("1-corinthians")?.chapters[0]?.verses[0]?.text).toBe(
      "Paul, called by the will of God."
    );
  });

  it("throws when a configured book is missing from the ESV source", () => {
    const sourceBooks = [
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

    expect(() => parseEsvSourceBooks(sourceBooks, {})).toThrow("ESV source is missing Exodus.");
  });
});
