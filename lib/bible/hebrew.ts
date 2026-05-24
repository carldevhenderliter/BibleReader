import type { BibleSearchVerseEntry } from "@/lib/bible/types";
import { normalizeStrongsNumber } from "@/lib/bible/strongs";

let hebrewVerseIndexPromise: Promise<BibleSearchVerseEntry[]> | null = null;

async function loadHebrewVerseIndex() {
  if (!hebrewVerseIndexPromise) {
    hebrewVerseIndexPromise = import("@/data/bible/search/mt.json").then(
      (module) => (module.default ?? []) as BibleSearchVerseEntry[]
    );
  }

  return hebrewVerseIndexPromise;
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
  const verseIndex = await loadHebrewVerseIndex();
  const normalizedStrongsNumber = normalizeStrongsNumber(strongsNumber);
  const normalizedSelectedForm = selectedForm
    ? normalizeHebrewFormLookupValue(selectedForm)
    : null;

  return verseIndex.filter((entry) =>
    entry.hebrewTokens?.some((token) => {
      if (!token.strongs) {
        return false;
      }

      const matchesStrongs =
        normalizeStrongsNumber(token.strongs) === normalizedStrongsNumber;
      const matchesForm =
        !normalizedSelectedForm ||
        normalizeHebrewFormLookupValue(token.surface) === normalizedSelectedForm;

      return matchesStrongs && matchesForm;
    })
  );
}
