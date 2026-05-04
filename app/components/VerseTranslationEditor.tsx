"use client";

import { useMemo } from "react";

import { useGreekGlossOverrides } from "@/app/components/GreekGlossOverridesProvider";
import { getGreekTokenOccurrenceKey } from "@/lib/bible/greek";
import type { GreekToken } from "@/lib/bible/types";

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
  getGloss: (occurrenceKey: string) => string
) {
  let translation = "";

  greekTokens.forEach((token, tokenIndex) => {
    const occurrenceKey =
      token.occurrenceKey ??
      getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verseNumber, tokenIndex);
    const gloss = getGloss(occurrenceKey);

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
  const { getOverride } = useGreekGlossOverrides();

  const translation = useMemo(
    () =>
      buildGlossTranslation(
        bookSlug,
        chapterNumber,
        verseNumber,
        greekTokens,
        (occurrenceKey) => getOverride(occurrenceKey)?.selectedGloss?.trim() ?? ""
      ),
    [bookSlug, chapterNumber, getOverride, greekTokens, verseNumber]
  );

  if (!translation) {
    return null;
  }

  return (
    <section className="verse-custom-translation is-saved">
      <div className="verse-custom-translation-header">
        <p className="verse-custom-translation-title">Your translation</p>
      </div>
      <p className="verse-text verse-custom-translation-copy">{translation}</p>
    </section>
  );
}
