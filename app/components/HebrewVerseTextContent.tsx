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
  highlightedStrongsNumber?: string | null;
  onOpenStrongs?: (strongsNumber: string, label?: string | null) => void;
};

function getTokenKey(verseNumber: number, token: HebrewToken, index: number) {
  return `${verseNumber}:${index}:${token.surface}:${token.strongs ?? token.lemma}`;
}

function hasReadingAids({
  token,
  showGloss,
  showLemma,
  showStrongsNumbers,
  showTransliteration
}: {
  token: HebrewToken;
  showGloss: boolean;
  showLemma: boolean;
  showStrongsNumbers: boolean;
  showTransliteration: boolean;
}) {
  return (
    (showStrongsNumbers && Boolean(token.strongs)) ||
    (showLemma && Boolean(token.lemma)) ||
    (showTransliteration && Boolean(token.transliteration)) ||
    (showGloss && Boolean(token.gloss)) ||
    Boolean(token.decodedMorphology || token.morphology)
  );
}

export function HebrewVerseTextContent({
  verse,
  className,
  showStrongsNumbers = false,
  showTransliteration = true,
  showLemma = true,
  showGloss = true,
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
      <p className="verse-text-hebrew-line">
        {verse.hebrewTokens.map((token, index) => {
          const normalizedTokenStrongs = token.strongs
            ? normalizeStrongsNumber(token.strongs)
            : null;
          const isHighlighted =
            normalizedHighlight !== null && normalizedHighlight === normalizedTokenStrongs;
          const tokenBody = (
            <>
              <span className="verse-hebrew-token-surface">{token.surface}</span>
              {showStrongsNumbers && token.strongs ? (
                <span className="verse-hebrew-inline-strongs" dir="ltr">
                  {token.strongs}
                </span>
              ) : null}
            </>
          );

          return token.strongs && onOpenStrongs ? (
            <button
              aria-label={`${token.surface} ${token.lemma} ${token.strongs}`.trim()}
              className={`verse-hebrew-inline-token${isHighlighted ? " strongs-token-match" : ""}`}
              key={getTokenKey(verse.number, token, index)}
              onClick={() => onOpenStrongs(token.strongs ?? "", token.surface)}
              type="button"
            >
              {tokenBody}
            </button>
          ) : (
            <span
              className={`verse-hebrew-inline-token-text${isHighlighted ? " strongs-token-match" : ""}`}
              key={getTokenKey(verse.number, token, index)}
            >
              {tokenBody}
            </span>
          );
        })}
      </p>
      {verse.hebrewTokens.some((token) =>
        hasReadingAids({
          token,
          showGloss,
          showLemma,
          showStrongsNumbers,
          showTransliteration
        })
      ) ? (
        <dl className="hebrew-verse-reading-aids" dir="ltr">
          {verse.hebrewTokens.map((token, index) => {
            const morphology = token.decodedMorphology || token.morphology || "";
            const details = [
              showLemma ? token.lemma : "",
              showTransliteration ? token.transliteration : "",
              showGloss ? token.gloss : "",
              morphology
            ]
              .map((item) => item?.trim())
              .filter(Boolean);

            if (details.length === 0 && !(showStrongsNumbers && token.strongs)) {
              return null;
            }

            return (
              <div key={`aid:${getTokenKey(verse.number, token, index)}`}>
                <dt dir="rtl" lang="he">
                  {token.surface}
                </dt>
                <dd>
                  {showStrongsNumbers && token.strongs ? (
                    <span className="hebrew-verse-reading-aids-code">{token.strongs}</span>
                  ) : null}
                  {details.length > 0 ? (
                    <span>{details.join(" · ")}</span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}
    </div>
  );
}
