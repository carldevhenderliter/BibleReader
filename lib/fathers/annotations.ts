import { lookupGreekDictionary } from "@/lib/bible/greek";
import { searchBible } from "@/lib/bible/search";
import type { BibleSearchVerseEntry, GreekToken } from "@/lib/bible/types";
import { NA1_FATHERS_WORK_SLUGS } from "@/lib/fathers/constants";
import type {
  FathersEnglishToken,
  FathersGreekUndertextAnnotation,
  FathersGreekUndertextAnnotationFile,
  FathersGreekUndertextAnnotationRecord,
  FathersWorkMeta
} from "@/lib/fathers/types";

export const NA1_GREEK_ANNOTATION_WORK_SLUGS = NA1_FATHERS_WORK_SLUGS;

export type Na1GreekAnnotationWorkSlug = (typeof NA1_GREEK_ANNOTATION_WORK_SLUGS)[number];

export type FathersGreekUndertextSuggestion = {
  greekText: string;
  entryKey: string;
  lemma: string;
  strongs?: string;
  transliteration?: string;
  gloss?: string;
};

export type FathersScriptureLookupResult = {
  id: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  label: string;
  description: string;
  preview: string;
  greekTokens?: GreekToken[];
};

const NA1_GREEK_ANNOTATION_WORK_SLUG_SET = new Set<string>(NA1_GREEK_ANNOTATION_WORK_SLUGS);
const ENGLISH_WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;
let esvVerseIndexPromise: Promise<BibleSearchVerseEntry[]> | null = null;

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value);
}

export function isNa1GreekAnnotationWork(work: string | FathersWorkMeta) {
  const slug = typeof work === "string" ? work : work.slug;

  return NA1_GREEK_ANNOTATION_WORK_SLUG_SET.has(slug);
}

export function tokenizeFathersEnglishText(text: string): FathersEnglishToken[] {
  if (!text) {
    return [];
  }

  const tokens: FathersEnglishToken[] = [];
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

export function getFathersEnglishWordCount(tokens: FathersEnglishToken[]) {
  return tokens.reduce((count, token) => count + (token.type === "word" ? 1 : 0), 0);
}

export function getAddableFathersAnnotationWordIndexes(
  tokens: FathersEnglishToken[],
  annotations: FathersGreekUndertextAnnotation[]
) {
  const wordIndexes = tokens.reduce<number[]>((result, token) => {
    if (token.type === "word" && token.wordIndex !== undefined) {
      result.push(token.wordIndex);
    }

    return result;
  }, []);

  if (!wordIndexes.length) {
    return [];
  }

  if (!annotations.length) {
    return wordIndexes;
  }

  const addableWordIndexes = new Set<number>();
  const annotatedWordIndexes = new Set<number>();

  annotations.forEach((annotation) => {
    for (let wordIndex = annotation.startToken; wordIndex <= annotation.endToken; wordIndex += 1) {
      annotatedWordIndexes.add(wordIndex);
    }

    addableWordIndexes.add(annotation.startToken - 1);
    addableWordIndexes.add(annotation.endToken + 1);
  });

  return wordIndexes.filter(
    (wordIndex) => addableWordIndexes.has(wordIndex) && !annotatedWordIndexes.has(wordIndex)
  );
}

export function getFathersEnglishSpanText(
  tokens: FathersEnglishToken[],
  startToken: number,
  endToken: number
) {
  if (startToken > endToken) {
    return "";
  }

  let started = false;
  let completed = false;
  let text = "";

  for (const token of tokens) {
    if (token.type === "word") {
      if (token.wordIndex === startToken) {
        started = true;
      }

      if (!started || completed || token.wordIndex === undefined) {
        continue;
      }

      text += token.text;

      if (token.wordIndex === endToken) {
        completed = true;
      }

      continue;
    }

    if (started && !completed) {
      text += token.text;
    }
  }

  return text.trim();
}

export function annotationContainsWord(
  annotation: FathersGreekUndertextAnnotation,
  wordIndex: number
) {
  return annotation.startToken <= wordIndex && annotation.endToken >= wordIndex;
}

export function annotationsIntersect(
  left: Pick<FathersGreekUndertextAnnotation, "startToken" | "endToken">,
  right: Pick<FathersGreekUndertextAnnotation, "startToken" | "endToken">
) {
  return left.startToken <= right.endToken && right.startToken <= left.endToken;
}

export function findIntersectingAnnotation(
  annotations: FathersGreekUndertextAnnotation[],
  startToken: number,
  endToken: number
) {
  return (
    annotations.find((annotation) =>
      annotationsIntersect(annotation, {
        startToken,
        endToken
      })
    ) ?? null
  );
}

export function replaceSegmentAnnotation(
  annotations: FathersGreekUndertextAnnotation[],
  nextAnnotation: FathersGreekUndertextAnnotation
) {
  return [...annotations.filter((annotation) => !annotationsIntersect(annotation, nextAnnotation)), nextAnnotation]
    .sort((left, right) => left.startToken - right.startToken);
}

export function removeSegmentAnnotation(
  annotations: FathersGreekUndertextAnnotation[],
  target: Pick<FathersGreekUndertextAnnotation, "segmentId" | "startToken" | "endToken">
) {
  return annotations.filter(
    (annotation) =>
      !(
        annotation.segmentId === target.segmentId &&
        annotation.startToken === target.startToken &&
        annotation.endToken === target.endToken
      )
  );
}

export function normalizeFathersGreekUndertextAnnotationFile(
  workSlug: string,
  value: unknown
): FathersGreekUndertextAnnotationFile {
  const candidate = value as Partial<FathersGreekUndertextAnnotationFile> | null;
  const annotations =
    candidate && typeof candidate === "object" && candidate.annotations && typeof candidate.annotations === "object"
      ? candidate.annotations
      : {};

  return {
    workSlug,
    annotations: Object.fromEntries(
      Object.entries(annotations).map(([segmentId, segmentAnnotations]) => [
        segmentId,
        normalizeSegmentAnnotations(segmentId, Array.isArray(segmentAnnotations) ? segmentAnnotations : [], Number.MAX_SAFE_INTEGER)
      ])
    )
  };
}

export function normalizeSegmentAnnotations(
  segmentId: string,
  annotations: unknown[],
  wordCount: number
): FathersGreekUndertextAnnotation[] {
  const normalizedAnnotations = annotations.reduce<FathersGreekUndertextAnnotation[]>(
    (result, annotation) => {
      const candidate = annotation as Partial<FathersGreekUndertextAnnotation> | null;
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

      result.push({
        segmentId,
        startToken: candidate.startToken,
        endToken: candidate.endToken,
        greekText,
        entryKey:
          typeof candidate.entryKey === "string" && candidate.entryKey.trim()
            ? candidate.entryKey.trim()
            : undefined,
        lemma:
          typeof candidate.lemma === "string" && candidate.lemma.trim()
            ? candidate.lemma.trim()
            : undefined,
        strongs:
          typeof candidate.strongs === "string" && candidate.strongs.trim()
            ? candidate.strongs.trim()
            : undefined,
        transliteration:
          typeof candidate.transliteration === "string" && candidate.transliteration.trim()
            ? candidate.transliteration.trim()
            : undefined,
        gloss:
          typeof candidate.gloss === "string" && candidate.gloss.trim()
            ? candidate.gloss.trim()
            : undefined,
        source: candidate.source === "custom" ? "custom" : "lexicon"
      });

      return result;
    },
    []
  ).sort((left, right) => left.startToken - right.startToken);

  for (let index = 1; index < normalizedAnnotations.length; index += 1) {
    const current = normalizedAnnotations[index];
    const previous = normalizedAnnotations[index - 1];

    if (current && previous && annotationsIntersect(previous, current)) {
      throw new Error(`Overlapping undertext annotations are not allowed for segment ${segmentId}.`);
    }
  }

  return normalizedAnnotations;
}

export function buildFathersGreekUndertextAnnotationRecord(
  segments: Array<{
    id: string;
    englishTokens?: FathersEnglishToken[];
  }>,
  annotations: FathersGreekUndertextAnnotationRecord
) {
  return Object.fromEntries(
    segments.map((segment) => {
      const wordCount = getFathersEnglishWordCount(segment.englishTokens ?? []);

      return [
        segment.id,
        normalizeSegmentAnnotations(segment.id, annotations[segment.id] ?? [], wordCount)
      ];
    })
  );
}

function dedupeGreekUndertextSuggestions(
  suggestions: FathersGreekUndertextSuggestion[],
  limit: number
) {
  const seenKeys = new Set<string>();
  const deduped: FathersGreekUndertextSuggestion[] = [];

  for (const suggestion of suggestions) {
    const dedupeKey = suggestion.entryKey || suggestion.lemma;

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

async function lookupGreekSuggestionsFromQuery(query: string) {
  const matches = await lookupGreekDictionary(query, 8);

  return matches.map((match) => ({
    greekText: match.entry.lemma,
    entryKey: match.entry.entryKey,
    lemma: match.entry.lemma,
    strongs: match.entry.strongs,
    transliteration: match.entry.transliteration,
    gloss: match.entry.shortDefinition
  }));
}

async function getEsvVerseIndex() {
  if (!esvVerseIndexPromise) {
    esvVerseIndexPromise = import("@/data/bible/search/esv.json").then(
      (module) => ((module as { default: BibleSearchVerseEntry[] }).default ?? [])
    );
  }

  return esvVerseIndexPromise;
}

export async function searchGreekUndertextSuggestions(query: string, limit = 8) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const matches = await lookupGreekDictionary(trimmedQuery, limit * 2);

  return dedupeGreekUndertextSuggestions(
    matches
      .filter((match) => match.matchType === "gloss")
      .map((match) => ({
        greekText: match.entry.lemma,
        entryKey: match.entry.entryKey,
        lemma: match.entry.lemma,
        strongs: match.entry.strongs,
        transliteration: match.entry.transliteration,
        gloss: match.entry.shortDefinition
      })),
    limit
  );
}

export async function searchScriptureUndertextPassages(query: string, limit = 8) {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const [results, esvVerseIndex] = await Promise.all([
    searchBible(trimmedQuery, "esv"),
    getEsvVerseIndex()
  ]);
  const verseEntriesByKey = new Map(
    esvVerseIndex.map((entry) => [
      `${entry.bookSlug}:${entry.chapterNumber}:${entry.verseNumber}`,
      entry
    ])
  );

  return results
    .filter(
      (result): result is Extract<(typeof results)[number], { type: "verse" }> => result.type === "verse"
    )
    .slice(0, limit)
    .map((result) => {
      const verseEntry = verseEntriesByKey.get(
        `${result.bookSlug}:${result.chapterNumber}:${result.verseNumber}`
      );

      return {
        id: result.id,
        bookSlug: result.bookSlug,
        chapterNumber: result.chapterNumber,
        verseNumber: result.verseNumber,
        label: result.label,
        description: result.description,
        preview: result.preview,
        greekTokens: verseEntry?.greekTokens
      } satisfies FathersScriptureLookupResult;
    });
}

export async function buildGreekUndertextSuggestions(
  selectedText: string,
  selectedWords: string[],
  limit = 8
) {
  const queries = [selectedText.trim(), ...selectedWords.map((word) => word.trim())].filter(Boolean);
  const suggestions: FathersGreekUndertextSuggestion[] = [];

  for (const query of queries) {
    const querySuggestions = await lookupGreekSuggestionsFromQuery(query);

    suggestions.push(...querySuggestions);

    if (suggestions.length >= limit * 2) {
      break;
    }
  }

  return dedupeGreekUndertextSuggestions(suggestions, limit);
}

export async function resolveCustomGreekUndertext(text: string) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return null;
  }

  const [match] = await lookupGreekDictionary(trimmedText, 1);

  if (!match) {
    return null;
  }

  return {
    greekText: trimmedText,
    entryKey: match.entry.entryKey,
    lemma: match.entry.lemma,
    strongs: match.entry.strongs,
    transliteration: match.entry.transliteration,
    gloss: match.entry.shortDefinition
  } satisfies FathersGreekUndertextSuggestion;
}
