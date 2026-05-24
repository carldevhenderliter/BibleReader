"use client";

import { useEffect, useMemo, useState } from "react";

import { useGreekGlossOverrides } from "@/app/components/GreekGlossOverridesProvider";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import {
  getGreekLemmaEntry,
  getGreekTokenOccurrenceKey,
  resolveGreekTokenGloss
} from "@/lib/bible/greek";
import type { GreekLemmaEntry, GreekToken } from "@/lib/bible/types";

type VerseTranslationEditorProps = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  greekTokens: GreekToken[];
};

function buildGlossTranslation(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  greekTokens: GreekToken[],
  getGloss: (occurrenceKey: string, token: GreekToken) => string
) {
  let translation = "";

  greekTokens.forEach((token, tokenIndex) => {
    const occurrenceKey =
      token.occurrenceKey ??
      getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verseNumber, tokenIndex);
    const gloss = getGloss(occurrenceKey, token);

    if (!gloss) {
      return;
    }

    if (translation.length > 0) {
      translation += " ";
    }

    translation += gloss;

    if (token.trailingPunctuation) {
      translation += token.trailingPunctuation;
    }
  });

  return translation.trim();
}

export function VerseTranslationEditor({
  bookSlug,
  chapterNumber,
  verseNumber,
  greekTokens
}: VerseTranslationEditorProps) {
  const { getLemmaDefault, getOverride } = useGreekGlossOverrides();
  const { settings } = useReaderCustomization();
  const [entriesByKey, setEntriesByKey] = useState<Record<string, GreekLemmaEntry>>({});

  useEffect(() => {
    if (!greekTokens.length) {
      setEntriesByKey({});
      return;
    }

    let isCancelled = false;
    const uniqueEntryKeys = Array.from(
      new Set(greekTokens.map((token) => token.entryKey ?? token.strongs).filter(Boolean))
    ).filter((entryKey): entryKey is string => typeof entryKey === "string" && entryKey.length > 0);

    void Promise.all(
      uniqueEntryKeys.map(async (entryKey) => {
        const entry = await getGreekLemmaEntry(entryKey);
        return entry ? ([entryKey, entry] as const) : null;
      })
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      setEntriesByKey(
        Object.fromEntries(
          results.filter(
            (result): result is readonly [string, GreekLemmaEntry] => result !== null
          )
        )
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [greekTokens]);

  const translation = useMemo(
    () =>
      buildGlossTranslation(
        bookSlug,
        chapterNumber,
        verseNumber,
        greekTokens,
        (occurrenceKey, token) => {
          const entryKey = token.entryKey ?? token.strongs ?? null;
          const entry = entryKey ? entriesByKey[entryKey] ?? null : null;
          const override = getOverride(occurrenceKey);
          const lemmaPreference = getLemmaDefault({
            entryKey: token.entryKey,
            strongs: token.strongs,
            lemma: token.lemma
          });

          return resolveGreekTokenGloss(token, entry, override, lemmaPreference);
        }
      ),
    [bookSlug, chapterNumber, entriesByKey, getLemmaDefault, getOverride, greekTokens, verseNumber]
  );

  if (!translation) {
    return null;
  }

  return (
    <section className="verse-custom-translation is-saved">
      {settings.showChapterHeadings ? (
        <div className="verse-custom-translation-header">
          <p className="verse-custom-translation-title">Your translation</p>
        </div>
      ) : null}
      <p className="verse-text verse-custom-translation-copy">{translation}</p>
    </section>
  );
}
