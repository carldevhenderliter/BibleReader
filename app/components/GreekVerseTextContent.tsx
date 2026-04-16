"use client";

import { transliterateGreekSurface } from "@/lib/bible/greek";
import type { Verse } from "@/lib/bible/types";

type GreekVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  displayMode?: "inline" | "stacked";
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
  displayMode = "inline",
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

  if (displayMode === "stacked") {
    return (
      <div className={className ?? "verse-text verse-text-greek"} lang="el">
        <div className="verse-interlinear verse-compare-token-line">
          {verse.greekTokens.map((token, index) => {
            const entryKey = token.entryKey ?? token.strongs ?? null;

            return (
              <span className="verse-greek-token-wrap verse-compare-token-wrap" key={`${verse.number}:${index}:${token.surface}`}>
                <button
                  aria-label={`${token.surface} ${token.lemma} ${token.strongs ?? ""}`.trim()}
                  className="verse-greek-token verse-compare-token"
                  onClick={() => {
                    if (!entryKey) {
                      return;
                    }

                    onOpenGreekDictionary({
                      entryKey,
                      strongs: token.strongs ?? null,
                      lemma: token.lemma,
                      label: token.lemma,
                      selectedForm: token.surface,
                      selectedFormMorphology: token.morphology ?? null,
                      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                      matchedQuery: token.surface
                    });
                  }}
                  type="button"
                >
                  <span className="verse-greek-surface verse-compare-token-surface">{token.surface}</span>
                  <span className="verse-greek-transliteration verse-compare-token-transliteration">
                    {token.transliteration ?? transliterateGreekSurface(token.surface)}
                  </span>
                  <span className="verse-greek-lemma verse-compare-token-lemma">{token.lemma}</span>
                  {token.gloss ? (
                    <span className="verse-greek-gloss verse-compare-token-gloss">{token.gloss}</span>
                  ) : null}
                </button>
              </span>
            );
          })}
        </div>
      </div>
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
