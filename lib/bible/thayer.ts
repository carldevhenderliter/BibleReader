import type { StrongsEntry } from "@/lib/bible/types";

export type ParsedRootWord = {
  strongsId: string | null;
  lemma: string | null;
  gloss: string | null;
  raw: string;
};

export type FormattedThayerSection = {
  rootWord: ParsedRootWord | null;
  closestDefinition: string | null;
  coreMeanings: string[];
  extendedMeanings: string[];
  fullThayer: string;
};

function normalizePhrase(phrase: string) {
  return phrase
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function splitOutlineUsage(outlineUsage: string) {
  return Array.from(
    new Set(
      outlineUsage
        .split(/\s*,\s*/g)
        .map((phrase) => normalizePhrase(phrase))
        .filter(Boolean)
    )
  );
}

export function parseThayerRootWord(rootWord: string | null | undefined): ParsedRootWord | null {
  const raw = rootWord?.trim() ?? "";

  if (!raw) {
    return null;
  }

  const parts = raw.split("|").map((part) => part.trim());

  if (parts.length < 3) {
    return {
      strongsId: null,
      lemma: null,
      gloss: null,
      raw
    };
  }

  return {
    strongsId: parts[0] || null,
    lemma: parts[1] || null,
    gloss: normalizePhrase(parts.slice(2).join(" | ")) || null,
    raw
  };
}

export function formatThayerSection(entry: Pick<StrongsEntry, "rootWord" | "outlineUsage">): FormattedThayerSection | null {
  const fullThayer = entry.outlineUsage?.trim() ?? "";

  if (!fullThayer) {
    return null;
  }

  const rootWord = parseThayerRootWord(entry.rootWord);
  const meaningPhrases = splitOutlineUsage(fullThayer);
  const closestDefinition = rootWord?.gloss ?? meaningPhrases[0] ?? null;
  const coreMeanings = meaningPhrases.slice(0, 5);
  const extendedMeanings = meaningPhrases.slice(coreMeanings.length);

  return {
    rootWord,
    closestDefinition,
    coreMeanings,
    extendedMeanings,
    fullThayer
  };
}
