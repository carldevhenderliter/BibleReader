"use client";

import { useMemo, useState } from "react";

import type { HebrewToken, Verse } from "@/lib/bible/types";

type HebrewVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  onOpenStrongs?: (strongsNumbers: string[], label?: string | null) => void;
};

function getTokenSummary(token: HebrewToken) {
  return [token.lemma, token.transliteration, token.gloss].filter(Boolean).join(" · ");
}

export function HebrewVerseTextContent({
  verse,
  className,
  onOpenStrongs
}: HebrewVerseTextContentProps) {
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number | null>(0);
  const selectedToken = useMemo(() => {
    if (!verse?.hebrewTokens?.length) {
      return null;
    }

    return verse.hebrewTokens[selectedTokenIndex ?? 0] ?? verse.hebrewTokens[0] ?? null;
  }, [selectedTokenIndex, verse?.hebrewTokens]);

  if (!verse) {
    return <div className={className ?? "verse-text verse-text-hebrew"} dir="rtl" lang="he" />;
  }

  if (!verse.hebrewTokens?.length) {
    return (
      <div className={className ?? "verse-text verse-text-hebrew"} dir="rtl" lang="he">
        {verse.text}
      </div>
    );
  }

  return (
    <div className={className ?? "verse-text verse-text-hebrew"}>
      <p className="verse-text-hebrew-line" dir="rtl" lang="he">
        {verse.hebrewTokens.map((token, index) => {
          const buttonClassName = `verse-hebrew-inline-token${
            selectedTokenIndex === index ? " is-active" : ""
          }`;

          return token.strongs && onOpenStrongs ? (
            <button
              className={buttonClassName}
              key={`${verse.number}:${index}:${token.surface}`}
              onClick={() => {
                setSelectedTokenIndex(index);
                onOpenStrongs([token.strongs ?? ""], token.lemma);
              }}
              type="button"
            >
              {token.surface}
            </button>
          ) : (
            <button
              className={buttonClassName}
              key={`${verse.number}:${index}:${token.surface}`}
              onClick={() => setSelectedTokenIndex(index)}
              type="button"
            >
              {token.surface}
            </button>
          );
        })}
      </p>
      {selectedToken ? (
        <p className="hebrew-verse-reading-aids">
          {getTokenSummary(selectedToken)}
          {selectedToken.morphology ? (
            <span className="hebrew-verse-reading-aids-code"> ({selectedToken.morphology})</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
