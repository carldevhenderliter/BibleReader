import { buildBibleAiPrompt } from "@/lib/ai/bible-assistant";

describe("bible assistant prompt builder", () => {
  it("builds a question-first Bible-only prompt with structured source sections", async () => {
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
        id: "notebook:john-opening-study",
        title: "John opening study",
        content: "The prologue centers on the identity of the Word.",
        references: [],
        updatedAt: new Date(0).toISOString()
      },
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(prompt.systemPrompt).toContain("Answer only from the provided Bible and study context.");
    expect(prompt.userPrompt).toContain("Question:\nWhat does John 1:1 teach about the Word?");
    expect(prompt.userPrompt).toContain("Primary Bible sources:");
    expect(prompt.userPrompt).toContain("Secondary passage context:");
    expect(prompt.userPrompt).toContain("User study notes:");
    expect(prompt.userPrompt).toContain("Instructions:");
    expect(prompt.userPrompt).toContain("John opening study");
    expect(prompt.sources.length).toBeGreaterThan(0);
    expect(prompt.sources.some((source) => source.label === "John 1:1")).toBe(true);
    expect(prompt.sources.some((source) => source.href.startsWith("/read/"))).toBe(true);
  });

  it("uses a tight active-verse window instead of the whole chapter", async () => {
    const prompt = await buildBibleAiPrompt({
      query: "How does this verse describe Jesus?",
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
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." },
          { number: 3, text: "All things were made through him." },
          { number: 4, text: "In him was life." }
        ]
      },
      activeStudyVerseNumber: 2,
      notebook: null,
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(prompt.userPrompt).toContain("Secondary passage context:\n1. In the beginning was the Word.");
    expect(prompt.userPrompt).toContain("2. The same was in the beginning with God.");
    expect(prompt.userPrompt).not.toContain("3. All things were made through him.");
    expect(prompt.userPrompt).not.toContain("4. In him was life.");
  });

  it("limits secondary context when no verse is selected", async () => {
    const prompt = await buildBibleAiPrompt({
      query: "light darkness",
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
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." },
          { number: 3, text: "All things were made through him." },
          { number: 4, text: "In him was life, and the life was the light of men." },
          { number: 5, text: "The light shines in the darkness." }
        ]
      },
      activeStudyVerseNumber: null,
      notebook: null,
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(prompt.userPrompt).toContain("4. In him was life, and the life was the light of men.");
    expect(prompt.userPrompt).toContain("5. The light shines in the darkness.");
    expect(prompt.userPrompt).not.toContain("1. In the beginning was the Word.");
    expect(prompt.userPrompt).not.toContain("2. The same was in the beginning with God.");
  });

  it("retrieves question-relevant sources instead of defaulting to the open chapter", async () => {
    const prompt = await buildBibleAiPrompt({
      query: "What does Genesis 1:1 say about the beginning?",
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
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." }
        ]
      },
      activeStudyVerseNumber: null,
      notebook: null,
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(prompt.sources.some((source) => source.label === "Genesis 1:1")).toBe(true);
  });

  it("changes prompt bodies and sources when the question changes", async () => {
    const johnPrompt = await buildBibleAiPrompt({
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
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." }
        ]
      },
      activeStudyVerseNumber: 1,
      notebook: null,
      studySets: [],
      highlights: [],
      bookmarks: []
    });
    const genesisPrompt = await buildBibleAiPrompt({
      query: "What does Genesis 1:1 say about the beginning?",
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
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." }
        ]
      },
      activeStudyVerseNumber: 1,
      notebook: null,
      studySets: [],
      highlights: [],
      bookmarks: []
    });

    expect(johnPrompt.userPrompt).not.toEqual(genesisPrompt.userPrompt);
    expect(johnPrompt.sources[0]?.label).not.toEqual(genesisPrompt.sources[0]?.label);
  });
});
