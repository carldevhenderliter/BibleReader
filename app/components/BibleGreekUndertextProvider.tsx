"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  BIBLE_GREEK_UNDERTEXT_STORAGE_KEY,
  normalizeBibleGreekUndertextAnnotationStorage
} from "@/lib/bible/annotations";
import type {
  BibleGreekUndertextAnnotation,
  BibleGreekUndertextAnnotationRecord
} from "@/lib/bible/types";

type BibleGreekUndertextContextValue = {
  getVerseAnnotations: (verseKey: string) => BibleGreekUndertextAnnotation[];
  saveVerseAnnotations: (
    verseKey: string,
    annotations: BibleGreekUndertextAnnotation[]
  ) => void;
  clearVerseAnnotations: (verseKey: string) => void;
};

const BibleGreekUndertextContext =
  createContext<BibleGreekUndertextContextValue | null>(null);

export function BibleGreekUndertextProvider({ children }: PropsWithChildren) {
  const [annotationsByVerse, setAnnotationsByVerse] = useState<BibleGreekUndertextAnnotationRecord>(
    {}
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(BIBLE_GREEK_UNDERTEXT_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setAnnotationsByVerse(normalizeBibleGreekUndertextAnnotationStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(BIBLE_GREEK_UNDERTEXT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      BIBLE_GREEK_UNDERTEXT_STORAGE_KEY,
      JSON.stringify(annotationsByVerse)
    );
  }, [annotationsByVerse]);

  const value = useMemo<BibleGreekUndertextContextValue>(
    () => ({
      getVerseAnnotations: (verseKey) => annotationsByVerse[verseKey] ?? [],
      saveVerseAnnotations: (verseKey, annotations) => {
        setAnnotationsByVerse((current) => ({
          ...current,
          [verseKey]: annotations
        }));
      },
      clearVerseAnnotations: (verseKey) => {
        setAnnotationsByVerse((current) => {
          if (!current[verseKey]) {
            return current;
          }

          const next = { ...current };
          delete next[verseKey];
          return next;
        });
      }
    }),
    [annotationsByVerse]
  );

  return (
    <BibleGreekUndertextContext.Provider value={value}>
      {children}
    </BibleGreekUndertextContext.Provider>
  );
}

export function useBibleGreekUndertext() {
  const context = useContext(BibleGreekUndertextContext);

  if (!context) {
    throw new Error(
      "useBibleGreekUndertext must be used within BibleGreekUndertextProvider."
    );
  }

  return context;
}

export { BIBLE_GREEK_UNDERTEXT_STORAGE_KEY };
