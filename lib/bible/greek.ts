import type {
  BibleSearchVerseEntry,
  GreekLearningQuiz,
  GreekLearningQuizSelection,
  GreekGlossOption,
  GreekInflectedForm,
  GreekLemmaGlossPreference,
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
  example?: string;
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
    definition: "A word that expresses action, process, or state of being.",
    example: "Example: λεγει = he says"
  },
  noun: {
    key: "noun",
    group: "part-of-speech",
    label: "Noun",
    definition: "A word that names a person, place, thing, idea, or quality.",
    example: "Example: λογος = word"
  },
  adjective: {
    key: "adjective",
    group: "part-of-speech",
    label: "Adjective",
    definition: "A word that describes or qualifies a noun or pronoun.",
    example: "Example: αγαθος = good"
  },
  article: {
    key: "article",
    group: "part-of-speech",
    label: "Article",
    definition: "A word like 'the' that marks or identifies a noun.",
    example: "Example: ο = the"
  },
  pronoun: {
    key: "pronoun",
    group: "part-of-speech",
    label: "Pronoun",
    definition: "A word that stands in the place of a noun.",
    example: "Example: αυτος = he / she / it"
  },
  adverb: {
    key: "adverb",
    group: "part-of-speech",
    label: "Adverb",
    definition: "A word that modifies a verb, adjective, or another adverb.",
    example: "Example: νυν = now"
  },
  conjunction: {
    key: "conjunction",
    group: "part-of-speech",
    label: "Conjunction",
    definition: "A word that connects words, phrases, clauses, or sentences.",
    example: "Example: και = and"
  },
  preposition: {
    key: "preposition",
    group: "part-of-speech",
    label: "Preposition",
    definition: "A word that shows the relationship of a noun or pronoun to another word.",
    example: "Example: εν = in"
  },
  particle: {
    key: "particle",
    group: "part-of-speech",
    label: "Particle",
    definition: "A small function word that adds nuance, emphasis, or connection.",
    example: "Example: γε = indeed"
  },
  interjection: {
    key: "interjection",
    group: "part-of-speech",
    label: "Interjection",
    definition: "A word used as an exclamation or sudden expression.",
    example: "Example: ουαι = woe"
  },
  present: {
    key: "present",
    group: "tense",
    label: "Present",
    definition: "Usually portrays action as ongoing, repeated, or in progress.",
    example: "Example: λεγει = he says / is saying"
  },
  imperfect: {
    key: "imperfect",
    group: "tense",
    label: "Imperfect",
    definition: "Usually portrays past action as ongoing, repeated, or unfolding.",
    example: "Example: ελεγεν = he was saying"
  },
  future: {
    key: "future",
    group: "tense",
    label: "Future",
    definition: "Usually portrays action that will happen.",
    example: "Example: ερει = he will say"
  },
  aorist: {
    key: "aorist",
    group: "tense",
    label: "Aorist",
    definition: "Usually presents an action as a whole or as a simple event.",
    example: "Example: ειπεν = he said"
  },
  perfect: {
    key: "perfect",
    group: "tense",
    label: "Perfect",
    definition: "Usually portrays a completed action with continuing results.",
    example: "Example: γεγραπται = it has been written"
  },
  pluperfect: {
    key: "pluperfect",
    group: "tense",
    label: "Pluperfect",
    definition: "Usually portrays a past completed action with results already in effect.",
    example: "Example: εγεγραπτο = it had been written"
  },
  active: {
    key: "active",
    group: "voice",
    label: "Active",
    definition: "The subject performs the action.",
    example: "Example: λυει = he loosens"
  },
  middle: {
    key: "middle",
    group: "voice",
    label: "Middle",
    definition: "The subject participates in or is closely involved in the action.",
    example: "Example: λυεται = he loosens for himself"
  },
  passive: {
    key: "passive",
    group: "voice",
    label: "Passive",
    definition: "The subject receives the action.",
    example: "Example: ελυθη = he was loosed"
  },
  indicative: {
    key: "indicative",
    group: "mood",
    label: "Indicative",
    definition: "Usually states something as a fact or straightforward assertion.",
    example: "Example: λεγει = he says"
  },
  subjunctive: {
    key: "subjunctive",
    group: "mood",
    label: "Subjunctive",
    definition: "Usually expresses possibility, purpose, or contingency.",
    example: "Example: λεγη = he may say"
  },
  imperative: {
    key: "imperative",
    group: "mood",
    label: "Imperative",
    definition: "Usually gives a command, exhortation, or request.",
    example: "Example: λυε = loosen!"
  },
  optative: {
    key: "optative",
    group: "mood",
    label: "Optative",
    definition: "Usually expresses wish or potential in a more remote way.",
    example: "Example: λυσαιμι = may I loosen"
  },
  infinitive: {
    key: "infinitive",
    group: "mood",
    label: "Infinitive",
    definition: "A verbal form functioning like a verbal noun.",
    example: "Example: λυειν = to loosen"
  },
  participle: {
    key: "participle",
    group: "mood",
    label: "Participle",
    definition: "A verbal adjective sharing features of both verbs and adjectives.",
    example: "Example: λυων = loosening / one who loosens"
  },
  nominative: {
    key: "nominative",
    group: "case",
    label: "Nominative",
    definition: "Usually marks the subject of the sentence or renames the subject.",
    example: "Example: λογος = word (subject)"
  },
  genitive: {
    key: "genitive",
    group: "case",
    label: "Genitive",
    definition: "Usually shows possession, source, relationship, description, or separation.",
    example: "Example: λογου = of the word"
  },
  dative: {
    key: "dative",
    group: "case",
    label: "Dative",
    definition: "Usually marks the indirect object, means, location, association, or advantage.",
    example: "Example: λογῳ = to / for the word"
  },
  accusative: {
    key: "accusative",
    group: "case",
    label: "Accusative",
    definition: "Usually marks the direct object, extent, goal, or direction of an action.",
    example: "Example: λογον = word (object)"
  },
  vocative: {
    key: "vocative",
    group: "case",
    label: "Vocative",
    definition: "Used for direct address when someone or something is being spoken to.",
    example: "Example: κυριε = O Lord"
  },
  singular: {
    key: "singular",
    group: "number",
    label: "Singular",
    definition: "Refers to one person or thing.",
    example: "Example: λογος = one word"
  },
  plural: {
    key: "plural",
    group: "number",
    label: "Plural",
    definition: "Refers to more than one person or thing.",
    example: "Example: λογοι = words"
  },
  masculine: {
    key: "masculine",
    group: "gender",
    label: "Masculine",
    definition: "The masculine grammatical gender.",
    example: "Example: λογος = masculine noun"
  },
  feminine: {
    key: "feminine",
    group: "gender",
    label: "Feminine",
    definition: "The feminine grammatical gender.",
    example: "Example: ημερα = feminine noun"
  },
  neuter: {
    key: "neuter",
    group: "gender",
    label: "Neuter",
    definition: "The neuter grammatical gender.",
    example: "Example: τεκνον = neuter noun"
  },
  "first-person": {
    key: "first-person",
    group: "person",
    label: "First Person",
    definition: "Refers to the speaker or speakers.",
    example: "Example: λεγω = I say"
  },
  "second-person": {
    key: "second-person",
    group: "person",
    label: "Second Person",
    definition: "Refers to the one or ones being addressed.",
    example: "Example: λυεις = you loosen"
  },
  "third-person": {
    key: "third-person",
    group: "person",
    label: "Third Person",
    definition: "Refers to someone or something other than the speaker or addressee.",
    example: "Example: λυει = he / she / it loosens"
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
  entryKey: string;
  strongs?: string;
  form: string;
}>;

let greekLexiconPromise: Promise<Record<string, GreekLemmaEntry>> | null = null;
let lemmaIndexPromise: Promise<Record<string, string[]>> | null = null;
let formIndexPromise: Promise<Record<string, GreekFormIndexValue>> | null = null;
let searchableGreekEntriesPromise: Promise<SearchableGreekEntry[]> | null = null;
let greekVerseIndexPromise: Promise<BibleSearchVerseEntry[]> | null = null;
let fathersGreekLexiconPromise: Promise<Record<string, GreekLemmaEntry>> | null = null;
let fathersGreekLemmaIndexPromise: Promise<Record<string, string[]>> | null = null;
let fathersGreekFormIndexPromise: Promise<Record<string, GreekFormIndexValue>> | null = null;

function mergeGreekLemmaIndexes(
  left: Record<string, string[]>,
  right: Record<string, string[]>
) {
  const merged = { ...left };

  for (const [key, values] of Object.entries(right)) {
    merged[key] = Array.from(new Set([...(merged[key] ?? []), ...values]));
  }

  return merged;
}

function mergeGreekFormIndexes(
  left: Record<string, GreekFormIndexValue>,
  right: Record<string, GreekFormIndexValue>
) {
  const merged = { ...left };

  for (const [key, values] of Object.entries(right)) {
    const existingValues = merged[key] ?? [];
    const seen = new Set(existingValues.map((item) => `${item.entryKey}:${item.form}`));
    const nextValues = [...existingValues];

    for (const value of values) {
      const entryKey = value.entryKey ?? value.strongs ?? "";
      const dedupeKey = `${entryKey}:${value.form}`;

      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      nextValues.push({
        entryKey,
        strongs: value.strongs,
        form: value.form
      });
    }

    merged[key] = nextValues;
  }

  return merged;
}

const CRITICAL_MARKS_PATTERN = /[⸀-⸟]/gu;
const ROUGH_BREATHING_MARK = "\u0314";
const DIAERESIS_MARK = "\u0308";
const GREEK_VOWELS = new Set(["α", "ε", "η", "ι", "ο", "υ", "ω"]);
const GREEK_DIPHTHONG_TRANSLITERATION_MAP: Record<string, string> = {
  αι: "ai",
  ει: "ei",
  οι: "oi",
  υι: "yi",
  αυ: "au",
  ευ: "eu",
  ηυ: "ēu",
  ου: "ou"
};
const GREEK_SINGLE_LETTER_TRANSLITERATION_MAP: Record<string, string> = {
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "ē",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "y",
  φ: "ph",
  χ: "ch",
  ψ: "ps",
  ω: "ō"
};

type GreekTransliterationUnit = {
  base: string;
  marks: string;
  uppercase: boolean;
};

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

export function transliterateGreekSurface(value: string) {
  const units: GreekTransliterationUnit[] = [];

  for (const char of value.normalize("NFD")) {
    if (/\p{Script=Greek}/u.test(char) && !/\p{M}/u.test(char)) {
      units.push({
        base: char.toLowerCase(),
        marks: "",
        uppercase: char !== char.toLowerCase()
      });
      continue;
    }

    if (/\p{M}/u.test(char) && units.length > 0) {
      units[units.length - 1]!.marks += char;
    }
  }

  let transliteration = "";

  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]!;
    const nextUnit = units[index + 1];
    const hasRoughBreathing = unit.marks.includes(ROUGH_BREATHING_MARK);
    const canUseDiphthong =
      nextUnit &&
      !unit.marks.includes(DIAERESIS_MARK) &&
      !nextUnit.marks.includes(DIAERESIS_MARK);
    const diphthongKey = canUseDiphthong ? `${unit.base}${nextUnit.base}` : "";
    const diphthongTransliteration =
      diphthongKey.length > 0 ? GREEK_DIPHTHONG_TRANSLITERATION_MAP[diphthongKey] : undefined;

    if (diphthongTransliteration) {
      const rendered = `${hasRoughBreathing ? "h" : ""}${diphthongTransliteration}`;
      transliteration += unit.uppercase
        ? rendered[0]!.toUpperCase() + rendered.slice(1)
        : rendered;
      index += 1;
      continue;
    }

    let rendered = GREEK_SINGLE_LETTER_TRANSLITERATION_MAP[unit.base] ?? unit.base;

    if (unit.base === "γ" && nextUnit && ["γ", "κ", "ξ", "χ"].includes(nextUnit.base)) {
      rendered = "n";
    } else if (unit.base === "ρ" && hasRoughBreathing) {
      rendered = "rh";
    } else if (hasRoughBreathing && GREEK_VOWELS.has(unit.base)) {
      rendered = `h${rendered}`;
    }

    transliteration += unit.uppercase
      ? rendered[0]!.toUpperCase() + rendered.slice(1)
      : rendered;
  }

  return transliteration;
}

async function loadGreekLexicon() {
  if (!greekLexiconPromise) {
    greekLexiconPromise = Promise.all([
      import("@/data/bible/greek/lexicon.json").then(
        (module) =>
          Object.fromEntries(
            Object.entries((module.default ?? {}) as Record<string, GreekLemmaEntry>).map(
              ([entryKey, entry]) => [
                entryKey,
                {
                  ...entry,
                  entryKey: entry.entryKey ?? entryKey
                }
              ]
            )
          ) as Record<string, GreekLemmaEntry>
      ),
      loadFathersGreekLexicon()
    ]).then(([baseLexicon, fathersLexicon]) => ({
      ...baseLexicon,
      ...fathersLexicon
    }));
  }

  return greekLexiconPromise;
}

async function loadFathersGreekLexicon() {
  if (!fathersGreekLexiconPromise) {
    fathersGreekLexiconPromise = import("@/data/fathers/greek-lexicon.json").then(
      (module) =>
        Object.fromEntries(
          Object.entries((module.default ?? {}) as Record<string, GreekLemmaEntry>).map(
            ([entryKey, entry]) => [
              entryKey,
              {
                ...entry,
                entryKey: entry.entryKey ?? entryKey
              }
            ]
          )
        ) as Record<string, GreekLemmaEntry>
    );
  }

  return fathersGreekLexiconPromise;
}

async function loadGreekLemmaIndex() {
  if (!lemmaIndexPromise) {
    lemmaIndexPromise = Promise.all([
      import("@/data/bible/greek/lemma-index.json").then(
        (module) => (module.default ?? {}) as Record<string, string[]>
      ),
      loadFathersGreekLemmaIndex()
    ]).then(([baseIndex, fathersIndex]) => mergeGreekLemmaIndexes(baseIndex, fathersIndex));
  }

  return lemmaIndexPromise;
}

async function loadFathersGreekLemmaIndex() {
  if (!fathersGreekLemmaIndexPromise) {
    fathersGreekLemmaIndexPromise = import("@/data/fathers/greek-lemma-index.json").then(
      (module) => (module.default ?? {}) as Record<string, string[]>
    );
  }

  return fathersGreekLemmaIndexPromise;
}

async function loadGreekFormIndex() {
  if (!formIndexPromise) {
    formIndexPromise = Promise.all([
      import("@/data/bible/greek/form-index.json").then(
        (module) =>
          Object.fromEntries(
            Object.entries((module.default ?? {}) as Record<string, Array<{ entryKey?: string; strongs?: string; form: string }>>).map(
              ([key, items]) => [
                key,
                items.map((item) => ({
                  entryKey: item.entryKey ?? item.strongs ?? "",
                  strongs: item.strongs,
                  form: item.form
                }))
              ]
            )
          ) as Record<string, GreekFormIndexValue>
      ),
      loadFathersGreekFormIndex()
    ]).then(([baseIndex, fathersIndex]) => mergeGreekFormIndexes(baseIndex, fathersIndex));
  }

  return formIndexPromise;
}

async function loadFathersGreekFormIndex() {
  if (!fathersGreekFormIndexPromise) {
    fathersGreekFormIndexPromise = import("@/data/fathers/greek-form-index.json").then(
      (module) =>
        Object.fromEntries(
          Object.entries((module.default ?? {}) as Record<string, Array<{ entryKey?: string; strongs?: string; form: string }>>).map(
            ([key, items]) => [
              key,
              items.map((item) => ({
                entryKey: item.entryKey ?? item.strongs ?? "",
                strongs: item.strongs,
                form: item.form
              }))
            ]
          )
        ) as Record<string, GreekFormIndexValue>
    );
  }

  return fathersGreekFormIndexPromise;
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

async function loadGreekVerseIndex() {
  if (!greekVerseIndexPromise) {
    greekVerseIndexPromise = import("@/data/bible/search/greek.json").then(
      (module) => (module.default ?? []) as BibleSearchVerseEntry[]
    );
  }

  return greekVerseIndexPromise;
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
    const key = `${match.entry.entryKey}:${match.selectedForm?.form ?? ""}:${match.matchType}`;

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
    .replace(/[“”"]/g, "")
    .replace(/^[-,:;.\s]+/g, "")
    .replace(/[-,:;.\s]+$/g, "")
    .trim();
}

function isPlaceholderGlossText(value: string) {
  const normalized = normalizeGlossValue(value);

  return normalized === "greek lemma" || normalized === "lemma" || normalized === "greek";
}

function isReadableGlossCandidate(value: string) {
  const normalized = normalizeGlossValue(value);

  return (
    normalized.length >= 3 &&
    value.length <= 72 &&
    !/\d/.test(value) &&
    !/null/i.test(value) &&
    !/\bfrom\b/i.test(value) &&
    !/^[a-z]?\s*gos/i.test(normalized) &&
    !isPlaceholderGlossText(value)
  );
}

function glossContainsMultipleMeanings(value?: string | null) {
  if (!value?.trim()) {
    return false;
  }

  return /[;,/]|(?:\s+\bor\b\s+)/i.test(value);
}

function splitGlossDefinitionIntoCandidates(value: string) {
  return value.split(/\n+/).reduce<string[]>((candidates, line) => {
    for (const part of line.split(/[;,]/)) {
      const trimmedPart = sanitizeGlossCandidate(part);

      if (!trimmedPart) {
        continue;
      }

      for (const candidate of trimmedPart.split(/\s+or\s+/i)) {
        const sanitizedCandidate = sanitizeGlossCandidate(candidate);

        if (sanitizedCandidate && isReadableGlossCandidate(sanitizedCandidate)) {
          candidates.push(sanitizedCandidate);
        }
      }
    }

    return candidates;
  }, []);
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

function getPreferredSingleWordGlossCandidate(
  value: string | null | undefined,
  options?: {
    preferSingleMeaning?: boolean;
  }
) {
  if (!value?.trim()) {
    return null;
  }

  const singleWordCandidate = extractSingleWordGlossCandidate(value);

  if (!singleWordCandidate || isPlaceholderGlossText(singleWordCandidate)) {
    return null;
  }

  if (options?.preferSingleMeaning && glossContainsMultipleMeanings(value)) {
    return null;
  }

  return singleWordCandidate;
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
  return GREEK_MORPHOLOGY_TERM_MATCHERS.reduce<GreekMorphologyTermDetails[]>(
    (terms, { key, match }) => {
      if (match.test(normalizedValue)) {
        terms.push(GREEK_MORPHOLOGY_DETAILS[key]);
      }

      return terms;
    },
    []
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
    ].filter((term): term is GreekMorphologyTermDetails => term != null);
  }

  return [
    partOfSpeech,
    terms.find((term) => term.group === "case"),
    terms.find((term) => term.group === "number"),
    terms.find((term) => term.group === "gender")
  ].filter((term): term is GreekMorphologyTermDetails => term != null);
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
    const singleWordTokenGloss = getPreferredSingleWordGlossCandidate(tokenGloss);

    if (singleWordTokenGloss) {
      candidates.push({
        label: singleWordTokenGloss,
        source: "token"
      });
    }
  }

  if (entry.shortDefinition.trim()) {
    candidates.push(
      ...splitGlossDefinitionIntoCandidates(entry.shortDefinition)
        .map((label) => getPreferredSingleWordGlossCandidate(label))
        .filter((label): label is string => Boolean(label))
        .map((label) => ({
          label,
          source: "short-definition" as const
        }))
    );
  }

  if (entry.longDefinition?.trim()) {
    candidates.push(
      ...splitGlossDefinitionIntoCandidates(entry.longDefinition)
        .slice(0, 12)
        .map((label) => getPreferredSingleWordGlossCandidate(label))
        .filter((label): label is string => Boolean(label))
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
  override?: GreekTokenGlossOverride | null,
  lemmaPreference?: GreekLemmaGlossPreference | null
) {
  if (override?.selectedGloss?.trim()) {
    return override.selectedGloss.trim();
  }

  if (lemmaPreference?.selectedGloss?.trim()) {
    return lemmaPreference.selectedGloss.trim();
  }

  const singleWordTokenGloss = getPreferredSingleWordGlossCandidate(token.gloss, {
    preferSingleMeaning: true
  });

  if (singleWordTokenGloss) {
    return singleWordTokenGloss;
  }

  if (entry) {
    const singleWordEntryGloss =
      getPreferredSingleWordGlossCandidate(entry.shortDefinition) ??
      getPreferredSingleWordGlossCandidate(token.gloss) ??
      getPreferredSingleWordGlossCandidate(entry.longDefinition);

    if (singleWordEntryGloss) {
      return singleWordEntryGloss;
    }
  }

  const firstOption = entry ? getGreekGlossOptions(entry, null)[0] : null;

  return (
    getPreferredSingleWordGlossCandidate(token.gloss) ??
    getPreferredSingleWordGlossCandidate(firstOption?.label) ??
    token.gloss?.trim() ??
    firstOption?.label ??
    ""
  );
}

function getBroadGreekPartOfSpeech(
  token: Pick<GreekToken, "decodedMorphology" | "morphology">
) {
  const details = getGreekMorphologyDetails(token);

  return details?.terms.find((term) => term.group === "part-of-speech")?.key ?? null;
}

const GREEK_QUIZ_TYPED_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "by",
  "for",
  "in",
  "of",
  "or",
  "the",
  "that",
  "thing",
  "to",
  "with"
]);

export function normalizeGreekQuizAnswer(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getAcceptedGreekQuizAnswers(correctAnswer: string) {
  const answers = new Set<string>();
  const normalizedFullAnswer = normalizeGreekQuizAnswer(correctAnswer);

  if (normalizedFullAnswer) {
    answers.add(normalizedFullAnswer);
  }

  for (const part of correctAnswer.split(/[;,]|\s+or\s+/i)) {
    const normalizedPart = normalizeGreekQuizAnswer(part);

    if (normalizedPart) {
      answers.add(normalizedPart);
    }

    const words = normalizedPart
      .split(" ")
      .filter((word) => word.length > 2 && !GREEK_QUIZ_TYPED_STOP_WORDS.has(word));

    for (const word of words) {
      answers.add(word);
    }
  }

  return answers;
}

export function isTypedGreekQuizAnswerCorrect(answer: string, correctAnswer: string) {
  const normalizedAnswer = normalizeGreekQuizAnswer(answer);

  return (
    normalizedAnswer.length > 0 &&
    getAcceptedGreekQuizAnswers(correctAnswer).has(normalizedAnswer)
  );
}

function isReadableGreekLearningDefinition(value: string) {
  const normalized = normalizeGlossValue(value);

  return (
    normalized.length >= 3 &&
    value.length <= 160 &&
    !/\d/.test(value) &&
    !/null/i.test(value) &&
    !/^[a-z]?\s*gos/i.test(normalized) &&
    !isPlaceholderGlossText(value)
  );
}

function getGreekLearningDefinitionCandidate(entry: GreekLemmaEntry) {
  const shortDefinition = sanitizeGlossCandidate(entry.shortDefinition);

  if (shortDefinition && isReadableGreekLearningDefinition(shortDefinition)) {
    return shortDefinition;
  }

  const longDefinitionCandidates = entry.longDefinition
    ? entry.longDefinition
        .split(/\n+/)
        .map((line) => sanitizeGlossCandidate(line))
        .filter((line) => line && isReadableGreekLearningDefinition(line))
    : [];

  return longDefinitionCandidates[0] ?? getGreekGlossOptions(entry, null)[0]?.label ?? null;
}

function isNearDuplicateGloss(left: string, right: string) {
  const normalizedLeft = normalizeGlossValue(left);
  const normalizedRight = normalizeGlossValue(right);

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.startsWith(normalizedRight) ||
    normalizedRight.startsWith(normalizedLeft)
  );
}

function sortGreekLearningEntries(left: GreekLemmaEntry, right: GreekLemmaEntry) {
  if (left.strongs && right.strongs) {
    return (
      Number.parseInt(left.strongs.slice(1), 10) -
      Number.parseInt(right.strongs.slice(1), 10)
    );
  }

  return left.entryKey.localeCompare(right.entryKey);
}

export async function buildGreekLearningQuiz(
  selection: GreekLearningQuizSelection,
  attempt = 0
): Promise<GreekLearningQuiz | null> {
  const entry = await getGreekLemmaEntry(selection.entryKey);

  if (!entry) {
    return null;
  }

  const selectedFormValue = selection.selectedForm ?? null;
  const selectedForm = selectedFormValue ? findSelectedForm(entry, selectedFormValue) : null;
  const correctAnswer =
    getGreekLearningDefinitionCandidate(entry) ??
    sanitizeGlossCandidate(selectedForm?.definition ?? selection.gloss ?? "");

  if (!correctAnswer) {
    return null;
  }

  const partOfSpeech =
    getBroadGreekPartOfSpeech({
      morphology: selection.selectedFormMorphology ?? selectedForm?.morphology,
      decodedMorphology:
        selection.selectedFormDecodedMorphology ?? selectedForm?.decodedMorphology
    }) ??
    (entry.forms[0]
      ? getBroadGreekPartOfSpeech({
          morphology: entry.forms[0].morphology,
          decodedMorphology: entry.forms[0].decodedMorphology
        })
      : null);

  const searchableEntries = await loadSearchableGreekEntries();
  const candidateEntries = searchableEntries
    .filter((candidate) => candidate.entryKey !== entry.entryKey)
    .sort(sortGreekLearningEntries);

  const samePartOfSpeechCandidates = candidateEntries.filter((candidate) => {
    if (!partOfSpeech) {
      return false;
    }

    return (
      (candidate.forms[0]
        ? getBroadGreekPartOfSpeech({
            morphology: candidate.forms[0].morphology,
            decodedMorphology: candidate.forms[0].decodedMorphology
          })
        : null) === partOfSpeech
    );
  });

  const seen = new Set<string>([normalizeGlossValue(correctAnswer)]);
  const distractors: string[] = [];
  const addDistractorsFromPool = (pool: GreekLemmaEntry[]) => {
    for (const candidate of pool) {
      const distractor = getGreekLearningDefinitionCandidate(candidate);

      if (!distractor || isNearDuplicateGloss(distractor, correctAnswer)) {
        continue;
      }

      const normalizedDistractor = normalizeGlossValue(distractor);

      if (!normalizedDistractor || seen.has(normalizedDistractor)) {
        continue;
      }

      seen.add(normalizedDistractor);
      distractors.push(distractor);

      if (distractors.length === 3) {
        break;
      }
    }
  };

  addDistractorsFromPool(samePartOfSpeechCandidates);

  if (distractors.length < 3) {
    addDistractorsFromPool(candidateEntries);
  }

  if (distractors.length < 3) {
    return null;
  }

  const correctIndex = ((attempt % 4) + 4) % 4;
  const options = distractors.slice(0, 3).map((label, index) => ({
    id: `distractor:${index}:${normalizeGlossValue(label)}`,
    label,
    isCorrect: false
  }));

  options.splice(correctIndex, 0, {
    id: `correct:${normalizeGlossValue(correctAnswer)}`,
    label: correctAnswer,
    isCorrect: true
  });

  return {
    entry,
    selectedForm,
    selectedFormValue,
    selectedTransliteration:
      selection.transliteration?.trim() ||
      (selectedFormValue ? transliterateGreekSurface(selectedFormValue) : "") ||
      entry.transliteration,
    prompt: "Which meaning matches this word?",
    correctAnswer,
    options
  };
}

export async function getGreekLemmaEntry(strongsNumber: string) {
  const lexicon = await loadGreekLexicon();
  const normalizedKey = strongsNumber.trim();

  return lexicon[normalizedKey] ?? lexicon[normalizeStrongsNumber(normalizedKey)] ?? null;
}

export async function getGreekDictionaryMatchForToken(token: GreekToken): Promise<GreekDictionaryMatch | null> {
  const entryKey = token.entryKey ?? token.strongs;

  if (!entryKey) {
    return null;
  }

  const entry = await getGreekLemmaEntry(entryKey);

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
    .map((entryKey) => lexicon[entryKey] ?? null)
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
      const entry = lexicon[item.entryKey] ?? lexicon[item.strongs ?? ""] ?? null;

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
        ? (left.entry.strongs
            ? Number.parseInt(left.entry.strongs.slice(1), 10)
            : Number.POSITIVE_INFINITY) -
          (right.entry.strongs
            ? Number.parseInt(right.entry.strongs.slice(1), 10)
            : Number.POSITIVE_INFINITY)
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

export async function getGreekVerseOccurrences(entryKey: string) {
  const verses = await loadGreekVerseIndex();

  return verses.filter((entry) =>
    (entry.greekEntryKeys ?? []).includes(entryKey) ||
    (entry.greekTokens ?? []).some((token) => {
      const tokenEntryKey = token.entryKey ?? token.strongs ?? null;

      return tokenEntryKey === entryKey;
    })
  );
}
