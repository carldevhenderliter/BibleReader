import {
  buildNotebookAiPrompt,
  buildSermonAiPrompt
} from "@/lib/ai/writing-assistant";

describe("writing assistant prompt builder", () => {
  it("builds a notebook writing prompt with passage and notebook context", () => {
    const prompt = buildNotebookAiPrompt({
      action: "create-outline",
      version: "web",
      passageLabel: "John 1",
      currentChapter: {
        bookSlug: "john",
        chapterNumber: 1,
        verses: [
          { number: 1, text: "In the beginning was the Word." },
          { number: 2, text: "The same was in the beginning with God." }
        ]
      },
      activeVerseNumber: 1,
      notebook: {
        id: "notebook:john-notes",
        title: "John notes",
        content: "The Word is eternal.",
        references: [],
        updatedAt: new Date(0).toISOString()
      },
      highlights: [],
      bookmarks: [],
      studySets: []
    });

    expect(prompt.target).toBe("notebook");
    expect(prompt.userPrompt).toContain("Task:\nTurn the passage and note into a clear Bible-study outline.");
    expect(prompt.userPrompt).toContain("Current passage:\nJohn 1");
    expect(prompt.userPrompt).toContain("Notebook title: John notes");
    expect(prompt.userPrompt).toContain("Notebook content: The Word is eternal.");
  });

  it("builds a sermon writing prompt with sermon and related notebook context", () => {
    const prompt = buildSermonAiPrompt({
      action: "write-introduction",
      version: "web",
      currentChapter: null,
      currentPassageLabel: "John 1",
      notebook: {
        id: "notebook:john-notes",
        title: "John notes",
        content: "The Word is eternal.",
        references: [],
        updatedAt: new Date(0).toISOString()
      },
      sermon: {
        id: "sermon:test",
        title: "The Eternal Word",
        summary: "Show Christ before creation.",
        references: [],
        sections: [
          {
            id: "section-1",
            title: "Opening",
            content: "Start with wonder."
          }
        ],
        updatedAt: new Date(0).toISOString()
      },
      selectedSectionId: "section-1"
    });

    expect(prompt.target).toBe("sermon");
    expect(prompt.userPrompt).toContain("Task:\nWrite a sermon introduction that leads naturally into the attached passages.");
    expect(prompt.userPrompt).toContain("Current open passage:\nJohn 1");
    expect(prompt.userPrompt).toContain("Sermon title: The Eternal Word");
    expect(prompt.userPrompt).toContain("Section 1 [selected]: Opening");
  });
});
