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

import type { GreekTokenGlossOverride } from "@/lib/bible/types";

export const GREEK_GLOSS_OVERRIDES_STORAGE_KEY = "bible-reader:greek-gloss-overrides";

type GreekGlossOverridesContextValue = {
  getOverride: (occurrenceKey: string) => GreekTokenGlossOverride | null;
  saveOverride: (override: GreekTokenGlossOverride) => void;
  clearOverride: (occurrenceKey: string) => void;
};

const GreekGlossOverridesContext = createContext<GreekGlossOverridesContextValue | null>(null);

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
      typeof override.strongs !== "string" ||
      typeof override.lemma !== "string" ||
      typeof override.selectedGloss !== "string" ||
      (override.source !== "lemma-option" && override.source !== "custom")
    ) {
      return normalized;
    }

    normalized[occurrenceKey] = {
      occurrenceKey: override.occurrenceKey,
      strongs: override.strongs,
      lemma: override.lemma,
      selectedGloss: override.selectedGloss,
      optionId: typeof override.optionId === "string" ? override.optionId : undefined,
      source: override.source
    };
    return normalized;
  }, {});
}

export function GreekGlossOverridesProvider({ children }: PropsWithChildren) {
  const [overrides, setOverrides] = useState<Record<string, GreekTokenGlossOverride>>({});

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
    window.localStorage.setItem(GREEK_GLOSS_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  }, [overrides]);

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
      }
    }),
    [overrides]
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
