"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getStrongsEntries, normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { Verse } from "@/lib/bible/types";

type VerseTextContentProps = {
  verse: Verse | null;
  showStrongs?: boolean;
  onOpenStrongs?: (strongsNumbers: string[]) => void;
  className?: string;
  highlightedStrongsNumber?: string | null;
  highlightedPhrases?: string[];
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderTextWithHighlights(text: string, phrases: readonly string[]) {
  const normalizedPhrases = Array.from(
    new Set(
      phrases
        .map((phrase) => phrase.trim())
        .filter(Boolean)
        .sort((left, right) => right.length - left.length)
    )
  );

  if (normalizedPhrases.length === 0) {
    return text;
  }

  const pattern = new RegExp(
    normalizedPhrases.map((phrase) => escapeRegExp(phrase)).join("|"),
    "gi"
  );
  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      parts.push(text.slice(cursor, index));
    }

    parts.push(
      <mark className="strongs-inline-match" key={`${index}:${match[0]}`}>
        {text.slice(index, index + match[0].length)}
      </mark>
    );
    cursor = index + match[0].length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.length > 0 ? parts : text;
}

export function VerseTextContent({
  verse,
  showStrongs = false,
  onOpenStrongs,
  className,
  highlightedStrongsNumber = null,
  highlightedPhrases = []
}: VerseTextContentProps) {
  const [tokenLemmas, setTokenLemmas] = useState<Record<string, string>>({});
  const strongsNumbers = useMemo(
    () => {
      const numbers = (verse?.tokens ?? []).reduce<string[]>((items, token) => {
        for (const strongsNumber of token.strongsNumbers ?? []) {
          if (strongsNumber) {
            items.push(strongsNumber);
          }
        }

        return items;
      }, []);

      return numbers.filter((value, index, allValues) => allValues.indexOf(value) === index);
    },
    [verse]
  );

  useEffect(() => {
    if (!showStrongs || strongsNumbers.length === 0) {
      setTokenLemmas({});
      return;
    }

    let isCancelled = false;

    void getStrongsEntries(strongsNumbers).then((entries) => {
      if (isCancelled) {
        return;
      }

      setTokenLemmas(
        entries.reduce<Record<string, string>>((lemmaMap, entry) => {
          lemmaMap[entry.id] = entry.lemma;
          return lemmaMap;
        }, {})
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [showStrongs, strongsNumbers]);

  if (!verse) {
    return <p className={className ?? "verse-text"} />;
  }

  if (showStrongs && verse.tokens?.length && onOpenStrongs) {
    return (
      <p className={className ?? "verse-text verse-text-rich"}>
        {verse.tokens.map((token, index) =>
          token.strongsNumbers?.length ? (
            (() => {
              const lemma = (token.strongsNumbers ?? [])
                .map((strongsNumber) => tokenLemmas[strongsNumber] ?? "")
                .find(Boolean);

              return (
                <button
                  aria-label={`${token.text.trim()} ${token.strongsNumbers.join(" ")}`}
                  className={`strongs-token${lemma ? " strongs-token-interlinear" : ""}${
                    highlightedStrongsNumber &&
                    token.strongsNumbers.some(
                      (strongsNumber) =>
                        normalizeStrongsNumber(strongsNumber) ===
                        normalizeStrongsNumber(highlightedStrongsNumber)
                    )
                      ? " strongs-token-match"
                      : ""
                  }`}
                  key={`${verse.number}:${index}:${token.text}`}
                  onClick={() => onOpenStrongs(token.strongsNumbers ?? [])}
                  type="button"
                >
                  <span className="strongs-token-surface">
                    <span>{token.text}</span>
                    <span className="strongs-token-numbers">{token.strongsNumbers.join(" ")}</span>
                  </span>
                  {lemma ? <span className="strongs-token-lemma">{lemma}</span> : null}
                </button>
              );
            })()
          ) : (
            <span className="strongs-text-segment" key={`${verse.number}:${index}:${token.text}`}>
              {token.text}
            </span>
          )
        )}
      </p>
    );
  }

  return (
    <p className={className ?? "verse-text"}>
      {renderTextWithHighlights(verse.text, highlightedPhrases)}
    </p>
  );
}
