"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export const VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY = "bible-reader:verse-translations";

export type VerseTranslationOverride = {
  referenceKey: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  updatedAt: string;
};

type VerseTranslationOverridesContextValue = {
  getTranslation: (referenceKey: string) => VerseTranslationOverride | null;
  saveTranslation: (translation: Omit<VerseTranslationOverride, "updatedAt">) => void;
  clearTranslation: (referenceKey: string) => void;
};

const VerseTranslationOverridesContext =
  createContext<VerseTranslationOverridesContextValue | null>(null);

export function getVerseTranslationReferenceKey(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number
) {
  return `${bookSlug}:${chapterNumber}:${verseNumber}`;
}

function normalizeVerseTranslationOverrideStorage(
  value: unknown
): Record<string, VerseTranslationOverride> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    Record<string, VerseTranslationOverride>
  >((normalized, [referenceKey, candidate]) => {
    if (!candidate || typeof candidate !== "object") {
      return normalized;
    }

    const translation = candidate as Partial<VerseTranslationOverride>;

    if (
      typeof translation.referenceKey !== "string" ||
      typeof translation.bookSlug !== "string" ||
      typeof translation.chapterNumber !== "number" ||
      typeof translation.verseNumber !== "number" ||
      typeof translation.text !== "string"
    ) {
      return normalized;
    }

    normalized[referenceKey] = {
      referenceKey: translation.referenceKey,
      bookSlug: translation.bookSlug,
      chapterNumber: translation.chapterNumber,
      verseNumber: translation.verseNumber,
      text: translation.text,
      updatedAt:
        typeof translation.updatedAt === "string" && translation.updatedAt.length > 0
          ? translation.updatedAt
          : new Date(0).toISOString()
    };
    return normalized;
  }, {});
}

export function VerseTranslationOverridesProvider({ children }: PropsWithChildren) {
  const [translations, setTranslations] = useState<Record<string, VerseTranslationOverride>>({});

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setTranslations(normalizeVerseTranslationOverrideStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY,
      JSON.stringify(translations)
    );
  }, [translations]);

  const value = useMemo<VerseTranslationOverridesContextValue>(
    () => ({
      getTranslation: (referenceKey) => translations[referenceKey] ?? null,
      saveTranslation: (translation) => {
        setTranslations((current) => ({
          ...current,
          [translation.referenceKey]: {
            ...translation,
            text: translation.text.trim(),
            updatedAt: new Date().toISOString()
          }
        }));
      },
      clearTranslation: (referenceKey) => {
        setTranslations((current) => {
          if (!current[referenceKey]) {
            return current;
          }

          const next = { ...current };
          delete next[referenceKey];
          return next;
        });
      }
    }),
    [translations]
  );

  return (
    <VerseTranslationOverridesContext.Provider value={value}>
      {children}
    </VerseTranslationOverridesContext.Provider>
  );
}

export function useVerseTranslationOverrides() {
  const context = useContext(VerseTranslationOverridesContext);

  if (!context) {
    throw new Error(
      "useVerseTranslationOverrides must be used within VerseTranslationOverridesProvider."
    );
  }

  return context;
}

export { normalizeVerseTranslationOverrideStorage };
