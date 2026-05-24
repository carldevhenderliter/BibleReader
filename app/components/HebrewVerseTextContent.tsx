"use client";

import { useMemo } from "react";

import { GreekGrammarCard } from "@/app/components/GreekGrammarCard";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { buildHebrewGrammarInfos } from "@/lib/bible/hebrew-grammar";
import { normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { HebrewToken, Verse } from "@/lib/bible/types";

type HebrewVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  showStrongsNumbers?: boolean;
  showTransliteration?: boolean;
  showLemma?: boolean;
  showGloss?: boolean;
  showMorphology?: boolean;
  showGrammarCards?: boolean;
  highlightedStrongsNumber?: string | null;
  highlightedForm?: string | null;
  onOpenStrongs?: (strongsNumber: string, label?: string | null) => void;
};

function getTokenKey(verseNumber: number, token: HebrewToken, index: number) {
  return `${verseNumber}:${index}:${token.surface}:${token.strongs ?? token.lemma}`;
}

function hasTokenMetadata({
  morphology,
  showGloss,
  showLemma,
  showMorphology,
  showStrongsNumbers,
  showTransliteration,
  token
}: {
  morphology: string;
  token: HebrewToken;
  showGloss: boolean;
  showLemma: boolean;
  showMorphology: boolean;
  showStrongsNumbers: boolean;
  showTransliteration: boolean;
}) {
  return (
    (showStrongsNumbers && Boolean(token.strongs)) ||
    (showLemma && Boolean(token.lemma)) ||
    (showTransliteration && Boolean(token.transliteration)) ||
    (showGloss && Boolean(token.gloss)) ||
    (showMorphology && Boolean(morphology))
  );
}

export function HebrewVerseTextContent({
  verse,
  className,
  showStrongsNumbers = false,
  showTransliteration = true,
  showLemma = true,
  showGloss = true,
  showMorphology = true,
  showGrammarCards = false,
  highlightedStrongsNumber = null,
  highlightedForm = null,
  onOpenStrongs
}: HebrewVerseTextContentProps) {
  const { openGreekGrammarDetails } = useReaderWorkspace();
  const grammarInfos = useMemo(
    () => buildHebrewGrammarInfos(verse?.hebrewTokens ?? []),
    [verse?.hebrewTokens]
  );

  if (!verse) {
    return <p className={className ?? "verse-text verse-text-hebrew"} dir="rtl" lang="he" />;
  }

  if (!verse.hebrewTokens?.length) {
    return (
      <p className={className ?? "verse-text verse-text-hebrew"} dir="rtl" lang="he">
        {verse.text}
      </p>
    );
  }

  const normalizedHighlight = highlightedStrongsNumber
    ? normalizeStrongsNumber(highlightedStrongsNumber)
    : null;
  const normalizedHighlightedForm = highlightedForm
    ? highlightedForm
        .normalize("NFD")
        .replace(/\p{M}+/gu, "")
        .trim()
    : null;

  return (
    <div className={className ?? "verse-text verse-text-hebrew"} dir="ltr">
      <div className="verse-text-hebrew-line">
        {verse.hebrewTokens.map((token, index) => {
          const normalizedTokenStrongs = token.strongs
            ? normalizeStrongsNumber(token.strongs)
            : null;
          const isHighlighted =
            (normalizedHighlight !== null && normalizedHighlight === normalizedTokenStrongs) ||
            (normalizedHighlightedForm !== null &&
              token.surface.normalize("NFD").replace(/\p{M}+/gu, "").trim() ===
                normalizedHighlightedForm);
          const morphology = token.decodedMorphology || token.morphology || "";
          const grammarInfo = grammarInfos[index] ?? null;
          const hasMetadata = hasTokenMetadata({
            morphology,
            showGloss,
            showLemma,
            showMorphology,
            showStrongsNumbers,
            showTransliteration,
            token
          });
          const tokenBody = (
            <span className="verse-hebrew-token-body">
              <span className="verse-hebrew-token-surface" dir="rtl" lang="he">
                {token.surface}
              </span>
              {showStrongsNumbers && token.strongs ? (
                <span className="verse-hebrew-token-strongs" dir="ltr">
                  {token.strongs}
                </span>
              ) : null}
              {showTransliteration && token.transliteration ? (
                <span className="verse-hebrew-token-transliteration" dir="ltr">
                  {token.transliteration}
                </span>
              ) : null}
              {showLemma && token.lemma ? (
                <span className="verse-hebrew-token-lemma" dir="rtl" lang="he">
                  {token.lemma}
                </span>
              ) : null}
              {showGloss && token.gloss ? (
                <span className="verse-hebrew-token-gloss" dir="ltr">
                  {token.gloss}
                </span>
              ) : null}
              {showMorphology && morphology ? (
                <span className="verse-hebrew-token-morphology" dir="ltr">
                  {morphology}
                </span>
              ) : null}
            </span>
          );

          return (
            <span className="verse-hebrew-token-wrap" key={getTokenKey(verse.number, token, index)}>
              {token.strongs && onOpenStrongs ? (
                <button
                  aria-label={`${token.surface} ${token.lemma} ${token.strongs}`.trim()}
                  className={`verse-hebrew-token${hasMetadata ? " has-metadata" : ""}${
                    isHighlighted ? " strongs-token-match" : ""
                  }`}
                  onClick={() => {
                    if (showGrammarCards && grammarInfo) {
                      openGreekGrammarDetails({
                        language: "hebrew",
                        entryKey: token.strongs ?? token.lemma,
                        strongs: token.strongs ?? null,
                        lemma: token.lemma,
                        label: token.lemma || token.surface,
                        selectedForm: token.surface,
                        selectedFormMorphology: token.morphology ?? null,
                        selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                        matchedQuery: token.surface,
                        transliteration: token.transliteration ?? null,
                        gloss: token.gloss ?? null,
                        grammar: grammarInfo
                      });
                      return;
                    }

                    onOpenStrongs(token.strongs ?? "", token.surface);
                  }}
                  type="button"
                >
                  {tokenBody}
                </button>
              ) : (
                <span
                  className={`verse-hebrew-token verse-hebrew-token-static${
                    hasMetadata ? " has-metadata" : ""
                  }${isHighlighted ? " strongs-token-match" : ""}`}
                >
                  {tokenBody}
                </span>
              )}
              {showGrammarCards && grammarInfo ? (
                <GreekGrammarCard grammar={grammarInfo} language="hebrew" />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
