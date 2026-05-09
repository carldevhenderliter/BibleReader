import { normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { BibleSearchVerseEntry, GreekLemmaEntry, GreekToken } from "@/lib/bible/types";

type StrongsHighlightMode = "strongs" | "greek";

function normalizeEnglishPhrase(phrase: string) {
  return phrase.replace(/\s+/g, " ").trim();
}

function splitGlossCandidates(gloss: string) {
  return gloss
    .split(/\s*(?:,|;|\/|\bor\b)\s*/i)
    .map((part) => normalizeEnglishPhrase(part))
    .filter(Boolean);
}

function pluralizeEnglishWord(word: string) {
  if (/[^a-z]/i.test(word)) {
    return word;
  }

  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(word)) {
    return `${word.slice(0, -1)}ies`;
  }

  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return `${word}es`;
  }

  return `${word}s`;
}

function singularizeEnglishWord(word: string) {
  if (/[^a-z]/i.test(word)) {
    return word;
  }

  if (/[bcdfghjklmnpqrstvwxyz]ies$/i.test(word)) {
    return `${word.slice(0, -3)}y`;
  }

  if (/(s|x|z|ch|sh)es$/i.test(word)) {
    return word.slice(0, -2);
  }

  if (/s$/i.test(word) && !/ss$/i.test(word)) {
    return word.slice(0, -1);
  }

  return word;
}

function expandEnglishPhraseVariants(phrase: string) {
  const normalized = normalizeEnglishPhrase(phrase);

  if (!normalized) {
    return [];
  }

  const variants = new Set<string>([normalized]);
  const stripped = normalized.replace(/^(?:the|a|an|this|that|these|those)\s+/i, "").trim();

  if (stripped) {
    variants.add(stripped);
  }

  for (const candidate of [normalized, stripped].filter(Boolean)) {
    const match = candidate.match(/^(.*\b)?([A-Za-z]+)$/);

    if (!match) {
      continue;
    }

    const prefix = match[1] ?? "";
    const lastWord = match[2];
    const plural = pluralizeEnglishWord(lastWord);
    const singular = singularizeEnglishWord(lastWord);

    variants.add(`${prefix}${plural}`.trim());
    variants.add(`${prefix}${singular}`.trim());
  }

  return Array.from(variants).filter(Boolean);
}

function matchesGreekTokenEntry(token: GreekToken, entryId: string) {
  const tokenEntryKey = token.entryKey ?? token.strongs ?? null;

  return (
    tokenEntryKey === entryId ||
    (token.strongs ? normalizeStrongsNumber(token.strongs) === normalizeStrongsNumber(entryId) : false)
  );
}

export function getStrongsEnglishHighlightPhrases(
  entryId: string,
  match: Pick<BibleSearchVerseEntry, "tokens" | "greekTokens">,
  mode: StrongsHighlightMode
) {
  const tokenTextMatches = Array.from(
    new Set(
      (match.tokens ?? [])
        .filter((token) =>
          token.strongsNumbers?.some(
            (strongsNumber) => normalizeStrongsNumber(strongsNumber) === normalizeStrongsNumber(entryId)
          )
        )
        .map((token) => token.text.trim())
        .filter(Boolean)
    )
  );

  if (tokenTextMatches.length > 0) {
    return tokenTextMatches;
  }

  if (mode === "greek") {
    return Array.from(
      new Set(
        (match.greekTokens ?? [])
          .filter((token) => matchesGreekTokenEntry(token, entryId))
          .flatMap((token) =>
            token.gloss
              ? splitGlossCandidates(token.gloss).flatMap((phrase) => expandEnglishPhraseVariants(phrase))
              : []
          )
          .filter(Boolean)
      )
    );
  }

  return [];
}

export function getStrongsGreekHighlightPhrases(
  entryId: string,
  options?: {
    sourceEntry?: Pick<GreekLemmaEntry, "lemma" | "forms"> | null;
    match?: Pick<BibleSearchVerseEntry, "greekTokens"> | null;
  }
) {
  const entryPhrases =
    options?.sourceEntry
      ? [
          options.sourceEntry.lemma,
          ...options.sourceEntry.forms.map((form) => form.form)
        ]
      : [];
  const tokenPhrases =
    options?.match?.greekTokens
      ?.filter((token) => matchesGreekTokenEntry(token, entryId))
      .flatMap((token) => [token.surface, token.lemma])
      ?? [];

  return Array.from(
    new Set(
      [...entryPhrases, ...tokenPhrases]
        .map((phrase) => phrase.trim())
        .filter(Boolean)
    )
  );
}
