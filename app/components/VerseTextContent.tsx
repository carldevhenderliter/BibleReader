"use client";

import type { Verse } from "@/lib/bible/types";

type VerseTextContentProps = {
  verse: Verse | null;
  showStrongs?: boolean;
  onOpenStrongs?: (strongsNumbers: string[]) => void;
  className?: string;
};

export function VerseTextContent({
  verse,
  showStrongs = false,
  onOpenStrongs,
  className
}: VerseTextContentProps) {
  if (!verse) {
    return <p className={className ?? "verse-text"} />;
  }

  if (showStrongs && verse.tokens?.length && onOpenStrongs) {
    return (
      <p className={className ?? "verse-text verse-text-rich"}>
        {verse.tokens.map((token, index) =>
          token.strongsNumbers?.length ? (
            <button
              className="strongs-token"
              key={`${verse.number}:${index}:${token.text}`}
              onClick={() => onOpenStrongs(token.strongsNumbers ?? [])}
              type="button"
            >
              <span>{token.text}</span>
              <span className="strongs-token-numbers">{token.strongsNumbers.join(" ")}</span>
            </button>
          ) : (
            <span className="strongs-text-segment" key={`${verse.number}:${index}:${token.text}`}>
              {token.text}
            </span>
          )
        )}
      </p>
    );
  }

  return <p className={className ?? "verse-text"}>{verse.text}</p>;
}
