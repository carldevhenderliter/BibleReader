import { getBookAudioSource } from "@/lib/bible/book-audio";

describe("book audio", () => {
  it("returns the generated audio source for a matching book slug", () => {
    expect(getBookAudioSource("galatians")).toEqual({
      bookSlug: "galatians",
      sourceFilename: "Galatians.pdf.mp3",
      src: "/book-audio/galatians.mp3",
      assetPath: "/book-audio/galatians.mp3"
    });
  });

  it("returns null when a book has no local audio file", () => {
    expect(getBookAudioSource("genesis")).toBeNull();
  });
});
