import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReaderBookAudioPlayer } from "@/app/components/ReaderBookAudioPlayer";
import {
  ReaderBottomBarProvider,
  useReaderBottomBar
} from "@/app/components/ReaderBottomBarProvider";
import { BOOK_AUDIO_AUTOPLAY_STORAGE_KEY } from "@/lib/bible/book-audio";
import { AUDIO_PLAYER_VISIBILITY_STORAGE_KEY } from "@/lib/bible/constants";

function ReaderBottomBarDockControlHost() {
  const { bottomBarDockControl } = useReaderBottomBar();

  return bottomBarDockControl ? <div data-testid="reader-bottom-bar-dock-control">{bottomBarDockControl}</div> : null;
}

describe("ReaderBookAudioPlayer", () => {
  const originalPlay = HTMLMediaElement.prototype.play;
  const originalLoad = HTMLMediaElement.prototype.load;
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "readyState"
  );

  beforeEach(() => {
    window.localStorage.clear();
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

  it("lets the reader hide and show the audio player", () => {
    render(
      <ReaderBottomBarProvider>
        <ReaderBookAudioPlayer
          audioSource={{
            bookSlug: "galatians",
            sourceFilename: "Galatians.mp3",
            src: "/book-audio/galatians.mp3",
            assetPath: "/book-audio/galatians.mp3"
          }}
        />
        <ReaderBottomBarDockControlHost />
      </ReaderBottomBarProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide audio" }));

    expect(screen.getByRole("button", { name: "Show audio" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Book audio" })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(AUDIO_PLAYER_VISIBILITY_STORAGE_KEY)).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Show audio" }));

    expect(screen.getByRole("button", { name: "Hide audio" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Book audio" })).toBeInTheDocument();
    expect(window.localStorage.getItem(AUDIO_PLAYER_VISIBILITY_STORAGE_KEY)).toBe("true");
  });
});
