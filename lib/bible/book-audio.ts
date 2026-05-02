import manifest from "@/data/source/book-audio-manifest.json";
import { getAssetPath } from "@/lib/asset-path";
import { getBooksForOrderMode, type BibleBookOrderMode } from "@/lib/bible/book-order";
import type { BookMeta } from "@/lib/bible/types";

type BookAudioManifestEntry = {
  bookSlug: string;
  sourceFilename: string;
  src: string;
};

type BookAudioManifest = Record<string, BookAudioManifestEntry>;

export type BookAudioSource = BookAudioManifestEntry & {
  assetPath: string;
};

export const BOOK_AUDIO_AUTOPLAY_STORAGE_KEY = "bible-reader.book-audio-autoplay";

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

export function getNextBookWithAudio(
  books: BookMeta[],
  currentBookSlug: string,
  mode: BibleBookOrderMode
): BookMeta | null {
  const orderedBooks = getBooksForOrderMode(books, mode);
  const currentBookIndex = orderedBooks.findIndex((book) => book.slug === currentBookSlug);

  if (currentBookIndex === -1) {
    return null;
  }

  for (let index = currentBookIndex + 1; index < orderedBooks.length; index += 1) {
    const nextBook = orderedBooks[index];

    if (nextBook && getBookAudioSource(nextBook.slug)) {
      return nextBook;
    }
  }

  return null;
}
