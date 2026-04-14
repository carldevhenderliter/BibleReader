"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type {
  GreekLemmaGlossPreference,
  GreekTokenGlossOverride
} from "@/lib/bible/types";

export const GREEK_GLOSS_OVERRIDES_STORAGE_KEY = "bible-reader:greek-gloss-overrides";
export const GREEK_GLOSS_DEFAULTS_STORAGE_KEY = "bible-reader:greek-gloss-defaults";

type GreekGlossOverridesContextValue = {
  getOverride: (occurrenceKey: string) => GreekTokenGlossOverride | null;
  saveOverride: (override: GreekTokenGlossOverride) => void;
  clearOverride: (occurrenceKey: string) => void;
  getLemmaDefault: (lookup: {
    entryKey?: string | null;
    strongs?: string | null;
    lemma: string;
  }) => GreekLemmaGlossPreference | null;
  saveLemmaDefault: (preference: GreekLemmaGlossPreference) => void;
  clearLemmaDefault: (lookup: {
    entryKey?: string | null;
    strongs?: string | null;
    lemma: string;
  }) => void;
};

const GreekGlossOverridesContext = createContext<GreekGlossOverridesContextValue | null>(null);

function getGreekLemmaGlossPreferenceKey(lookup: {
  entryKey?: string | null;
  strongs?: string | null;
  lemma: string;
}) {
  const entryKey = lookup.entryKey?.trim();

  if (entryKey) {
    return `entry:${entryKey}`;
  }

  const strongs = lookup.strongs?.trim();

  if (strongs) {
    return `strongs:${strongs}`;
  }

  return `lemma:${lookup.lemma.trim().toLowerCase()}`;
}

function normalizeGreekGlossOverrideStorage(
  value: unknown
): Record<string, GreekTokenGlossOverride> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, GreekTokenGlossOverride>
  >((normalized, [occurrenceKey, candidate]) => {
    if (!candidate || typeof candidate !== "object") {
      return normalized;
    }

    const override = candidate as Partial<GreekTokenGlossOverride>;

    if (
      typeof override.occurrenceKey !== "string" ||
      typeof override.lemma !== "string" ||
      typeof override.selectedGloss !== "string" ||
      (override.source !== "lemma-option" && override.source !== "custom")
    ) {
      return normalized;
    }

    normalized[occurrenceKey] = {
      occurrenceKey: override.occurrenceKey,
      entryKey: typeof override.entryKey === "string" ? override.entryKey : undefined,
      strongs: typeof override.strongs === "string" ? override.strongs : undefined,
      lemma: override.lemma,
      selectedGloss: override.selectedGloss,
      optionId: typeof override.optionId === "string" ? override.optionId : undefined,
      source: override.source
    };
    return normalized;
  }, {});
}

function normalizeGreekLemmaGlossPreferenceStorage(
  value: unknown
): Record<string, GreekLemmaGlossPreference> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, GreekLemmaGlossPreference>
  >((normalized, [lookupKey, candidate]) => {
    if (!candidate || typeof candidate !== "object") {
      return normalized;
    }

    const preference = candidate as Partial<GreekLemmaGlossPreference>;

    if (
      typeof preference.lemma !== "string" ||
      typeof preference.selectedGloss !== "string" ||
      (preference.source !== "lemma-option" && preference.source !== "custom")
    ) {
      return normalized;
    }

    normalized[lookupKey] = {
      entryKey: typeof preference.entryKey === "string" ? preference.entryKey : undefined,
      strongs: typeof preference.strongs === "string" ? preference.strongs : undefined,
      lemma: preference.lemma,
      selectedGloss: preference.selectedGloss,
      optionId: typeof preference.optionId === "string" ? preference.optionId : undefined,
      source: preference.source
    };
    return normalized;
  }, {});
}

export function GreekGlossOverridesProvider({ children }: PropsWithChildren) {
  const [overrides, setOverrides] = useState<Record<string, GreekTokenGlossOverride>>({});
  const [lemmaDefaults, setLemmaDefaults] = useState<Record<string, GreekLemmaGlossPreference>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(GREEK_GLOSS_OVERRIDES_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setOverrides(normalizeGreekGlossOverrideStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(GREEK_GLOSS_OVERRIDES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(GREEK_GLOSS_DEFAULTS_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setLemmaDefaults(normalizeGreekLemmaGlossPreferenceStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(GREEK_GLOSS_DEFAULTS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GREEK_GLOSS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

  useEffect(() => {
    window.localStorage.setItem(
      GREEK_GLOSS_DEFAULTS_STORAGE_KEY,
      JSON.stringify(lemmaDefaults)
    );
  }, [lemmaDefaults]);

  const value = useMemo<GreekGlossOverridesContextValue>(
    () => ({
      getOverride: (occurrenceKey) => overrides[occurrenceKey] ?? null,
      saveOverride: (override) => {
        setOverrides((current) => ({
          ...current,
          [override.occurrenceKey]: override
        }));
      },
      clearOverride: (occurrenceKey) => {
        setOverrides((current) => {
          if (!current[occurrenceKey]) {
            return current;
          }

          const next = { ...current };
          delete next[occurrenceKey];
          return next;
        });
      },
      getLemmaDefault: (lookup) =>
        lemmaDefaults[getGreekLemmaGlossPreferenceKey(lookup)] ?? null,
      saveLemmaDefault: (preference) => {
        const lookupKey = getGreekLemmaGlossPreferenceKey(preference);
        setLemmaDefaults((current) => ({
          ...current,
          [lookupKey]: preference
        }));
      },
      clearLemmaDefault: (lookup) => {
        const lookupKey = getGreekLemmaGlossPreferenceKey(lookup);

        setLemmaDefaults((current) => {
          if (!current[lookupKey]) {
            return current;
          }

          const next = { ...current };
          delete next[lookupKey];
          return next;
        });
      }
    }),
    [lemmaDefaults, overrides]
  );

  return (
    <GreekGlossOverridesContext.Provider value={value}>
      {children}
    </GreekGlossOverridesContext.Provider>
  );
}

export function useGreekGlossOverrides() {
  const context = useContext(GreekGlossOverridesContext);

  if (!context) {
    throw new Error("useGreekGlossOverrides must be used within GreekGlossOverridesProvider.");
  }

  return context;
}

export { normalizeGreekGlossOverrideStorage };
export { getGreekLemmaGlossPreferenceKey, normalizeGreekLemmaGlossPreferenceStorage };
