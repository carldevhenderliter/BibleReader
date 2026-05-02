import { useEffect, useRef, useState } from "react";

import {
  BOOK_AUDIO_AUTOPLAY_STORAGE_KEY,
  type BookAudioSource
} from "@/lib/bible/book-audio";
import {
  AUDIO_PLAYER_VISIBILITY_STORAGE_KEY,
  LAST_AUDIO_SESSION_STORAGE_KEY
} from "@/lib/bible/constants";
import type { BibleVersion, ReadingView } from "@/lib/bible/types";

type ReaderAudioResumeSession = {
  autoplayKey: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  view: ReadingView;
  version: BibleVersion;
  href: string;
};

type ReaderBookAudioPlayerProps = {
  audioSource: BookAudioSource | null;
  autoPlayBookSlug?: string | null;
  emptyMessage?: string;
  nextUpLabel?: string | null;
  resumeSession?: ReaderAudioResumeSession | null;
  onEnded?: () => void;
};

export function ReaderBookAudioPlayer({
  audioSource,
  autoPlayBookSlug = null,
  emptyMessage = "No audio file available for this reader yet.",
  nextUpLabel = null,
  resumeSession = null,
  onEnded
}: ReaderBookAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAutoplayPending, setIsAutoplayPending] = useState(false);
  const [hasFinishedQueue, setHasFinishedQueue] = useState(false);
  const [isPlayerVisible, setIsPlayerVisible] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsPlayerVisible(
      window.localStorage.getItem(AUDIO_PLAYER_VISIBILITY_STORAGE_KEY) !== "false"
    );
  }, []);

  const persistPlayerVisibility = (isVisible: boolean) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      AUDIO_PLAYER_VISIBILITY_STORAGE_KEY,
      isVisible ? "true" : "false"
    );
  };

  const setPlayerVisibility = (isVisible: boolean) => {
    setIsPlayerVisible(isVisible);
    persistPlayerVisibility(isVisible);
  };

  const persistResumeSession = () => {
    if (typeof window === "undefined" || !audioSource || !resumeSession) {
      return;
    }

    window.localStorage.setItem(
      LAST_AUDIO_SESSION_STORAGE_KEY,
      JSON.stringify({
        ...resumeSession,
        sourceFilename: audioSource.sourceFilename,
        updatedAt: new Date().toISOString()
      })
    );
  };

  useEffect(() => {
    if (typeof window === "undefined" || !autoPlayBookSlug || !audioSource) {
      setIsAutoplayPending(false);
      return;
    }

    setIsAutoplayPending(
      window.sessionStorage.getItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY) === autoPlayBookSlug
    );
  }, [audioSource, autoPlayBookSlug]);

  useEffect(() => {
    setHasFinishedQueue(false);
  }, [audioSource?.assetPath]);

  useEffect(() => {
    if (audioSource && isAutoplayPending) {
      setPlayerVisibility(true);
    }
  }, [audioSource, isAutoplayPending]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !autoPlayBookSlug ||
      !audioSource ||
      !isAutoplayPending
    ) {
      return;
    }

    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    let isCancelled = false;

    const clearAutoplayPending = () => {
      if (isCancelled) {
        return;
      }

      if (
        window.sessionStorage.getItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY) === autoPlayBookSlug
      ) {
        window.sessionStorage.removeItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY);
      }

      setIsAutoplayPending(false);
    };

    const attemptPlay = () => {
      const playResult = audioElement.play();

      if (typeof playResult?.then === "function") {
        void playResult.then(clearAutoplayPending).catch(() => {
          // Ignore autoplay failures and leave the player ready for manual playback.
        });
        return;
      }

      clearAutoplayPending();
    };

    const handleCanPlay = () => {
      attemptPlay();
    };

    const handlePlay = () => {
      clearAutoplayPending();
    };

    audioElement.addEventListener("canplay", handleCanPlay);
    audioElement.addEventListener("play", handlePlay);
    audioElement.load();
    attemptPlay();

    return () => {
      isCancelled = true;
      audioElement.removeEventListener("canplay", handleCanPlay);
      audioElement.removeEventListener("play", handlePlay);
    };
  }, [audioSource, autoPlayBookSlug, isAutoplayPending]);

  return (
    <div className={`reader-audio-drawer${isPlayerVisible ? " is-visible" : " is-hidden"}`}>
      <div
        aria-hidden={!isPlayerVisible}
        className="reader-audio-drawer-panel"
        id="reader-audio-panel"
      >
        <div className="reader-audio-bar" role="region" aria-label="Book audio">
          <div className="reader-audio-copy">
            <p className="reader-toolbar-summary">Book audio</p>
            <p className="reader-toolbar-meta">{audioSource?.sourceFilename ?? emptyMessage}</p>
            {audioSource && resumeSession ? (
              <p className="reader-toolbar-meta">
                Now playing:{" "}
                {resumeSession.view === "chapter"
                  ? `${resumeSession.bookName} ${resumeSession.chapter}`
                  : resumeSession.bookName}
              </p>
            ) : null}
            {audioSource ? (
              <p className="reader-toolbar-meta">
                {nextUpLabel
                  ? `Next audio: ${nextUpLabel}`
                  : hasFinishedQueue
                    ? "Audio queue complete."
                    : "No later book audio in the current queue."}
              </p>
            ) : null}
            {audioSource ? (
              <a
                className="reader-audio-link"
                href={audioSource.assetPath}
                target="_blank"
                rel="noreferrer"
              >
                Open audio file
              </a>
            ) : null}
          </div>
          <button
            aria-expanded={isPlayerVisible}
            className="reader-inline-button reader-audio-toggle"
            onClick={() => setPlayerVisibility(false)}
            type="button"
          >
            Hide audio
          </button>
          <audio
            autoPlay={isAutoplayPending}
            className="reader-audio-player"
            controls
            onEnded={() => {
              setHasFinishedQueue(!nextUpLabel);
              onEnded?.();
            }}
            onPause={persistResumeSession}
            onPlay={() => {
              setPlayerVisibility(true);
              setHasFinishedQueue(false);
              persistResumeSession();
            }}
            preload="none"
            ref={audioRef}
            src={audioSource?.assetPath}
            aria-disabled={audioSource ? undefined : true}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
      {!isPlayerVisible ? (
        <button
          aria-controls="reader-audio-panel"
          aria-label="Show audio"
          className="reader-inline-button reader-audio-drawer-tab"
          onClick={() => setPlayerVisibility(true)}
          type="button"
        >
          Audio
        </button>
      ) : null}
    </div>
  );
}
