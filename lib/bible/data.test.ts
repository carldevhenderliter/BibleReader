import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";

describe("bible data", () => {
  it("loads bundled books for WEB and KJV", async () => {
    const [webBooks, kjvBooks] = await Promise.all([getBooks("web"), getBooks("kjv")]);

    expect(webBooks).toHaveLength(66);
    expect(kjvBooks).toHaveLength(66);
    expect(webBooks[0]?.slug).toBe("genesis");
    expect(kjvBooks.at(-1)?.slug).toBe("revelation");
  });

  it("loads Genesis 1 from KJV", async () => {
    const [book, chapter] = await Promise.all([
      getBookBySlug("genesis", "kjv"),
      getChapter("genesis", 1, "kjv")
    ]);

    expect(book?.name).toBe("Genesis");
    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.text).toContain("In the beginning God created");
  });

  it("loads Revelation 22 from WEB", async () => {
    const chapter = await getChapter("revelation", 22, "web");

    expect(chapter?.chapterNumber).toBe(22);
    expect(chapter?.verses.length).toBeGreaterThan(0);
  });
});
