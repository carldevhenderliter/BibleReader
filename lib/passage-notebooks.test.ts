import {
  createNotebookDocument,
  normalizePassageNotebookStorage
} from "@/lib/passage-notebooks";

describe("notebook library storage", () => {
  it("normalizes valid notebook documents", () => {
    const notebooks = normalizePassageNotebookStorage({
      "notebook:john-notes": {
        title: "John notes",
        content: "The Word is eternal.",
        references: [],
        updatedAt: "2026-03-28T00:00:00.000Z"
      },
      invalid: {
        title: 12
      }
    });

    expect(Object.keys(notebooks)).toEqual(["notebook:john-notes"]);
    expect(notebooks["notebook:john-notes"]?.title).toBe("John notes");
    expect(notebooks["notebook:john-notes"]?.content).toBe("The Word is eternal.");
  });

  it("migrates legacy passage notebooks into notebook documents", () => {
    const notebooks = normalizePassageNotebookStorage({
      "web:genesis:1": {
        version: "web",
        bookSlug: "genesis",
        chapterNumber: 1,
        title: "",
        blocks: [
          {
            id: "p1",
            type: "paragraph",
            text: "In the beginning...",
            references: []
          },
          {
            id: "p2",
            type: "list",
            text: "Light\nLife",
            references: []
          }
        ],
        updatedAt: "2026-03-28T00:00:00.000Z"
      }
    });

    expect(Object.keys(notebooks)).toEqual(["notebook:web-genesis-1"]);
    expect(notebooks["notebook:web-genesis-1"]?.title).toBe("Genesis 1 notes");
    expect(notebooks["notebook:web-genesis-1"]?.content).toContain("In the beginning...");
    expect(notebooks["notebook:web-genesis-1"]?.content).toContain("Light\nLife");
    expect(notebooks["notebook:web-genesis-1"]?.references).toHaveLength(1);
  });

  it("creates notebook documents with a single content field", () => {
    const notebook = createNotebookDocument("Psalm notes");

    expect(notebook.title).toBe("Psalm notes");
    expect(notebook.content).toBe("");
    expect(notebook.references).toEqual([]);
    expect(notebook.updatedAt).toMatch(/T/);
  });
});
