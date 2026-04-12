"use client";

import type { EsvInterlinearDisplayVerse, GreekToken } from "@/lib/bible/types";

type GreekInterlinearLineProps = {
  verse: EsvInterlinearDisplayVerse;
  onOpenGreekDictionary: (token: GreekToken) => void;
};

export function GreekInterlinearLine({
  verse,
  onOpenGreekDictionary
}: GreekInterlinearLineProps) {
  if (!verse.tokens?.length) {
    return (
      <p className="verse-text verse-interlinear-text" lang="el">
        {verse.greek}
      </p>
    );
  }

  return (
    <div className="verse-interlinear" lang="el">
      {verse.tokens.map((token, index) => (
        <span className="verse-greek-token-wrap" key={`${verse.number}:${index}:${token.surface}`}>
          <button
            aria-label={`${token.surface} ${token.lemma} ${token.strongs}`}
            className="verse-greek-token"
            onClick={() => onOpenGreekDictionary(token)}
            type="button"
          >
            <span className="verse-greek-surface">{token.surface}</span>
            <span className="verse-greek-lemma">{token.lemma}</span>
          </button>
          {token.trailingPunctuation ? (
            <span aria-hidden="true" className="verse-greek-punctuation">
              {token.trailingPunctuation}
            </span>
          ) : null}
        </span>
      ))}
    </div>
  );
}
