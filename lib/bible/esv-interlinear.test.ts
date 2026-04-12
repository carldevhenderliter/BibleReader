import { getEsvInterlinearBook, getEsvInterlinearChapter } from "@/lib/bible/esv-interlinear";

describe("esv interlinear data", () => {
  it("loads New Testament Greek lines for ESV chapters", async () => {
    const chapter = await getEsvInterlinearChapter("matthew", 1);

    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.number).toBe(1);
    expect(chapter?.verses[0]?.greek.length).toBeGreaterThan(10);
    expect(chapter?.verses[0]?.baseGreek.length).toBeGreaterThan(10);
    expect(chapter?.verses[0]?.tokens?.[0]?.occurrenceKey).toBe("matthew:1:1:0");
  });

  it("loads a full ESV interlinear New Testament book", async () => {
    const book = await getEsvInterlinearBook("jude");

    expect(book).not.toBeNull();
    expect(book?.[0]?.chapterNumber).toBe(1);
  });

  it("returns null for Old Testament books", async () => {
    const chapter = await getEsvInterlinearChapter("genesis", 1);

    expect(chapter).toBeNull();
  });
});
