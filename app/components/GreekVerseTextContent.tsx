"use client";

import type { Verse } from "@/lib/bible/types";

type GreekVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  onOpenGreekDictionary?: NonNullable<{
    (
      selection: {
        entryKey: string;
        strongs?: string | null;
        lemma: string;
        label?: string | null;
        selectedForm?: string | null;
        selectedFormMorphology?: string | null;
        selectedFormDecodedMorphology?: string | null;
        matchedQuery?: string | null;
      }
    ): void;
  }>;
};

export function GreekVerseTextContent({
  verse,
  className,
  onOpenGreekDictionary
}: GreekVerseTextContentProps) {
  if (!verse) {
    return <p className={className ?? "verse-text verse-text-greek"} lang="el" />;
  }

  if (!verse.greekTokens?.length || !onOpenGreekDictionary) {
    return (
      <p className={className ?? "verse-text verse-text-greek"} lang="el">
        {verse.text}
      </p>
    );
  }

  return (
    <p className={className ?? "verse-text verse-text-greek"} lang="el">
      {verse.greekTokens.map((token, index) => {
        const entryKey = token.entryKey ?? token.strongs ?? null;

        return (
          <span className="verse-greek-inline-wrap" key={`${verse.number}:${index}:${token.surface}`}>
            {entryKey ? (
              <button
                className="verse-greek-inline-token"
                onClick={() =>
                  onOpenGreekDictionary({
                    entryKey,
                    strongs: token.strongs ?? null,
                    lemma: token.lemma,
                    label: token.lemma,
                    selectedForm: token.surface,
                    selectedFormMorphology: token.morphology ?? null,
                    selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                    matchedQuery: token.surface
                  })
                }
                type="button"
              >
                {token.surface}
              </button>
            ) : (
              <span className="verse-greek-inline-token-text">{token.surface}</span>
            )}
            {token.trailingPunctuation ? (
              <span aria-hidden="true" className="verse-greek-inline-punctuation">
                {token.trailingPunctuation}
              </span>
            ) : null}
          </span>
        );
      })}
    </p>
  );
}
