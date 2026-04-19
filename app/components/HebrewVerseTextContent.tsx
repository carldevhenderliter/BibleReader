"use client";

import type { Verse } from "@/lib/bible/types";

type HebrewVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  onOpenStrongs?: (strongsNumbers: string[], label?: string | null) => void;
};

export function HebrewVerseTextContent({
  verse,
  className,
  onOpenStrongs
}: HebrewVerseTextContentProps) {
  const resolvedClassName = className
    ? className.includes("verse-text-hebrew")
      ? className
      : `${className} verse-text-hebrew`
    : "verse-text verse-text-hebrew";

  if (!verse) {
    return <div className={resolvedClassName} dir="rtl" lang="he" />;
  }

  if (!verse.hebrewTokens?.length || !onOpenStrongs) {
    return (
      <div className={resolvedClassName} dir="rtl" lang="he">
        {verse.text}
      </div>
    );
  }

  return (
    <div className={resolvedClassName} dir="rtl" lang="he">
      <div className="verse-interlinear verse-compare-token-line verse-compare-token-line-hebrew">
        {verse.hebrewTokens.map((token, index) => (
          <span className="verse-greek-token-wrap verse-compare-token-wrap" key={`${verse.number}:${index}:${token.surface}`}>
            <button
              aria-label={`${token.surface} ${token.lemma} ${token.strongs ?? ""}`.trim()}
              className="verse-greek-token verse-compare-token verse-compare-token-hebrew"
              onClick={() => {
                if (!token.strongs) {
                  return;
                }

                onOpenStrongs([token.strongs], token.lemma);
              }}
              type="button"
            >
              <span className="verse-greek-surface verse-compare-token-surface verse-compare-token-surface-hebrew">
                {token.surface}
              </span>
              {token.transliteration ? (
                <span className="verse-greek-transliteration verse-compare-token-transliteration">
                  {token.transliteration}
                </span>
              ) : null}
              <span className="verse-greek-lemma verse-compare-token-lemma">{token.lemma}</span>
              {token.gloss ? (
                <span className="verse-greek-gloss verse-compare-token-gloss">{token.gloss}</span>
              ) : null}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
