import {
  buildGreekUndertextSuggestions,
  resolveCustomGreekUndertext
} from "@/lib/fathers/annotations";
import type {
  BibleGreekUndertextAnnotation,
  BibleGreekUndertextAnnotationRecord,
  EnglishToken,
  GreekToken
} from "@/lib/bible/types";

export const BIBLE_GREEK_UNDERTEXT_STORAGE_KEY = "bible-reader:bible-greek-undertext";

const ENGLISH_WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

type BibleUndertextSuggestion = {
  greekText: string;
  entryKey: string;
  lemma: string;
  strongs?: string;
  transliteration?: string;
  gloss?: string;
  source: "verse-token" | "lexicon";
};

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

function normalizeEnglishSearchValue(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function dedupeSuggestions(suggestions: BibleUndertextSuggestion[], limit: number) {
  const seenKeys = new Set<string>();
  const deduped: BibleUndertextSuggestion[] = [];

  for (const suggestion of suggestions) {
    const dedupeKey = suggestion.entryKey || suggestion.lemma || suggestion.greekText;

    if (!dedupeKey || seenKeys.has(dedupeKey)) {
      continue;
    }

    seenKeys.add(dedupeKey);
    deduped.push(suggestion);

    if (deduped.length >= limit) {
      break;
    }
  }

  return deduped;
}

export function getBibleVerseAnnotationKey(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number
) {
  return `${bookSlug}:${chapterNumber}:${verseNumber}`;
}

export function tokenizeBibleEnglishText(text: string): EnglishToken[] {
  if (!text) {
    return [];
  }

  ENGLISH_WORD_PATTERN.lastIndex = 0;
  const tokens: EnglishToken[] = [];
  let lastIndex = 0;
  let wordIndex = 0;
  let match = ENGLISH_WORD_PATTERN.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "separator",
        text: text.slice(lastIndex, match.index)
      });
    }

    tokens.push({
      type: "word",
      text: match[0],
      wordIndex
    });

    lastIndex = match.index + match[0].length;
    wordIndex += 1;
    match = ENGLISH_WORD_PATTERN.exec(text);
  }

  ENGLISH_WORD_PATTERN.lastIndex = 0;

  if (lastIndex < text.length) {
    tokens.push({
      type: "separator",
      text: text.slice(lastIndex)
    });
  }

  return tokens;
}

export function normalizeBibleGreekUndertextAnnotations(
  verseKey: string,
  annotations: unknown[],
  wordCount: number
): BibleGreekUndertextAnnotation[] {
  const normalized = annotations.reduce<BibleGreekUndertextAnnotation[]>((result, annotation) => {
    const candidate = annotation as Partial<BibleGreekUndertextAnnotation> | null;
    const greekText = candidate?.greekText?.trim();

    if (
      !candidate ||
      !greekText ||
      !isFiniteInteger(candidate.startToken) ||
      !isFiniteInteger(candidate.endToken) ||
      candidate.startToken < 0 ||
      candidate.endToken < candidate.startToken ||
      candidate.endToken >= wordCount
    ) {
      return result;
    }

    if (
      candidate.source !== "verse-token" &&
      candidate.source !== "lexicon" &&
      candidate.source !== "custom"
    ) {
      return result;
    }

    result.push({
      verseKey,
      startToken: candidate.startToken,
      endToken: candidate.endToken,
      greekText,
      entryKey: typeof candidate.entryKey === "string" ? candidate.entryKey : undefined,
      lemma: typeof candidate.lemma === "string" ? candidate.lemma : undefined,
      strongs: typeof candidate.strongs === "string" ? candidate.strongs : undefined,
      transliteration:
        typeof candidate.transliteration === "string" ? candidate.transliteration : undefined,
      gloss: typeof candidate.gloss === "string" ? candidate.gloss : undefined,
      source: candidate.source
    });

    return result;
  }, []);

  normalized.sort((left, right) => left.startToken - right.startToken);

  return normalized.reduce<BibleGreekUndertextAnnotation[]>((result, current) => {
    const previous = result[result.length - 1];

    if (previous && previous.endToken >= current.startToken) {
      return result;
    }

    result.push(current);
    return result;
  }, []);
}

export function normalizeBibleGreekUndertextAnnotationStorage(
  value: unknown
): BibleGreekUndertextAnnotationRecord {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<BibleGreekUndertextAnnotationRecord>(
    (normalized, [verseKey, annotations]) => {
      const wordCount = Number.MAX_SAFE_INTEGER;
      normalized[verseKey] = normalizeBibleGreekUndertextAnnotations(
        verseKey,
        Array.isArray(annotations) ? annotations : [],
        wordCount
      );
      return normalized;
    },
    {}
  );
}

function buildVerseTokenSuggestions(
  greekTokens: GreekToken[],
  selectedText: string,
  selectedWords: string[],
  limit: number
) {
  const queries = [selectedText, ...selectedWords]
    .map((query) => normalizeEnglishSearchValue(query))
    .filter(Boolean);

  if (!queries.length) {
    return [];
  }

  const suggestions = greekTokens.reduce<BibleUndertextSuggestion[]>((result, token) => {
    const gloss = normalizeEnglishSearchValue(token.gloss);

    if (!gloss) {
      return result;
    }

    if (!queries.some((query) => gloss.includes(query) || query.includes(gloss))) {
      return result;
    }

    result.push({
      greekText: token.surface,
      entryKey: token.entryKey ?? token.strongs ?? token.lemma,
      lemma: token.lemma,
      strongs: token.strongs,
      transliteration: token.transliteration,
      gloss: token.gloss,
      source: "verse-token"
    });

    return result;
  }, []);

  return dedupeSuggestions(suggestions, limit);
}

export async function buildBibleGreekUndertextSuggestions(
  selectedText: string,
  selectedWords: string[],
  greekTokens: GreekToken[],
  limit = 8
) {
  const verseSuggestions = buildVerseTokenSuggestions(greekTokens, selectedText, selectedWords, limit);
  const lexiconSuggestions = await buildGreekUndertextSuggestions(selectedText, selectedWords, limit);

  return dedupeSuggestions(
    [
      ...verseSuggestions,
      ...lexiconSuggestions.map((suggestion) => ({
        ...suggestion,
        source: "lexicon" as const
      }))
    ],
    limit
  );
}

export { resolveCustomGreekUndertext };
