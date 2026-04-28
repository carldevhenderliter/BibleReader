import { render, waitFor } from "@testing-library/react";

import { ReaderBookAudioPlayer } from "@/app/components/ReaderBookAudioPlayer";
import { BOOK_AUDIO_AUTOPLAY_STORAGE_KEY } from "@/lib/bible/book-audio";

describe("ReaderBookAudioPlayer", () => {
  const originalPlay = HTMLMediaElement.prototype.play;
  const originalLoad = HTMLMediaElement.prototype.load;
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "readyState"
  );

  beforeEach(() => {
    window.sessionStorage.clear();
    HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.load = jest.fn();
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", {
      configurable: true,
      get: () => 4
    });
  });

  afterAll(() => {
    HTMLMediaElement.prototype.play = originalPlay;
    HTMLMediaElement.prototype.load = originalLoad;
    if (readyStateDescriptor) {
      Object.defineProperty(HTMLMediaElement.prototype, "readyState", readyStateDescriptor);
    }
  });

  it("autoplays when the session handoff targets the current book", async () => {
    window.sessionStorage.setItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY, "ephesians");

    render(
      <ReaderBookAudioPlayer
        audioSource={{
          bookSlug: "ephesians",
          sourceFilename: "Ephesians.mp3",
          src: "/book-audio/ephesians.mp3",
          assetPath: "/book-audio/ephesians.mp3"
        }}
        autoPlayBookSlug="ephesians"
      />
    );

    await waitFor(() => {
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY)).toBeNull();
  });
});
