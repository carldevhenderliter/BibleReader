"use client";

import { useReaderTts } from "@/app/components/ReaderTtsProvider";

export function ReaderTtsControls() {
  const {
    activeEngine,
    hasSource,
    isSupported,
    kokoroProgressLabel,
    kokoroStatus,
    pause,
    play,
    resume,
    status,
    stop
  } = useReaderTts();
  const canStartPlayback = isSupported && hasSource;
  const isPaused = status === "paused";
  const isActive = status === "playing" || status === "paused";
  const statusLabel =
    status === "loading"
      ? kokoroProgressLabel ?? "Preparing HD voice"
      : kokoroStatus === "loading"
        ? kokoroProgressLabel ?? "Downloading HD voice"
        : kokoroStatus === "error"
          ? "HD voice error"
          : kokoroStatus === "unavailable"
            ? "HD voice unavailable"
            : activeEngine === "kokoro"
              ? "HD voice"
              : kokoroStatus === "ready"
                ? "HD voice ready"
                : null;

  return (
    <>
      <button
        aria-label="Play read aloud"
        className="reader-inline-button reader-tts-button"
        disabled={!canStartPlayback || status === "loading"}
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
      {statusLabel ? (
        <span
          className={`reader-controls-status reader-tts-status${
            kokoroStatus === "loading" || status === "loading" ? " is-loading" : ""
          }`}
        >
          {statusLabel}
        </span>
      ) : null}
    </>
  );
}
