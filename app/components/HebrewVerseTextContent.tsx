"use client";

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
  highlightedStrongsNumber?: string | null;
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
  highlightedStrongsNumber = null,
  onOpenStrongs
}: HebrewVerseTextContentProps) {
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

  return (
    <div className={className ?? "verse-text verse-text-hebrew"} dir="rtl" lang="he">
      <div className="verse-text-hebrew-line">
        {verse.hebrewTokens.map((token, index) => {
          const normalizedTokenStrongs = token.strongs
            ? normalizeStrongsNumber(token.strongs)
            : null;
          const isHighlighted =
            normalizedHighlight !== null && normalizedHighlight === normalizedTokenStrongs;
          const morphology = token.decodedMorphology || token.morphology || "";
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
                  onClick={() => onOpenStrongs(token.strongs ?? "", token.surface)}
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
            </span>
          );
        })}
      </div>
    </div>
  );
}
