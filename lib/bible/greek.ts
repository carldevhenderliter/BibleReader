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

type GreekMorphologyTermKey =
  | "verb"
  | "noun"
  | "adjective"
  | "article"
  | "pronoun"
  | "adverb"
  | "conjunction"
  | "preposition"
  | "particle"
  | "interjection"
  | "present"
  | "imperfect"
  | "future"
  | "aorist"
  | "perfect"
  | "pluperfect"
  | "active"
  | "middle"
  | "passive"
  | "indicative"
  | "subjunctive"
  | "imperative"
  | "optative"
  | "infinitive"
  | "participle"
  | "nominative"
  | "genitive"
  | "dative"
  | "accusative"
  | "vocative"
  | "singular"
  | "plural"
  | "masculine"
  | "feminine"
  | "neuter"
  | "first-person"
  | "second-person"
  | "third-person";

type GreekMorphologyGroup =
  | "part-of-speech"
  | "tense"
  | "voice"
  | "mood"
  | "case"
  | "number"
  | "gender"
  | "person";

export type GreekMorphologyTermDetails = {
  key: GreekMorphologyTermKey;
  group: GreekMorphologyGroup;
  label: string;
  definition: string;
};

export type GreekMorphologyDetails = {
  label: string;
  terms: GreekMorphologyTermDetails[];
  fullDescription?: string;
};

const GREEK_MORPHOLOGY_DETAILS: Record<GreekMorphologyTermKey, GreekMorphologyTermDetails> = {
  verb: {
    key: "verb",
    group: "part-of-speech",
    label: "Verb",
    definition: "A word that expresses action, process, or state of being."
  },
  noun: {
    key: "noun",
    group: "part-of-speech",
    label: "Noun",
    definition: "A word that names a person, place, thing, idea, or quality."
  },
  adjective: {
    key: "adjective",
    group: "part-of-speech",
    label: "Adjective",
    definition: "A word that describes or qualifies a noun or pronoun."
  },
  article: {
    key: "article",
    group: "part-of-speech",
    label: "Article",
    definition: "A word like 'the' that marks or identifies a noun."
  },
  pronoun: {
    key: "pronoun",
    group: "part-of-speech",
    label: "Pronoun",
    definition: "A word that stands in the place of a noun."
  },
  adverb: {
    key: "adverb",
    group: "part-of-speech",
    label: "Adverb",
    definition: "A word that modifies a verb, adjective, or another adverb."
  },
  conjunction: {
    key: "conjunction",
    group: "part-of-speech",
    label: "Conjunction",
    definition: "A word that connects words, phrases, clauses, or sentences."
  },
  preposition: {
    key: "preposition",
    group: "part-of-speech",
    label: "Preposition",
    definition: "A word that shows the relationship of a noun or pronoun to another word."
  },
  particle: {
    key: "particle",
    group: "part-of-speech",
    label: "Particle",
    definition: "A small function word that adds nuance, emphasis, or connection."
  },
  interjection: {
    key: "interjection",
    group: "part-of-speech",
    label: "Interjection",
    definition: "A word used as an exclamation or sudden expression."
  },
  present: {
    key: "present",
    group: "tense",
    label: "Present",
    definition: "Usually portrays action as ongoing, repeated, or in progress."
  },
  imperfect: {
    key: "imperfect",
    group: "tense",
    label: "Imperfect",
    definition: "Usually portrays past action as ongoing, repeated, or unfolding."
  },
  future: {
    key: "future",
    group: "tense",
    label: "Future",
    definition: "Usually portrays action that will happen."
  },
  aorist: {
    key: "aorist",
    group: "tense",
    label: "Aorist",
    definition: "Usually presents an action as a whole or as a simple event."
  },
  perfect: {
    key: "perfect",
    group: "tense",
    label: "Perfect",
    definition: "Usually portrays a completed action with continuing results."
  },
  pluperfect: {
    key: "pluperfect",
    group: "tense",
    label: "Pluperfect",
    definition: "Usually portrays a past completed action with results already in effect."
  },
  active: {
    key: "active",
    group: "voice",
    label: "Active",
    definition: "The subject performs the action."
  },
  middle: {
    key: "middle",
    group: "voice",
    label: "Middle",
    definition: "The subject participates in or is closely involved in the action."
  },
  passive: {
    key: "passive",
    group: "voice",
    label: "Passive",
    definition: "The subject receives the action."
  },
  indicative: {
    key: "indicative",
    group: "mood",
    label: "Indicative",
    definition: "Usually states something as a fact or straightforward assertion."
  },
  subjunctive: {
    key: "subjunctive",
    group: "mood",
    label: "Subjunctive",
    definition: "Usually expresses possibility, purpose, or contingency."
  },
  imperative: {
    key: "imperative",
    group: "mood",
    label: "Imperative",
    definition: "Usually gives a command, exhortation, or request."
  },
  optative: {
    key: "optative",
    group: "mood",
    label: "Optative",
    definition: "Usually expresses wish or potential in a more remote way."
  },
  infinitive: {
    key: "infinitive",
    group: "mood",
    label: "Infinitive",
    definition: "A verbal form functioning like a verbal noun."
  },
  participle: {
    key: "participle",
    group: "mood",
    label: "Participle",
    definition: "A verbal adjective sharing features of both verbs and adjectives."
  },
  nominative: {
    key: "nominative",
    group: "case",
    label: "Nominative",
    definition: "Usually marks the subject of the sentence or renames the subject."
  },
  genitive: {
    key: "genitive",
    group: "case",
    label: "Genitive",
    definition: "Usually shows possession, source, relationship, description, or separation."
  },
  dative: {
    key: "dative",
    group: "case",
    label: "Dative",
    definition: "Usually marks the indirect object, means, location, association, or advantage."
  },
  accusative: {
    key: "accusative",
    group: "case",
    label: "Accusative",
    definition: "Usually marks the direct object, extent, goal, or direction of an action."
  },
  vocative: {
    key: "vocative",
    group: "case",
    label: "Vocative",
    definition: "Used for direct address when someone or something is being spoken to."
  },
  singular: {
    key: "singular",
    group: "number",
    label: "Singular",
    definition: "Refers to one person or thing."
  },
  plural: {
    key: "plural",
    group: "number",
    label: "Plural",
    definition: "Refers to more than one person or thing."
  },
  masculine: {
    key: "masculine",
    group: "gender",
    label: "Masculine",
    definition: "The masculine grammatical gender."
  },
  feminine: {
    key: "feminine",
    group: "gender",
    label: "Feminine",
    definition: "The feminine grammatical gender."
  },
  neuter: {
    key: "neuter",
    group: "gender",
    label: "Neuter",
    definition: "The neuter grammatical gender."
  },
  "first-person": {
    key: "first-person",
    group: "person",
    label: "First Person",
    definition: "Refers to the speaker or speakers."
  },
  "second-person": {
    key: "second-person",
    group: "person",
    label: "Second Person",
    definition: "Refers to the one or ones being addressed."
  },
  "third-person": {
    key: "third-person",
    group: "person",
    label: "Third Person",
    definition: "Refers to someone or something other than the speaker or addressee."
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

const GREEK_MORPHOLOGY_TERM_MATCHERS: Array<{
  key: GreekMorphologyTermKey;
  match: RegExp;
}> = [
  { key: "verb", match: /\bverb\b/i },
  { key: "noun", match: /\bnoun\b/i },
  { key: "adjective", match: /\badjective\b/i },
  { key: "article", match: /\barticle\b/i },
  { key: "pronoun", match: /\bpronoun\b/i },
  { key: "adverb", match: /\badverb\b/i },
  { key: "conjunction", match: /\bconjunction\b/i },
  { key: "preposition", match: /\bpreposition\b/i },
  { key: "particle", match: /\bparticle\b/i },
  { key: "interjection", match: /\binterjection\b/i },
  { key: "present", match: /\bpresent\b/i },
  { key: "imperfect", match: /\bimperfect\b/i },
  { key: "future", match: /\bfuture\b/i },
  { key: "aorist", match: /\baorist\b/i },
  { key: "perfect", match: /\bperfect\b/i },
  { key: "pluperfect", match: /\bpluperfect\b/i },
  { key: "active", match: /\bactive\b/i },
  { key: "middle", match: /\bmiddle\b/i },
  { key: "passive", match: /\bpassive\b/i },
  { key: "indicative", match: /\bindicative\b/i },
  { key: "subjunctive", match: /\bsubjunctive\b/i },
  { key: "imperative", match: /\bimperative\b/i },
  { key: "optative", match: /\boptative\b/i },
  { key: "infinitive", match: /\binfinitive\b/i },
  { key: "participle", match: /\bparticiple\b/i },
  { key: "nominative", match: /\bnominative\b/i },
  { key: "genitive", match: /\bgenitive\b/i },
  { key: "dative", match: /\bdative\b/i },
  { key: "accusative", match: /\baccusative\b/i },
  { key: "vocative", match: /\bvocative\b/i },
  { key: "singular", match: /\bsingular\b/i },
  { key: "plural", match: /\bplural\b/i },
  { key: "masculine", match: /\bmasculine\b/i },
  { key: "feminine", match: /\bfeminine\b/i },
  { key: "neuter", match: /\bneuter\b/i },
  { key: "first-person", match: /\bfirst person\b/i },
  { key: "second-person", match: /\bsecond person\b/i },
  { key: "third-person", match: /\bthird person\b/i }
];

function getGreekMorphologyTermsFromDecodedMorphology(value?: string | null) {
  const normalizedValue = value?.toLowerCase() ?? "";

  return GREEK_MORPHOLOGY_TERM_MATCHERS.flatMap(({ key, match }) =>
    match.test(normalizedValue) ? [GREEK_MORPHOLOGY_DETAILS[key]] : []
  );
}

function getGreekMorphologyTermsFromMorphologyCode(value?: string | null) {
  const normalizedValue = value?.toUpperCase() ?? "";
  const terms: GreekMorphologyTermDetails[] = [];
  const seen = new Set<string>();
  const addTerm = (key: GreekMorphologyTermKey) => {
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    terms.push(GREEK_MORPHOLOGY_DETAILS[key]);
  };

  const partOfSpeechCode = normalizedValue.split("-")[0] ?? "";

  if (partOfSpeechCode.startsWith("V")) {
    addTerm("verb");
  } else if (partOfSpeechCode.startsWith("N")) {
    addTerm("noun");
  } else if (partOfSpeechCode.startsWith("A")) {
    addTerm("adjective");
  } else if (partOfSpeechCode.startsWith("T")) {
    addTerm("article");
  } else if (partOfSpeechCode.startsWith("P")) {
    addTerm("pronoun");
  } else if (partOfSpeechCode.startsWith("D")) {
    addTerm("adverb");
  } else if (partOfSpeechCode.startsWith("C")) {
    addTerm("conjunction");
  } else if (partOfSpeechCode.startsWith("PREP")) {
    addTerm("preposition");
  } else if (partOfSpeechCode === "X") {
    addTerm("particle");
  }

  const caseLetter = normalizedValue.match(/([NGDAV])[SP][MFN]?$/)?.[1];

  if (caseLetter === "N") {
    addTerm("nominative");
  } else if (caseLetter === "G") {
    addTerm("genitive");
  } else if (caseLetter === "D") {
    addTerm("dative");
  } else if (caseLetter === "A") {
    addTerm("accusative");
  } else if (caseLetter === "V") {
    addTerm("vocative");
  }

  if (/[SP][MFN]?$/.test(normalizedValue)) {
    const numberLetter = normalizedValue.match(/([SP])[MFN]?$/)?.[1];
    if (numberLetter === "S") {
      addTerm("singular");
    } else if (numberLetter === "P") {
      addTerm("plural");
    }
  }

  const genderLetter = normalizedValue.match(/[SP]([MFN])$/)?.[1];

  if (genderLetter === "M") {
    addTerm("masculine");
  } else if (genderLetter === "F") {
    addTerm("feminine");
  } else if (genderLetter === "N") {
    addTerm("neuter");
  }

  return terms;
}

function pickGreekMorphologySummaryTerms(terms: GreekMorphologyTermDetails[]) {
  const partOfSpeech = terms.find((term) => term.group === "part-of-speech") ?? null;

  if (partOfSpeech?.key === "verb") {
    return [
      partOfSpeech,
      terms.find((term) => term.group === "tense"),
      terms.find((term) => term.group === "voice"),
      terms.find((term) => term.group === "mood")
    ].filter((term): term is GreekMorphologyTermDetails => term !== undefined);
  }

  return [
    partOfSpeech,
    terms.find((term) => term.group === "case"),
    terms.find((term) => term.group === "number"),
    terms.find((term) => term.group === "gender")
  ].filter((term): term is GreekMorphologyTermDetails => term !== undefined);
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

export function getGreekMorphologyDetails(
  token: Pick<GreekToken, "decodedMorphology" | "morphology">
): GreekMorphologyDetails | null {
  const termsFromDecoded = getGreekMorphologyTermsFromDecodedMorphology(token.decodedMorphology);
  const terms = termsFromDecoded.length > 0
    ? termsFromDecoded
    : getGreekMorphologyTermsFromMorphologyCode(token.morphology);

  if (terms.length === 0) {
    return null;
  }

  const summaryTerms = pickGreekMorphologySummaryTerms(terms);
  const partOfSpeech = summaryTerms.find((term) => term.group === "part-of-speech") ?? null;
  const otherTerms = summaryTerms.filter((term) => term.group !== "part-of-speech");

  return {
    label: [
      partOfSpeech?.label ?? null,
      otherTerms.length > 0 ? otherTerms.map((term) => term.label).join(" ") : null
    ]
      .filter(Boolean)
      .join(" · "),
    terms,
    fullDescription: token.decodedMorphology ?? token.morphology ?? undefined
  };
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
