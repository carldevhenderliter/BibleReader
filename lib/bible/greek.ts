import type {
  GreekGlossOption,
  GreekInflectedForm,
  GreekLemmaEntry,
  GreekTokenGlossOverride,
  GreekToken
} from "@/lib/bible/types";
import { normalizeStrongsNumber } from "@/lib/bible/strongs";

type SearchableGreekEntry = GreekLemmaEntry & {
  normalizedLemma: string;
  normalizedTransliteration: string;
  normalizedGloss: string;
};

export type GreekDictionaryMatch = {
  entry: GreekLemmaEntry;
  selectedForm?: GreekInflectedForm;
  selectedFormValue?: string;
  matchType: "strongs" | "lemma" | "form" | "transliteration" | "gloss";
};

type GreekCaseKey = "nominative" | "genitive" | "dative" | "accusative" | "vocative";

export type GreekCaseDetails = {
  key: GreekCaseKey;
  label: string;
  definition: string;
};

const GREEK_CASE_DETAILS: Record<GreekCaseKey, GreekCaseDetails> = {
  nominative: {
    key: "nominative",
    label: "Nominative",
    definition: "Usually marks the subject of the sentence or renames the subject."
  },
  genitive: {
    key: "genitive",
    label: "Genitive",
    definition: "Usually shows possession, source, relationship, description, or separation."
  },
  dative: {
    key: "dative",
    label: "Dative",
    definition: "Usually marks the indirect object, means, location, association, or advantage."
  },
  accusative: {
    key: "accusative",
    label: "Accusative",
    definition: "Usually marks the direct object, extent, goal, or direction of an action."
  },
  vocative: {
    key: "vocative",
    label: "Vocative",
    definition: "Used for direct address when someone or something is being spoken to."
  }
};

function normalizeGlossValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type GreekFormIndexValue = Array<{
  strongs: string;
  form: string;
}>;

let greekLexiconPromise: Promise<Record<string, GreekLemmaEntry>> | null = null;
let lemmaIndexPromise: Promise<Record<string, string[]>> | null = null;
let formIndexPromise: Promise<Record<string, GreekFormIndexValue>> | null = null;
let searchableGreekEntriesPromise: Promise<SearchableGreekEntry[]> | null = null;

const CRITICAL_MARKS_PATTERN = /[⸀-⸟]/gu;

function normalizeAsciiLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGreekLookupValue(value: string) {
  return value
    .normalize("NFD")
    .replace(CRITICAL_MARKS_PATTERN, "")
    .replace(/\(.*?\)/gu, "")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}a-z0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeGreekFormLookupValue(value: string) {
  return normalizeGreekLookupValue(value).replace(/[^a-z0-9\p{Script=Greek}]+/gu, "");
}

async function loadGreekLexicon() {
  if (!greekLexiconPromise) {
    greekLexiconPromise = import("@/data/bible/greek/lexicon.json").then(
      (module) => (module.default ?? {}) as Record<string, GreekLemmaEntry>
    );
  }

  return greekLexiconPromise;
}

async function loadGreekLemmaIndex() {
  if (!lemmaIndexPromise) {
    lemmaIndexPromise = import("@/data/bible/greek/lemma-index.json").then(
      (module) => (module.default ?? {}) as Record<string, string[]>
    );
  }

  return lemmaIndexPromise;
}

async function loadGreekFormIndex() {
  if (!formIndexPromise) {
    formIndexPromise = import("@/data/bible/greek/form-index.json").then(
      (module) => (module.default ?? {}) as Record<string, GreekFormIndexValue>
    );
  }

  return formIndexPromise;
}

async function loadSearchableGreekEntries() {
  if (!searchableGreekEntriesPromise) {
    searchableGreekEntriesPromise = loadGreekLexicon().then((lexicon) =>
      Object.values(lexicon).map((entry) => ({
        ...entry,
        normalizedLemma: normalizeGreekLookupValue(entry.lemma),
        normalizedTransliteration: normalizeAsciiLookupValue(entry.transliteration),
        normalizedGloss: normalizeAsciiLookupValue(
          [entry.shortDefinition, entry.longDefinition]
            .filter(Boolean)
            .join(" ")
        )
      }))
    );
  }

  return searchableGreekEntriesPromise;
}

function findSelectedForm(entry: GreekLemmaEntry, selectedFormValue: string | undefined) {
  if (!selectedFormValue) {
    return undefined;
  }

  const normalizedSelectedForm = normalizeGreekFormLookupValue(selectedFormValue);

  return entry.forms.find(
    (form) => normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm
  );
}

function dedupeMatches(matches: GreekDictionaryMatch[]) {
  const seen = new Set<string>();

  return matches.filter((match) => {
    const key = `${match.entry.strongs}:${match.selectedForm?.form ?? ""}:${match.matchType}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sanitizeGlossCandidate(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[-,:;.\s]+/g, "")
    .replace(/[-,:;.\s]+$/g, "")
    .trim();
}

function isReadableGlossCandidate(value: string) {
  const normalized = normalizeGlossValue(value);

  return (
    normalized.length >= 3 &&
    value.length <= 72 &&
    !/\d/.test(value) &&
    !/null/i.test(value) &&
    !/\bfrom\b/i.test(value) &&
    !/^[a-z]?\s*gos/i.test(normalized)
  );
}

function splitGlossDefinitionIntoCandidates(value: string) {
  return value
    .split(/\n+/)
    .flatMap((line) => line.split(/[;,]/))
    .flatMap((part) => {
      const trimmedPart = sanitizeGlossCandidate(part);

      if (!trimmedPart) {
        return [];
      }

      return trimmedPart
        .split(/\s+or\s+/i)
        .map((candidate) => sanitizeGlossCandidate(candidate))
        .filter((candidate) => candidate && isReadableGlossCandidate(candidate));
    });
}

function extractSingleWordGlossCandidate(value: string) {
  const candidates = splitGlossDefinitionIntoCandidates(value);
  const glossStopWords = new Set([
    "a",
    "an",
    "the",
    "of",
    "to",
    "in",
    "on",
    "at",
    "for",
    "with",
    "by",
    "from",
    "into",
    "unto",
    "upon",
    "through",
    "and",
    "or"
  ]);

  for (const candidate of candidates) {
    const words = Array.from(
      candidate.matchAll(/\b[\p{L}]+(?:[’'][\p{L}]+)?\b/gu),
      (match) => match[0]
    );
    const contentWords = words.filter((word) => {
      const normalizedWord = word.toLowerCase();

      return !glossStopWords.has(normalizedWord);
    });

    if (contentWords.length === 1) {
      return contentWords[0];
    }
  }

  for (const candidate of candidates) {
    const words = Array.from(
      candidate.matchAll(/\b[\p{L}]+(?:[’'][\p{L}]+)?\b/gu),
      (match) => match[0]
    );
    const contentWords = words.filter((word) => {
      const normalizedWord = word.toLowerCase();

      return !glossStopWords.has(normalizedWord);
    });

    if (contentWords.length > 0) {
      const startsWithStopWord = words[0] ? glossStopWords.has(words[0].toLowerCase()) : false;

      return startsWithStopWord ? contentWords[contentWords.length - 1] : contentWords[0];
    }
  }

  return null;
}

function getGreekCaseKeyFromDecodedMorphology(value?: string | null): GreekCaseKey | null {
  const normalizedValue = value?.toLowerCase() ?? "";

  if (normalizedValue.includes("nominative")) {
    return "nominative";
  }

  if (normalizedValue.includes("genitive")) {
    return "genitive";
  }

  if (normalizedValue.includes("dative")) {
    return "dative";
  }

  if (normalizedValue.includes("accusative")) {
    return "accusative";
  }

  if (normalizedValue.includes("vocative")) {
    return "vocative";
  }

  return null;
}

function getGreekCaseKeyFromMorphologyCode(value?: string | null): GreekCaseKey | null {
  const caseLetter = value?.match(/([NGDAV])[SP][MFN]?$/i)?.[1]?.toUpperCase();

  if (caseLetter === "N") {
    return "nominative";
  }

  if (caseLetter === "G") {
    return "genitive";
  }

  if (caseLetter === "D") {
    return "dative";
  }

  if (caseLetter === "A") {
    return "accusative";
  }

  if (caseLetter === "V") {
    return "vocative";
  }

  return null;
}

export function getGreekTokenOccurrenceKey(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  tokenIndex: number
) {
  return `${bookSlug}:${chapterNumber}:${verseNumber}:${tokenIndex}`;
}

export function getGreekGlossOptions(
  entry: GreekLemmaEntry,
  tokenGloss?: string | null
): GreekGlossOption[] {
  const candidates: Array<Pick<GreekGlossOption, "label" | "source">> = [];

  if (tokenGloss?.trim()) {
    candidates.push({
      label: tokenGloss.trim(),
      source: "token"
    });
  }

  if (entry.shortDefinition.trim()) {
    candidates.push(
      ...splitGlossDefinitionIntoCandidates(entry.shortDefinition).map((label) => ({
        label,
        source: "short-definition" as const
      }))
    );
  }

  if (entry.longDefinition?.trim()) {
    candidates.push(
      ...splitGlossDefinitionIntoCandidates(entry.longDefinition)
        .slice(0, 12)
        .map((label) => ({
          label,
          source: "long-definition" as const
        }))
    );
  }

  const seen = new Set<string>();

  return candidates
    .map((candidate) => ({
      id: `${candidate.source}:${normalizeGlossValue(candidate.label)}`,
      ...candidate
    }))
    .filter((candidate) => {
      const normalized = normalizeGlossValue(candidate.label);

      if (!normalized || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    })
    .slice(0, 12);
}

export function getGreekCaseDetails(
  token: Pick<GreekToken, "decodedMorphology" | "morphology">
): GreekCaseDetails | null {
  const caseKey =
    getGreekCaseKeyFromDecodedMorphology(token.decodedMorphology) ??
    getGreekCaseKeyFromMorphologyCode(token.morphology);

  return caseKey ? GREEK_CASE_DETAILS[caseKey] : null;
}

export function resolveGreekTokenGloss(
  token: Pick<GreekToken, "gloss">,
  entry: GreekLemmaEntry | null,
  override?: GreekTokenGlossOverride | null
) {
  if (override?.selectedGloss?.trim()) {
    return override.selectedGloss.trim();
  }

  const singleWordTokenGloss = token.gloss?.trim()
    ? extractSingleWordGlossCandidate(token.gloss)
    : null;

  if (singleWordTokenGloss) {
    return singleWordTokenGloss;
  }

  if (entry) {
    const singleWordEntryGloss =
      extractSingleWordGlossCandidate(entry.shortDefinition) ??
      (entry.longDefinition ? extractSingleWordGlossCandidate(entry.longDefinition) : null);

    if (singleWordEntryGloss) {
      return singleWordEntryGloss;
    }
  }

  const firstOption = entry ? getGreekGlossOptions(entry, null)[0] : null;

  return token.gloss?.trim() ?? firstOption?.label ?? "";
}

export async function getGreekLemmaEntry(strongsNumber: string) {
  const lexicon = await loadGreekLexicon();

  return lexicon[normalizeStrongsNumber(strongsNumber)] ?? null;
}

export async function getGreekDictionaryMatchForToken(token: GreekToken): Promise<GreekDictionaryMatch | null> {
  const entry = await getGreekLemmaEntry(token.strongs);

  if (!entry) {
    return null;
  }

  return {
    entry,
    selectedForm: findSelectedForm(entry, token.surface),
    selectedFormValue: token.surface,
    matchType: "form"
  };
}

export async function lookupGreekDictionary(query: string, limit = 12): Promise<GreekDictionaryMatch[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const normalizedStrongsQuery = normalizeStrongsNumber(trimmedQuery);

  if (/^G\d+$/i.test(normalizedStrongsQuery)) {
    const entry = await getGreekLemmaEntry(normalizedStrongsQuery);

    return entry
      ? [
          {
            entry,
            matchType: "strongs"
          }
        ]
      : [];
  }

  const normalizedLemmaQuery = normalizeGreekLookupValue(trimmedQuery);
  const normalizedFormQuery = normalizeGreekFormLookupValue(trimmedQuery);
  const [lexicon, lemmaIndex, formIndex, searchableEntries] = await Promise.all([
    loadGreekLexicon(),
    loadGreekLemmaIndex(),
    loadGreekFormIndex(),
    loadSearchableGreekEntries()
  ]);
  const exactLemmaMatches = searchableEntries.filter((entry) => entry.lemma === trimmedQuery);

  if (exactLemmaMatches.length > 0) {
    return exactLemmaMatches.map((entry) => ({
      entry,
      matchType: "lemma"
    }));
  }

  const lemmaMatches = (lemmaIndex[normalizedLemmaQuery] ?? [])
    .map((strongs) => lexicon[strongs] ?? null)
    .filter((entry): entry is GreekLemmaEntry => entry !== null);

  if (lemmaMatches.length > 0) {
    return dedupeMatches(
      lemmaMatches.map((entry) => ({
        entry,
        matchType: "lemma"
      }))
    );
  }

  const formMatches = (formIndex[normalizedFormQuery] ?? []).reduce<GreekDictionaryMatch[]>(
    (matches, item) => {
      const entry = lexicon[item.strongs] ?? null;

      if (!entry) {
        return matches;
      }

      const selectedForm = findSelectedForm(entry, item.form);

      matches.push({
        entry,
        selectedForm,
        selectedFormValue: item.form,
        matchType: "form" as const
      });

      return matches;
    },
    []
  );

  if (formMatches.length > 0) {
    return dedupeMatches(formMatches);
  }

  const normalizedAsciiQuery = normalizeAsciiLookupValue(trimmedQuery);

  if (!normalizedAsciiQuery || (!/\p{Script=Greek}/u.test(trimmedQuery) && normalizedAsciiQuery.length < 3)) {
    return [];
  }

  const scoredMatches = searchableEntries
    .map((entry) => {
      if (entry.normalizedTransliteration === normalizedAsciiQuery) {
        return {
          entry,
          score: 0,
          matchType: "transliteration" as const
        };
      }

      if (
        ` ${entry.normalizedGloss} `.includes(` ${normalizedAsciiQuery} `) ||
        entry.normalizedGloss.startsWith(normalizedAsciiQuery)
      ) {
        return {
          entry,
          score: 1,
          matchType: "gloss" as const
        };
      }

      if (entry.normalizedTransliteration.includes(normalizedAsciiQuery)) {
        return {
          entry,
          score: 2,
          matchType: "transliteration" as const
        };
      }

      return null;
    })
    .filter(
      (
        match
      ): match is {
        entry: SearchableGreekEntry;
        score: number;
        matchType: "transliteration" | "gloss";
      } => match !== null
    )
    .sort((left, right) =>
      left.score === right.score
        ? Number.parseInt(left.entry.strongs.slice(1), 10) -
          Number.parseInt(right.entry.strongs.slice(1), 10)
        : left.score - right.score
    )
    .slice(0, limit);

  return dedupeMatches(
    scoredMatches.map((match) => ({
      entry: match.entry,
      matchType: match.matchType
    }))
  );
}
