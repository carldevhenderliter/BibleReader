"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekGrammarCard } from "@/app/components/GreekGrammarCard";
import { useGreekGlossOverrides } from "@/app/components/GreekGlossOverridesProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useGreekSentenceQuiz } from "@/app/components/useGreekSentenceQuiz";
import {
  createGreekLearningQuizSelections,
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
  getGreekTokenOccurrenceKey,
  transliterateGreekSurface
} from "@/lib/bible/greek";
import { buildGreekGrammarInfos } from "@/lib/bible/greek-grammar";
import type { EsvInterlinearDisplayVerse, GreekLemmaEntry, GreekToken } from "@/lib/bible/types";

type GreekInterlinearLineProps = {
  bookSlug: string;
  chapterNumber: number;
  verse: EsvInterlinearDisplayVerse;
  onOpenGreekDictionary: (token: GreekToken) => void;
  greekLearningScopeKey?: string;
  showSurface?: boolean;
  showLemma?: boolean;
  showTransliteration?: boolean;
  showGloss?: boolean;
  showGrammarCards?: boolean;
  showExpandedGrammarDetails?: boolean;
};

export function GreekInterlinearLine({
  bookSlug,
  chapterNumber,
  verse,
  onOpenGreekDictionary,
  greekLearningScopeKey,
  showSurface = true,
  showLemma = true,
  showTransliteration = true,
  showGloss = true,
  showGrammarCards = false,
  showExpandedGrammarDetails = false
}: GreekInterlinearLineProps) {
  const { isGreekLearningMode } = useReaderWorkspace();
  const { clearOverride, getOverride, saveOverride } = useGreekGlossOverrides();
  const [entriesByKey, setEntriesByKey] = useState<Record<string, GreekLemmaEntry>>({});
  const greekLearningSelections = useMemo(
    () =>
      createGreekLearningQuizSelections(
        verse.tokens,
        (token, tokenIndex) =>
          token.occurrenceKey ??
          getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verse.number, tokenIndex)
      ),
    [bookSlug, chapterNumber, verse.number, verse.tokens]
  );
  const activeGreekLearningScopeKey =
    greekLearningScopeKey ?? `verse:${bookSlug}:${chapterNumber}:${verse.number}`;
  const {
    answers,
    checkSentence,
    focusOccurrenceKey,
    hasUncheckedAnswers,
    isActive: isSentenceQuizActive,
    isLoading: isSentenceQuizLoading,
    resetSentence,
    results,
    setAnswer,
    wrongCount
  } = useGreekSentenceQuiz(greekLearningSelections, activeGreekLearningScopeKey);
  const grammarInfos = useMemo(() => buildGreekGrammarInfos(verse.tokens ?? []), [verse.tokens]);

  const tokenEntries = useMemo(
    () =>
      verse.tokens?.map((token, tokenIndex) => {
        const occurrenceKey =
          token.occurrenceKey ??
          getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verse.number, tokenIndex);
        const tokenWithOccurrenceKey = {
          ...token,
          occurrenceKey
        };
        const tokenEntryKey = token.entryKey ?? token.strongs ?? null;
        const entry = tokenEntryKey ? entriesByKey[tokenEntryKey] ?? null : null;
        const override = getOverride(occurrenceKey);

        return {
          token,
          tokenWithOccurrenceKey,
          tokenIndex,
          occurrenceKey,
          entry,
          override
        };
      }) ?? [],
    [bookSlug, chapterNumber, entriesByKey, getOverride, verse]
  );

  useEffect(() => {
    if (!verse.tokens?.length) {
      setEntriesByKey({});
      return;
    }

    let isCancelled = false;
    const uniqueEntryKeys = Array.from(
      new Set(verse.tokens.map((token) => token.entryKey ?? token.strongs).filter(Boolean))
    ).filter((entryKey): entryKey is string => typeof entryKey === "string" && entryKey.length > 0);

    void Promise.all(
      uniqueEntryKeys.map(async (entryKey) => {
        const entry = await getGreekLemmaEntry(entryKey);
        return entry ? ([entryKey, entry] as const) : null;
      })
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      setEntriesByKey(
        Object.fromEntries(
          results.filter(
            (result): result is readonly [string, GreekLemmaEntry] => result !== null
          )
        )
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [verse.tokens]);

  if (!verse.tokens?.length) {
    if (!showSurface) {
      return null;
    }

    return (
      <p className="verse-text verse-interlinear-text" lang="el">
        {verse.greek}
      </p>
    );
  }

  function handleGlossChange(occurrenceKey: string, token: GreekToken, nextGloss: string) {
    if (!nextGloss.trim()) {
      clearOverride(occurrenceKey);
      return;
    }

    saveOverride({
      occurrenceKey,
      entryKey: token.entryKey,
      strongs: token.strongs,
      lemma: token.lemma,
      selectedGloss: nextGloss,
      source: "custom"
    });
  }

  function getPartOfSpeechLabel(token: GreekToken) {
    return (
      getGreekMorphologyDetails({
        morphology: token.morphology,
        decodedMorphology: token.decodedMorphology
      })?.terms.find((term) => term.group === "part-of-speech")?.label ?? null
    );
  }

  return (
    <div className="verse-interlinear" lang="el">
      {tokenEntries.map(
        ({
          token,
          tokenWithOccurrenceKey,
          tokenIndex,
          occurrenceKey,
          override
        }) => {
          const partOfSpeechLabel = getPartOfSpeechLabel(token);
          const savedGloss = override?.selectedGloss?.trim() ?? "";
          const grammarInfo = grammarInfos[tokenIndex] ?? null;
          const dictionarySelection = {
            entryKey: token.entryKey ?? token.strongs ?? token.lemma,
            strongs: token.strongs ?? null,
            lemma: token.lemma,
            label: token.lemma,
            occurrenceKey,
            selectedForm: token.surface,
            selectedFormMorphology: token.morphology ?? null,
            selectedFormDecodedMorphology: token.decodedMorphology ?? null,
            matchedQuery: token.surface,
            transliteration: token.transliteration ?? transliterateGreekSurface(token.surface),
            gloss: token.gloss ?? null
          };

          return (
          <span
            className="verse-greek-token-wrap"
            key={`${verse.number}:${tokenIndex}:${token.surface}`}
          >
            <span className="verse-greek-token-stack">
              <button
                aria-label={`${token.surface} ${token.lemma} ${token.strongs ?? ""}`.trim()}
                className="verse-greek-token"
                onClick={() => onOpenGreekDictionary(tokenWithOccurrenceKey)}
                type="button"
              >
                {showSurface ? (
                  <span className="verse-greek-surface">{token.surface}</span>
                ) : null}
                {showLemma ? <span className="verse-greek-lemma">{token.lemma}</span> : null}
                {showTransliteration ? (
                  <span className="verse-greek-transliteration">
                    {transliterateGreekSurface(token.surface)}
                  </span>
                ) : null}
                {partOfSpeechLabel ? (
                  <span className="verse-greek-part-of-speech">{partOfSpeechLabel}</span>
                ) : null}
              </button>
              {showGloss ? (
                <label className="sr-only" htmlFor={`greek-gloss:${occurrenceKey}`}>
                  English gloss for {token.surface}
                </label>
              ) : null}
              {showGloss ? (
                <input
                  aria-label={`English gloss for ${token.surface}`}
                  className={`verse-greek-gloss-input${override ? " is-overridden" : ""}`}
                  id={`greek-gloss:${occurrenceKey}`}
                  onChange={(event) =>
                    handleGlossChange(occurrenceKey, token, event.currentTarget.value)
                  }
                  type="text"
                  value={override?.selectedGloss ?? ""}
                />
              ) : savedGloss ? (
                <span className="verse-greek-gloss-readonly">{savedGloss}</span>
              ) : null}
              {showGrammarCards && grammarInfo ? (
                <GreekGrammarCard
                  grammar={grammarInfo}
                  selection={dictionarySelection}
                />
              ) : null}
              {isGreekLearningMode && isSentenceQuizActive ? (
                <div
                  className={`greek-sentence-quiz-field${
                    results?.[occurrenceKey]?.isCorrect === true
                      ? " is-correct"
                      : results?.[occurrenceKey]?.isCorrect === false
                        ? " is-wrong"
                        : ""
                  }`}
                >
                  <label className="sr-only" htmlFor={`greek-sentence-quiz:${occurrenceKey}`}>
                    Type meaning for {token.surface}
                  </label>
                  <input
                    autoFocus={focusOccurrenceKey === occurrenceKey}
                    className="greek-sentence-quiz-input"
                    disabled={isSentenceQuizLoading}
                    id={`greek-sentence-quiz:${occurrenceKey}`}
                    onChange={(event) => {
                      if (results) {
                        resetSentence();
                      }

                      setAnswer(occurrenceKey, event.currentTarget.value);
                    }}
                    placeholder="Type meaning"
                    type="text"
                    value={answers[occurrenceKey] ?? ""}
                  />
                  {results?.[occurrenceKey]?.isCorrect === false ? (
                    <small className="greek-sentence-quiz-correction">
                      Wrong: {results[occurrenceKey]?.correctAnswer}
                    </small>
                  ) : null}
                </div>
              ) : null}
            </span>
            {token.trailingPunctuation ? (
              <span aria-hidden="true" className="verse-greek-punctuation">
                {token.trailingPunctuation}
              </span>
              ) : null}
            </span>
          );
        }
      )}
      {isGreekLearningMode && isSentenceQuizActive ? (
        <div className="greek-sentence-quiz-actions">
          <button
            className="greek-inline-quiz-button"
            disabled={isSentenceQuizLoading || hasUncheckedAnswers}
            onClick={checkSentence}
            type="button"
          >
            Check sentence
          </button>
          {results ? (
            <p
              className={`greek-sentence-quiz-summary${
                wrongCount === 0 ? " is-correct" : " is-wrong"
              }`}
            >
              {wrongCount === 0
                ? "Sentence complete"
                : `${wrongCount} word${wrongCount === 1 ? "" : "s"} wrong`}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
