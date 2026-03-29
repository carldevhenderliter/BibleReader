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
    expect(chapter?.verses[0]?.tokens?.[0]?.strongsNumbers).toContain("H7225");
  });

  it("removes KJV footnote markers and unwraps readable bracketed headings", async () => {
    const [corinthians, psalms] = await Promise.all([
      getChapter("1-corinthians", 16, "kjv"),
      getChapter("psalms", 3, "kjv")
    ]);

    expect(corinthians?.verses.at(-1)?.text).toBe(
      "My love be with you all in Christ Jesus. Amen."
    );
    expect(corinthians?.verses.at(-1)?.tokens?.some((token) => /\[fn\]/i.test(token.text))).toBe(
      false
    );
    expect(psalms?.verses[0]?.text.startsWith("A Psalm of David, when he fled from Absalom his son.")).toBe(true);
    expect(psalms?.verses[0]?.text.includes("[[")).toBe(false);
    expect(psalms?.verses[0]?.text.includes("]]")).toBe(false);
  });

  it("loads Revelation 22 from WEB", async () => {
    const chapter = await getChapter("revelation", 22, "web");

    expect(chapter?.chapterNumber).toBe(22);
    expect(chapter?.verses.length).toBeGreaterThan(0);
  });
});
