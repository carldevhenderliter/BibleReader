import {
  createSermonDocument,
  normalizeSermonDocumentStorage
} from "@/lib/sermon-documents";

describe("sermon documents", () => {
  it("creates a sermon document with a starter section", () => {
    const sermon = createSermonDocument("John 1 Sermon");

    expect(sermon.title).toBe("John 1 Sermon");
    expect(sermon.sections).toHaveLength(1);
    expect(sermon.sections[0]?.title).toBe("Main idea");
  });

  it("normalizes only valid stored sermons", () => {
    const sermons = normalizeSermonDocumentStorage({
      "sermon:john-1:test": {
        title: "John 1",
        summary: "The Word made flesh",
        references: [
          {
            version: "web",
            bookSlug: "john",
            chapterNumber: 1,
            verseNumber: 1
          }
        ],
        sections: [
          {
            title: "Introduction",
            content: "Open with the eternal Word."
          }
        ],
        updatedAt: new Date(0).toISOString()
      },
      broken: {
        title: 1
      }
    });

    expect(Object.keys(sermons)).toEqual(["sermon:john-1:test"]);
    expect(sermons["sermon:john-1:test"]?.references).toHaveLength(1);
    expect(sermons["sermon:john-1:test"]?.sections[0]?.title).toBe("Introduction");
  });
});
