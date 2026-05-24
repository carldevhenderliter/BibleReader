import type { BibleSearchVerseEntry, BookMeta } from "@/lib/bible/types";
import { normalizeStrongsNumber } from "@/lib/bible/strongs";

let hebrewVerseIndexPromise: Promise<BibleSearchVerseEntry[]> | null = null;
type HebrewFormReference = [number, number, number];

let hebrewFormIndexPromise: Promise<Record<string, HebrewFormReference[]>> | null = null;
let hebrewBooksPromise: Promise<BookMeta[]> | null = null;

async function loadHebrewVerseIndex() {
  if (!hebrewVerseIndexPromise) {
    hebrewVerseIndexPromise = import("@/data/bible/search/mt.json").then(
      (module) => (module.default ?? []) as BibleSearchVerseEntry[]
    );
  }

  return hebrewVerseIndexPromise;
}

async function loadHebrewFormIndex() {
  if (!hebrewFormIndexPromise) {
    hebrewFormIndexPromise = import("@/data/bible/search/mt-forms.json").then(
      (module) => (module.default ?? {}) as unknown as Record<string, HebrewFormReference[]>
    );
  }

  return hebrewFormIndexPromise;
}

async function loadHebrewBooks() {
  if (!hebrewBooksPromise) {
    hebrewBooksPromise = import("@/data/bible/mt/books.json").then(
      (module) => (module.default ?? []) as BookMeta[]
    );
  }

  return hebrewBooksPromise;
}

export function normalizeHebrewFormLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^\p{Script=Hebrew}\p{L}\p{N}]+/gu, "")
    .trim();
}

export async function getHebrewVerseOccurrences(
  strongsNumber: string,
  selectedForm?: string | null
) {
  const [books, formIndex, verseIndex] = await Promise.all([
    loadHebrewBooks(),
    loadHebrewFormIndex(),
    loadHebrewVerseIndex()
  ]);
  const normalizedStrongsNumber = normalizeStrongsNumber(strongsNumber);
  const normalizedSelectedForm = selectedForm ? normalizeHebrewFormLookupValue(selectedForm) : "";
  const refs = normalizedSelectedForm
    ? formIndex[`${normalizedStrongsNumber}|${normalizedSelectedForm}`] ?? []
    : Object.entries(formIndex)
        .filter(([key]) => key.startsWith(`${normalizedStrongsNumber}|`))
        .flatMap(([, matches]) => matches);
  const verseByReference = new Map(
    verseIndex.map((entry) => [
      `${entry.bookSlug}:${entry.chapterNumber}:${entry.verseNumber}`,
      entry
    ])
  );
  const seenReferences = new Set<string>();

  return refs.reduce<BibleSearchVerseEntry[]>((matches, [bookIndex, chapterNumber, verseNumber]) => {
    const book = books[bookIndex] ?? null;

    if (!book) {
      return matches;
    }

    const referenceKey = `${book.slug}:${chapterNumber}:${verseNumber}`;

    if (seenReferences.has(referenceKey)) {
      return matches;
    }

    seenReferences.add(referenceKey);
    const verseEntry = verseByReference.get(referenceKey);

    if (!verseEntry) {
      return matches;
    }

    matches.push({
      ...verseEntry
    });

    return matches;
  }, []);
}
