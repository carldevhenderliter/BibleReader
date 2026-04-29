import { useEffect, useRef, useState } from "react";

import {
  BOOK_AUDIO_AUTOPLAY_STORAGE_KEY,
  type BookAudioSource
} from "@/lib/bible/book-audio";

type ReaderBookAudioPlayerProps = {
  audioSource: BookAudioSource | null;
  autoPlayBookSlug?: string | null;
  emptyMessage?: string;
  onEnded?: () => void;
};

export function ReaderBookAudioPlayer({
  audioSource,
  autoPlayBookSlug = null,
  emptyMessage = "No audio file available for this reader yet.",
  onEnded
}: ReaderBookAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAutoplayPending, setIsAutoplayPending] = useState(false);

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
    <div className="reader-audio-bar" role="region" aria-label="Book audio">
      <div className="reader-audio-copy">
        <p className="reader-toolbar-summary">Book audio</p>
        <p className="reader-toolbar-meta">
          {audioSource?.sourceFilename ?? emptyMessage}
        </p>
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
      <audio
        autoPlay={isAutoplayPending}
        className="reader-audio-player"
        controls
        onEnded={onEnded}
        preload="none"
        ref={audioRef}
        src={audioSource?.assetPath}
        aria-disabled={audioSource ? undefined : true}
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
