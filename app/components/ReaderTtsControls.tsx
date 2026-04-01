"use client";

import { useReaderTts } from "@/app/components/ReaderTtsProvider";

export function ReaderTtsControls() {
  const { hasSource, isSupported, pause, play, resume, status, stop } = useReaderTts();
  const canStartPlayback = isSupported && hasSource;
  const isPaused = status === "paused";
  const isActive = status === "playing" || status === "paused";

  return (
    <>
      <button
        aria-label="Play read aloud"
        className="reader-inline-button reader-tts-button"
        disabled={!canStartPlayback}
        onClick={play}
        type="button"
      >
        Play
      </button>
      <button
        aria-label={isPaused ? "Resume read aloud" : "Pause read aloud"}
        className="reader-inline-button reader-tts-button"
        disabled={!isSupported || !isActive}
        onClick={isPaused ? resume : pause}
        type="button"
      >
        {isPaused ? "Resume" : "Pause"}
      </button>
      <button
        aria-label="Stop read aloud"
        className="reader-inline-button reader-tts-button"
        disabled={!isSupported || status === "idle"}
        onClick={stop}
        type="button"
      >
        Stop
      </button>
    </>
  );
}
