"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import { getStrongsEntries, normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { StrongsEntry, Verse } from "@/lib/bible/types";

type VerseTextContentProps = {
  verse: Verse | null;
  showStrongs?: boolean;
  showOriginalLanguageSurface?: boolean;
  showOriginalLanguageLemma?: boolean;
  showOriginalLanguageTransliteration?: boolean;
  showOriginalLanguageGloss?: boolean;
  showOriginalLanguageSourceLine?: boolean;
  originalLanguageSourceLineLabel?: string;
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

function getStrongsUndertextGloss(entry: StrongsEntry) {
  return entry.outlineUsage?.trim() || entry.definition.trim();
}

function getTrailingPunctuation(text: string) {
  return text.match(/[.,;:!?·]+$/u)?.[0] ?? "";
}

function buildOriginalLanguageSourceLine(
  tokens: NonNullable<Verse["tokens"]>,
  tokenStrongsEntries: Record<string, StrongsEntry>
) {
  const parts: string[] = [];
  let language: "greek" | "hebrew" | null = null;

  for (const token of tokens) {
    const tokenEntries = Array.from(
      new Map(
        (token.strongsNumbers ?? [])
          .map((strongsNumber) => {
            const normalizedNumber = normalizeStrongsNumber(strongsNumber);
            return [normalizedNumber, tokenStrongsEntries[normalizedNumber] ?? null] as const;
          })
          .filter((entry): entry is readonly [string, StrongsEntry] => entry[1] !== null)
      ).values()
    );

    if (tokenEntries.length > 0) {
      const lemmaText = tokenEntries.map((entry) => entry.lemma.trim()).filter(Boolean).join(" ");
      const trailingPunctuation = getTrailingPunctuation(token.text);

      if (!language) {
        language = tokenEntries[0].language;
      }

      if (lemmaText) {
        parts.push(`${lemmaText}${trailingPunctuation}`);
      }

      continue;
    }

    const trailingPunctuation = getTrailingPunctuation(token.text);

    if (trailingPunctuation && parts.length > 0) {
      parts[parts.length - 1] = `${parts[parts.length - 1]}${trailingPunctuation}`;
    }
  }

  if (!language || parts.length === 0) {
    return null;
  }

  return {
    language,
    text: parts.join(" ")
  };
}

export function VerseTextContent({
  verse,
  showStrongs = false,
  showOriginalLanguageSurface = false,
  showOriginalLanguageLemma = true,
  showOriginalLanguageTransliteration = false,
  showOriginalLanguageGloss = false,
  showOriginalLanguageSourceLine = false,
  originalLanguageSourceLineLabel,
  onOpenStrongs,
  className,
  highlightedStrongsNumber = null,
  highlightedPhrases = []
}: VerseTextContentProps) {
  const [tokenStrongsEntries, setTokenStrongsEntries] = useState<Record<string, StrongsEntry>>({});
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
      setTokenStrongsEntries({});
      return;
    }

    let isCancelled = false;

    void getStrongsEntries(strongsNumbers).then((entries) => {
      if (isCancelled) {
        return;
      }

      setTokenStrongsEntries(
        entries.reduce<Record<string, StrongsEntry>>((entryMap, entry) => {
          entryMap[entry.id] = entry;
          return entryMap;
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
    const originalLanguageSourceLine =
      showOriginalLanguageSourceLine
        ? buildOriginalLanguageSourceLine(verse.tokens, tokenStrongsEntries)
        : null;
    const originalLanguageLineLabel =
      originalLanguageSourceLineLabel ??
      (originalLanguageSourceLine?.language === "hebrew"
        ? "KJV Strong's Hebrew"
        : "KJV Strong's Greek");

    const mainVerseLine = (
      <p className={className ?? "verse-text verse-text-rich"}>
        {verse.tokens.map((token, index) =>
          token.strongsNumbers?.length ? (
            (() => {
              const tokenEntries = Array.from(
                new Map(
                  (token.strongsNumbers ?? [])
                    .map((strongsNumber) => {
                      const normalizedNumber = normalizeStrongsNumber(strongsNumber);
                      return [normalizedNumber, tokenStrongsEntries[normalizedNumber] ?? null] as const;
                    })
                    .filter((entry): entry is readonly [string, StrongsEntry] => entry[1] !== null)
                ).values()
              );
              const tokenUndertext = Array.from(
                new Set(
                  tokenEntries.flatMap((entry) => {
                    const parts: string[] = [];

                    if (showOriginalLanguageSurface) {
                      parts.push(entry.lemma);
                    }

                    if (showOriginalLanguageLemma) {
                      parts.push(entry.lemma);
                    }

                    if (showOriginalLanguageTransliteration && entry.transliteration.trim()) {
                      parts.push(entry.transliteration.trim());
                    }

                    if (showOriginalLanguageGloss) {
                      const gloss = getStrongsUndertextGloss(entry);

                      if (gloss) {
                        parts.push(gloss);
                      }
                    }

                    return parts.map((part) => part.trim()).filter(Boolean);
                  })
                )
              );

              return (
                <button
                  aria-label={`${token.text.trim()} ${token.strongsNumbers.join(" ")}`}
                  className={`strongs-token${tokenUndertext.length ? " strongs-token-interlinear" : ""}${
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
                  {tokenUndertext.length ? (
                    <span className="strongs-token-lemma">{tokenUndertext.join(" · ")}</span>
                  ) : null}
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

    if (!originalLanguageSourceLine) {
      return mainVerseLine;
    }

    return (
      <div className="verse-text-source-stack">
        {mainVerseLine}
        <div className="verse-source-language-line">
          <p className="verse-source-language-label">{originalLanguageLineLabel}</p>
          <p
            className={`verse-text verse-text-greek verse-source-language-text${
              originalLanguageSourceLine.language === "hebrew"
                ? " verse-source-language-text-hebrew"
                : ""
            }`}
            dir={originalLanguageSourceLine.language === "hebrew" ? "rtl" : "ltr"}
            lang={originalLanguageSourceLine.language === "hebrew" ? "he" : "el"}
          >
            {originalLanguageSourceLine.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className={className ?? "verse-text"}>
      {renderTextWithHighlights(verse.text, highlightedPhrases)}
    </p>
  );
}
