import type { StrongsEntry } from "@/lib/bible/types";

let strongsLexiconPromise: Promise<Record<string, StrongsEntry>> | null = null;

export function normalizeStrongsNumber(value: string) {
  const match = value.trim().toUpperCase().match(/^([HG])\s*0*(\d+)$/);

  if (!match) {
    return value.trim().toUpperCase();
  }

  const [, prefix, digits] = match;
  const numericValue = Number(digits);

  return Number.isFinite(numericValue) && numericValue > 0
    ? `${prefix}${numericValue}`
    : `${prefix}${digits}`;
}

async function loadStrongsLexicon() {
  if (!strongsLexiconPromise) {
    strongsLexiconPromise = import("@/data/bible/strongs/lexicon.json").then(
      (module) => (module.default ?? {}) as Record<string, StrongsEntry>
    );
  }

  return strongsLexiconPromise;
}

export async function getStrongsEntries(strongsNumbers: string[]) {
  const lexicon = await loadStrongsLexicon();

  return strongsNumbers
    .map((strongsNumber) => lexicon[normalizeStrongsNumber(strongsNumber)] ?? null)
    .filter((entry): entry is StrongsEntry => entry !== null);
}

export async function getStrongsEntry(strongsNumber: string) {
  const lexicon = await loadStrongsLexicon();

  return lexicon[normalizeStrongsNumber(strongsNumber)] ?? null;
}
