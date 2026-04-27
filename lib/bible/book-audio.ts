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

export function getBookAudioSource(bookSlug: string): BookAudioSource | null {
  const entry = BOOK_AUDIO_MANIFEST[bookSlug];

  if (!entry) {
    return null;
  }

  return {
    ...entry,
    assetPath: getAssetPath(entry.src)
  };
}
