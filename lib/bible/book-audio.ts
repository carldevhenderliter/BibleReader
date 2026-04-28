import manifest from "@/data/source/book-audio-manifest.json";
import { getAssetPath } from "@/lib/asset-path";

type BookAudioManifestEntry = {
  bookSlug: string;
  sourceFilename: string;
  src: string;
};

type BookAudioManifest = Record<string, BookAudioManifestEntry>;

export type BookAudioSource = BookAudioManifestEntry & {
  assetPath: string;
};

const BOOK_AUDIO_MANIFEST = manifest as BookAudioManifest;
const BOOK_AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"] as const;

function toBookAudioSource(entry: BookAudioManifestEntry): BookAudioSource {
  return {
    ...entry,
    assetPath: getAssetPath(entry.src)
  };
}

export function getBookAudioSource(bookSlug: string): BookAudioSource | null {
  const entry = BOOK_AUDIO_MANIFEST[bookSlug];

  return entry ? toBookAudioSource(entry) : null;
}

export function getBookAudioSourceFromManifest(
  bookSlug: string,
  manifestEntries: Record<string, BookAudioManifestEntry>
): BookAudioSource | null {
  const entry = manifestEntries[bookSlug];

  return entry ? toBookAudioSource(entry) : null;
}

export function getBookAudioCandidateSources(bookSlug: string): BookAudioSource[] {
  return BOOK_AUDIO_EXTENSIONS.map((extension) => {
    const sourceFilename = `${bookSlug}${extension}`;
    const src = `/book-audio/${sourceFilename}`;

    return {
      bookSlug,
      sourceFilename,
      src,
      assetPath: getAssetPath(src)
    };
  });
}
