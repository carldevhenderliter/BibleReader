import {
  createPassageReference,
  cycleHighlightColor,
  normalizeStudySetStorage
} from "@/lib/study-workspace";

describe("study-workspace", () => {
  it("cycles highlight colors and then clears", () => {
    expect(cycleHighlightColor(null)).toBe("gold");
    expect(cycleHighlightColor("gold")).toBe("sky");
    expect(cycleHighlightColor("sky")).toBe("rose");
    expect(cycleHighlightColor("rose")).toBeNull();
  });

  it("normalizes saved study sets with valid passage references", () => {
    const studySetStorage = normalizeStudySetStorage({
      sample: {
        id: "sample",
        name: "Prophecy",
        items: [
          createPassageReference({
            version: "web",
            bookSlug: "john",
            chapterNumber: 1,
            verseNumber: 1,
            sourceType: "search"
          }),
          {
            version: "invalid",
            bookSlug: "john",
            chapterNumber: 1
          }
        ],
        updatedAt: "2026-03-29T00:00:00.000Z"
      }
    });

    expect(studySetStorage.sample).toBeDefined();
    expect(studySetStorage.sample?.items).toHaveLength(1);
    expect(studySetStorage.sample?.items[0]?.id).toBe("web:john:1:1");
  });
});
