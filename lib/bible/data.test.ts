import {
  getBookBySlug,
  getBooks,
  getChapter,
  getChronologicalNewTestamentBooks,
  getChronologicalOldTestamentBooks
} from "@/lib/bible/data";

describe("bible data", () => {
  it("loads bundled books for WEB, KJV, ESV, TR, and Hebrew", async () => {
    const [webBooks, kjvBooks, esvBooks, trBooks, mtBooks] = await Promise.all([
      getBooks("web"),
      getBooks("kjv"),
      getBooks("esv"),
      getBooks("tr"),
      getBooks("mt")
    ]);

    expect(webBooks).toHaveLength(67);
    expect(kjvBooks).toHaveLength(67);
    expect(esvBooks).toHaveLength(67);
    expect(webBooks[0]?.slug).toBe("genesis");
    expect(webBooks[0]?.compositionDate).toBeUndefined();
    expect(webBooks.find((book) => book.slug === "matthew")?.compositionDate).toBe("c. 70–90 AD");
    expect(kjvBooks.find((book) => book.slug === "revelation")?.compositionDate).toBe("c. 95–96 AD");
    expect(kjvBooks.at(-1)?.slug).toBe("gospel-harmony");
    expect(esvBooks[0]?.slug).toBe("genesis");
    expect(esvBooks.at(-1)?.name).toBe("Gospel Harmony");
    expect(trBooks[0]?.slug).toBe("matthew");
    expect(trBooks.find((book) => book.slug === "matthew")?.compositionDate).toBe("c. 70–90 AD");
    expect(trBooks.at(-1)?.slug).toBe("gospel-harmony");
    expect(mtBooks[0]?.slug).toBe("genesis");
    expect(mtBooks[38]?.slug).toBe("malachi");
    expect(mtBooks.at(-1)?.slug).toBe("gospel-harmony");
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

  it("loads Genesis 1 from bundled ESV", async () => {
    const chapter = await getChapter("genesis", 1, "esv");

    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.text).toContain("In the beginning, God created the heavens");
    expect(chapter?.verses[0]?.tokens).toBeUndefined();
  });

  it("loads Matthew 1 from bundled Textus Receptus and omits Old Testament books", async () => {
    const [matthew, genesis] = await Promise.all([
      getChapter("matthew", 1, "tr"),
      getChapter("genesis", 1, "tr")
    ]);

    expect(matthew?.chapterNumber).toBe(1);
    expect(matthew?.verses[0]?.text).toContain("βιβλος γενεσεως ιησου χριστου");
    expect(matthew?.verses[0]?.translationText).toContain("The book of the genealogy of Jesus Christ");
    expect(matthew?.verses[0]?.greekTokens?.[0]?.strongs).toBe("G976");
    expect(genesis).toBeNull();
  });

  it("loads Genesis 1 from bundled Hebrew and omits New Testament books", async () => {
    const [genesis, matthew] = await Promise.all([
      getChapter("genesis", 1, "mt"),
      getChapter("matthew", 1, "mt")
    ]);

    expect(genesis?.chapterNumber).toBe(1);
    expect(genesis?.verses[0]?.text).toContain("בראשית");
    expect(genesis?.verses[0]?.hebrewTokens?.[0]).toMatchObject({
      surface: "בראשית",
      strongs: "H7225"
    });
    expect(matthew).toBeNull();
  });

  it("returns New Testament books in the configured chronological order", async () => {
    const books = await getBooks("web");
    const chronologicalBooks = getChronologicalNewTestamentBooks(books);

    expect(chronologicalBooks).toHaveLength(28);
    expect(chronologicalBooks.slice(0, 7).map((book) => book.slug)).toEqual([
      "james",
      "galatians",
      "1-thessalonians",
      "2-thessalonians",
      "1-corinthians",
      "2-corinthians",
      "romans"
    ]);
    expect(chronologicalBooks.slice(-6).map((book) => book.slug)).toEqual([
      "john",
      "1-john",
      "2-john",
      "3-john",
      "revelation",
      "gospel-harmony"
    ]);
  });

  it("returns Old Testament books in the configured chronological order", async () => {
    const books = await getBooks("web");
    const chronologicalBooks = getChronologicalOldTestamentBooks(books);

    expect(chronologicalBooks).toHaveLength(39);
    expect(chronologicalBooks.slice(0, 7).map((book) => book.slug)).toEqual([
      "genesis",
      "job",
      "exodus",
      "leviticus",
      "numbers",
      "deuteronomy",
      "joshua"
    ]);
    expect(chronologicalBooks.slice(-5).map((book) => book.slug)).toEqual([
      "ezra",
      "nehemiah",
      "haggai",
      "zechariah",
      "malachi"
    ]);
  });
});
