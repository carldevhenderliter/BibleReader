import type {
  GreekInflectedForm,
  GreekLemmaEntry,
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

  const formMatches = (formIndex[normalizedFormQuery] ?? [])
    .map((item) => {
      const entry = lexicon[item.strongs] ?? null;

      if (!entry) {
        return null;
      }

      const selectedForm = findSelectedForm(entry, item.form);

      return {
        entry,
        selectedForm,
        selectedFormValue: item.form,
        matchType: "form" as const
      };
    })
    .filter((entry): entry is GreekDictionaryMatch => entry !== null);

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
