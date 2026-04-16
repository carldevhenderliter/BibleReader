import { getMasoreticBookPayload, getMasoreticBooks, getMasoreticChapter } from "@/lib/bible/masoretic";

describe("masoretic data", () => {
  it("loads the OT Masoretic book list", async () => {
    const books = await getMasoreticBooks();

    expect(books).toHaveLength(39);
    expect(books[0]?.slug).toBe("genesis");
    expect(books[38]?.slug).toBe("malachi");
  });

  it("loads a Masoretic chapter with Hebrew tokens", async () => {
    const chapter = await getMasoreticChapter("genesis", 1);

    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.hebrewTokens?.[0]?.surface).toBeTruthy();
    expect(chapter?.verses[0]?.hebrewTokens?.[0]?.lemma).toBeTruthy();
  });

  it("returns null for non-OT books", async () => {
    await expect(getMasoreticBookPayload("matthew")).resolves.toBeNull();
  });
});
