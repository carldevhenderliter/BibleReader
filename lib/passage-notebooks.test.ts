import {
  createPassageNotebook,
  getPassageNotebookId,
  normalizePassageNotebookStorage
} from "@/lib/passage-notebooks";

describe("passage notebooks", () => {
  it("builds a stable notebook id", () => {
    expect(
      getPassageNotebookId({
        version: "web",
        bookSlug: "genesis",
        chapterNumber: 1
      })
    ).toBe("web:genesis:1");
  });

  it("normalizes only valid stored notebooks", () => {
    const notebooks = normalizePassageNotebookStorage({
      "web:genesis:1": {
        version: "web",
        bookSlug: "genesis",
        chapterNumber: 1,
        title: "Creation",
        blocks: [{ id: "p1", type: "paragraph", text: "In the beginning..." }],
        updatedAt: "2026-03-28T00:00:00.000Z"
      },
      invalid: {
        version: "esv",
        bookSlug: "john",
        chapterNumber: 1,
        title: "Should be removed",
        blocks: []
      }
    });

    expect(Object.keys(notebooks)).toEqual(["web:genesis:1"]);
    expect(notebooks["web:genesis:1"]?.title).toBe("Creation");
    expect(notebooks["web:genesis:1"]?.blocks).toHaveLength(1);
  });

  it("creates notebooks with structured block content", () => {
    const notebook = createPassageNotebook({
      version: "kjv",
      bookSlug: "psalms",
      chapterNumber: 23,
      title: "Psalm 23",
      blocks: [{ id: "list:1", type: "list", text: "Shepherd\nRestore\nLead" }]
    });

    expect(notebook.id).toBe("kjv:psalms:23");
    expect(notebook.blocks[0]).toEqual({
      id: "list:1",
      type: "list",
      text: "Shepherd\nRestore\nLead"
    });
    expect(notebook.updatedAt).toMatch(/T/);
  });
});
