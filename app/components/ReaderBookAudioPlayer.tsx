import { useEffect, useRef } from "react";

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

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !autoPlayBookSlug ||
      !audioSource ||
      window.sessionStorage.getItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY) !== autoPlayBookSlug
    ) {
      return;
    }

    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    window.sessionStorage.removeItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY);

    const attemptPlay = () => {
      void audioElement.play().catch(() => {
        // Ignore autoplay failures and leave the player ready for manual playback.
      });
    };

    if (audioElement.readyState >= 2) {
      attemptPlay();
      return;
    }

    const handleCanPlay = () => {
      audioElement.removeEventListener("canplay", handleCanPlay);
      attemptPlay();
    };

    audioElement.addEventListener("canplay", handleCanPlay);
    audioElement.load();

    return () => {
      audioElement.removeEventListener("canplay", handleCanPlay);
    };
  }, [audioSource, autoPlayBookSlug]);

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
