import { getBookAudioSource } from "@/lib/bible/book-audio";

describe("book audio", () => {
  it("returns the generated audio source for a matching book slug", () => {
    expect(getBookAudioSource("galatians")).toEqual({
      bookSlug: "galatians",
      sourceFilename: "Galatians.mp3",
      src: "/book-audio/galatians.mp3",
      assetPath: "/book-audio/galatians.mp3"
    });
  });

  it("returns generated sources for newly added audio books", () => {
    expect(getBookAudioSource("james")).toEqual({
      bookSlug: "james",
      sourceFilename: "James.mp3",
      src: "/book-audio/james.mp3",
      assetPath: "/book-audio/james.mp3"
    });
    expect(getBookAudioSource("1-thessalonians")).toEqual({
      bookSlug: "1-thessalonians",
      sourceFilename: "1 Thessalonians.mp3",
      src: "/book-audio/1-thessalonians.mp3",
      assetPath: "/book-audio/1-thessalonians.mp3"
    });
  });

  it("returns null when a book has no local audio file", () => {
    expect(getBookAudioSource("genesis")).toBeNull();
  });
});
