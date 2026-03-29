import { buildBibleAiPrompt } from "@/lib/ai/bible-assistant";

describe("bible assistant prompt builder", () => {
  it("builds a Bible-only prompt with current passage, notebook context, and sources", async () => {
    const prompt = await buildBibleAiPrompt({
      query: "What does John 1:1 teach about the Word?",
      version: "web",
      currentPassage: {
        bookSlug: "john",
        chapterNumber: 1,
        view: "chapter"
      },
      currentChapter: {
        bookSlug: "john",
        chapterNumber: 1,
        verses: [
          {
            number: 1,
            text: "In the beginning was the Word, and the Word was with God, and the Word was God."
          },
          {
            number: 2,
            text: "The same was in the beginning with God."
          }
        ]
      },
      activeStudyVerseNumber: 1,
      notebook: {
        id: "web:john:1",
        version: "web",
        bookSlug: "john",
        chapterNumber: 1,
        title: "John opening study",
        blocks: [
          {
            id: "block-1",
            type: "paragraph",
            text: "The prologue centers on the identity of the Word.",
            references: []
          }
        ],
        updatedAt: new Date(0).toISOString()
      },
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(prompt.systemPrompt).toContain("Answer only from the provided Bible and study context.");
    expect(prompt.userPrompt).toContain("Question: What does John 1:1 teach about the Word?");
    expect(prompt.userPrompt).toContain("Current passage text:");
    expect(prompt.userPrompt).toContain("Notebook context:");
    expect(prompt.userPrompt).toContain("John opening study");
    expect(prompt.sources.length).toBeGreaterThan(0);
    expect(prompt.sources.some((source) => source.href.startsWith("/read/"))).toBe(true);
  });
});
