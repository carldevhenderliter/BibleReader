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
export const GREEK_GLOSS_EXPORT_SCHEMA = "bible-reader.greek-gloss-export";
export const GREEK_GLOSS_EXPORT_VERSION = 1;

export type GreekGlossExportPayload = {
  schema: typeof GREEK_GLOSS_EXPORT_SCHEMA;
  version: typeof GREEK_GLOSS_EXPORT_VERSION;
  exportedAt: string;
  overrides: Record<string, GreekTokenGlossOverride>;
  lemmaDefaults: Record<string, GreekLemmaGlossPreference>;
};

export type GreekGlossExportDownloadResult = {
  fileName: string;
  overrideCount: number;
  lemmaDefaultCount: number;
};

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

export function buildGreekGlossExportPayload(
  overrides: Record<string, GreekTokenGlossOverride>,
  lemmaDefaults: Record<string, GreekLemmaGlossPreference>,
  exportedAt = new Date().toISOString()
): GreekGlossExportPayload {
  return {
    schema: GREEK_GLOSS_EXPORT_SCHEMA,
    version: GREEK_GLOSS_EXPORT_VERSION,
    exportedAt,
    overrides: normalizeGreekGlossOverrideStorage(overrides),
    lemmaDefaults: normalizeGreekLemmaGlossPreferenceStorage(lemmaDefaults)
  };
}

export function normalizeGreekGlossExportPayload(
  value: unknown
): GreekGlossExportPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<GreekGlossExportPayload>;

  if (
    candidate.schema !== GREEK_GLOSS_EXPORT_SCHEMA ||
    candidate.version !== GREEK_GLOSS_EXPORT_VERSION ||
    typeof candidate.exportedAt !== "string"
  ) {
    return null;
  }

  return buildGreekGlossExportPayload(
    normalizeGreekGlossOverrideStorage(candidate.overrides),
    normalizeGreekLemmaGlossPreferenceStorage(candidate.lemmaDefaults),
    candidate.exportedAt
  );
}

function readGreekGlossStorage<T>(
  storageKey: string,
  normalize: (value: unknown) => T,
  fallback: T
) {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);

    return stored ? normalize(JSON.parse(stored)) : fallback;
  } catch {
    return fallback;
  }
}

function getGreekGlossExportFileName(exportedAt: Date) {
  const timestamp = exportedAt.toISOString().replace(/[:.]/g, "-");

  return `greek-gloss-export-${timestamp}.json`;
}

export function downloadGreekGlossExportFile(
  exportedAt = new Date()
): GreekGlossExportDownloadResult | null {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const overrides = readGreekGlossStorage(
    GREEK_GLOSS_OVERRIDES_STORAGE_KEY,
    normalizeGreekGlossOverrideStorage,
    {}
  );
  const lemmaDefaults = readGreekGlossStorage(
    GREEK_GLOSS_DEFAULTS_STORAGE_KEY,
    normalizeGreekLemmaGlossPreferenceStorage,
    {}
  );
  const payload = buildGreekGlossExportPayload(
    overrides,
    lemmaDefaults,
    exportedAt.toISOString()
  );
  const fileName = getGreekGlossExportFileName(exportedAt);
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
    type: "application/json"
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);

  return {
    fileName,
    overrideCount: Object.keys(payload.overrides).length,
    lemmaDefaultCount: Object.keys(payload.lemmaDefaults).length
  };
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
