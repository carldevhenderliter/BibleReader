"use client";

import { GreekInlineQuizAnswer } from "@/app/components/GreekInlineQuizAnswer";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { transliterateGreekSurface } from "@/lib/bible/greek";
import type { GreekToken, Verse } from "@/lib/bible/types";

type GreekVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  displayMode?: "inline" | "stacked";
  showSurface?: boolean;
  showTransliteration?: boolean;
  showLemma?: boolean;
  showGloss?: boolean;
  enableGreekLearning?: boolean;
  getOccurrenceKey?: (token: GreekToken, index: number) => string;
  onOpenGreekDictionary?: NonNullable<{
    (
      selection: {
        entryKey: string;
        strongs?: string | null;
        lemma: string;
        label?: string | null;
        occurrenceKey?: string | null;
        selectedForm?: string | null;
        selectedFormMorphology?: string | null;
        selectedFormDecodedMorphology?: string | null;
        matchedQuery?: string | null;
        transliteration?: string | null;
        gloss?: string | null;
      }
    ): void;
  }>;
};

export function GreekVerseTextContent({
  verse,
  className,
  displayMode = "inline",
  showSurface = true,
  showTransliteration = true,
  showLemma = true,
  showGloss = true,
  enableGreekLearning = true,
  getOccurrenceKey,
  onOpenGreekDictionary
}: GreekVerseTextContentProps) {
  const { activeGreekLearningQuizSelection, isGreekLearningMode } = useReaderWorkspace();

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
            const occurrenceKey =
              getOccurrenceKey?.(token, index) ??
              token.occurrenceKey ??
              `greek:${verse.number}:${index}`;

            return (
              <span
                className="verse-greek-token-wrap verse-compare-token-wrap"
                key={`${verse.number}:${index}:${token.surface}`}
              >
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
                      occurrenceKey,
                      selectedForm: token.surface,
                      selectedFormMorphology: token.morphology ?? null,
                      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                      matchedQuery: token.surface,
                      transliteration:
                        token.transliteration ?? transliterateGreekSurface(token.surface),
                      gloss: token.gloss ?? null
                    });
                  }}
                  type="button"
                >
                  {showSurface ? (
                    <span className="verse-greek-surface verse-compare-token-surface">
                      {token.surface}
                    </span>
                  ) : null}
                  {showTransliteration ? (
                    <span className="verse-greek-transliteration verse-compare-token-transliteration">
                      {token.transliteration ?? transliterateGreekSurface(token.surface)}
                    </span>
                  ) : null}
                  {showLemma ? (
                    <span className="verse-greek-lemma verse-compare-token-lemma">{token.lemma}</span>
                  ) : null}
                  {showGloss && token.gloss ? (
                    <span className="verse-greek-gloss verse-compare-token-gloss">{token.gloss}</span>
                  ) : null}
                </button>
                {enableGreekLearning &&
                isGreekLearningMode &&
                activeGreekLearningQuizSelection?.occurrenceKey === occurrenceKey ? (
                  <GreekInlineQuizAnswer selection={activeGreekLearningQuizSelection} />
                ) : null}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? "verse-text verse-text-greek"} lang="el">
      {verse.greekTokens.map((token, index) => {
        const entryKey = token.entryKey ?? token.strongs ?? null;
        const occurrenceKey =
          getOccurrenceKey?.(token, index) ??
          token.occurrenceKey ??
          `greek:${verse.number}:${index}`;

        return (
          <span className="verse-greek-inline-wrap" key={`${verse.number}:${index}:${token.surface}`}>
            <span className="verse-greek-inline-head">
              {entryKey ? (
                <button
                  className="verse-greek-inline-token"
                  onClick={() =>
                    onOpenGreekDictionary({
                      entryKey,
                      strongs: token.strongs ?? null,
                      lemma: token.lemma,
                      label: token.lemma,
                      occurrenceKey,
                      selectedForm: token.surface,
                      selectedFormMorphology: token.morphology ?? null,
                      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                      matchedQuery: token.surface,
                      transliteration:
                        token.transliteration ?? transliterateGreekSurface(token.surface),
                      gloss: token.gloss ?? null
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
            {enableGreekLearning &&
            isGreekLearningMode &&
            activeGreekLearningQuizSelection?.occurrenceKey === occurrenceKey ? (
              <GreekInlineQuizAnswer selection={activeGreekLearningQuizSelection} />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
