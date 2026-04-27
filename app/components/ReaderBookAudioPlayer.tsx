import type { BookAudioSource } from "@/lib/bible/book-audio";

type ReaderBookAudioPlayerProps = {
  audioSource: BookAudioSource | null;
  emptyMessage?: string;
};

export function ReaderBookAudioPlayer({
  audioSource,
  emptyMessage = "No audio file available for this reader yet."
}: ReaderBookAudioPlayerProps) {
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
        preload="none"
        src={audioSource?.assetPath}
        aria-disabled={audioSource ? undefined : true}
      >
        Your browser does not support audio playback.
      </audio>
    </div>
  );
}
