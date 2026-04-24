"use client";

import { useMemo } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useGreekSentenceQuiz } from "@/app/components/useGreekSentenceQuiz";
import {
  createGreekLearningQuizSelections,
  transliterateGreekSurface
} from "@/lib/bible/greek";
import type { GreekToken, Verse } from "@/lib/bible/types";

type GreekVerseTextContentProps = {
  verse: Verse | null;
  className?: string;
  displayMode?: "inline" | "stacked";
  showSurface?: boolean;
  showTransliteration?: boolean;
  showLemma?: boolean;
  showGloss?: boolean;
  enableGreekLearning?: boolean;
  getOccurrenceKey?: (token: GreekToken, index: number) => string;
  greekLearningScopeKey?: string;
  onOpenGreekDictionary?: NonNullable<{
    (
      selection: {
        entryKey: string;
        strongs?: string | null;
        lemma: string;
        label?: string | null;
        occurrenceKey?: string | null;
        selectedForm?: string | null;
        selectedFormMorphology?: string | null;
        selectedFormDecodedMorphology?: string | null;
        matchedQuery?: string | null;
        transliteration?: string | null;
        gloss?: string | null;
      }
    ): void;
  }>;
};

export function GreekVerseTextContent({
  verse,
  className,
  displayMode = "inline",
  showSurface = true,
  showTransliteration = true,
  showLemma = true,
  showGloss = true,
  enableGreekLearning = true,
  getOccurrenceKey,
  greekLearningScopeKey,
  onOpenGreekDictionary
}: GreekVerseTextContentProps) {
  const { isGreekLearningMode } = useReaderWorkspace();
  const greekLearningSelections = useMemo(
    () =>
      createGreekLearningQuizSelections(
        verse?.greekTokens,
        (token, index) =>
          getOccurrenceKey?.(token, index) ??
          token.occurrenceKey ??
          `greek:${verse?.number ?? 0}:${index}`
      ),
    [getOccurrenceKey, verse?.greekTokens, verse?.number]
  );
  const activeGreekLearningScopeKey =
    greekLearningScopeKey ?? `greek-verse:${verse?.number ?? 0}`;
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

  if (!verse) {
    return <p className={className ?? "verse-text verse-text-greek"} lang="el" />;
  }

  if (!verse.greekTokens?.length || !onOpenGreekDictionary) {
    return (
      <p className={className ?? "verse-text verse-text-greek"} lang="el">
        {verse.text}
      </p>
    );
  }

  if (displayMode === "stacked") {
    return (
      <div className={className ?? "verse-text verse-text-greek"} lang="el">
        <div className="verse-interlinear verse-compare-token-line">
          {verse.greekTokens.map((token, index) => {
            const entryKey = token.entryKey ?? token.strongs ?? null;
            const occurrenceKey =
              getOccurrenceKey?.(token, index) ??
              token.occurrenceKey ??
              `greek:${verse.number}:${index}`;

            return (
              <span
                className="verse-greek-token-wrap verse-compare-token-wrap"
                key={`${verse.number}:${index}:${token.surface}`}
              >
                <button
                  aria-label={`${token.surface} ${token.lemma} ${token.strongs ?? ""}`.trim()}
                  className="verse-greek-token verse-compare-token"
                  onClick={() => {
                    if (!entryKey) {
                      return;
                    }

                    onOpenGreekDictionary({
                      entryKey,
                      strongs: token.strongs ?? null,
                      lemma: token.lemma,
                      label: token.lemma,
                      occurrenceKey,
                      selectedForm: token.surface,
                      selectedFormMorphology: token.morphology ?? null,
                      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                      matchedQuery: token.surface,
                      transliteration:
                        token.transliteration ?? transliterateGreekSurface(token.surface),
                      gloss: token.gloss ?? null
                    });
                  }}
                  type="button"
                >
                  {showSurface ? (
                    <span className="verse-greek-surface verse-compare-token-surface">
                      {token.surface}
                    </span>
                  ) : null}
                  {showTransliteration ? (
                    <span className="verse-greek-transliteration verse-compare-token-transliteration">
                      {token.transliteration ?? transliterateGreekSurface(token.surface)}
                    </span>
                  ) : null}
                  {showLemma ? (
                    <span className="verse-greek-lemma verse-compare-token-lemma">{token.lemma}</span>
                  ) : null}
                  {showGloss && token.gloss ? (
                    <span className="verse-greek-gloss verse-compare-token-gloss">{token.gloss}</span>
                  ) : null}
                </button>
                {enableGreekLearning &&
                isGreekLearningMode &&
                isSentenceQuizActive ? (
                  <div
                    className={`greek-sentence-quiz-field${
                      results?.[occurrenceKey]?.isCorrect === true
                        ? " is-correct"
                        : results?.[occurrenceKey]?.isCorrect === false
                          ? " is-wrong"
                          : ""
                    }`}
                  >
                    <label
                      className="sr-only"
                      htmlFor={`greek-sentence-quiz:${occurrenceKey}`}
                    >
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
            );
          })}
        </div>
        {enableGreekLearning && isGreekLearningMode && isSentenceQuizActive ? (
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

  return (
    <div className={className ?? "verse-text verse-text-greek"} lang="el">
      {verse.greekTokens.map((token, index) => {
        const entryKey = token.entryKey ?? token.strongs ?? null;
        const occurrenceKey =
          getOccurrenceKey?.(token, index) ??
          token.occurrenceKey ??
          `greek:${verse.number}:${index}`;

        return (
          <span className="verse-greek-inline-wrap" key={`${verse.number}:${index}:${token.surface}`}>
            <span className="verse-greek-inline-head">
              {entryKey ? (
                <button
                  className="verse-greek-inline-token"
                  onClick={() =>
                    onOpenGreekDictionary({
                      entryKey,
                      strongs: token.strongs ?? null,
                      lemma: token.lemma,
                      label: token.lemma,
                      occurrenceKey,
                      selectedForm: token.surface,
                      selectedFormMorphology: token.morphology ?? null,
                      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                      matchedQuery: token.surface,
                      transliteration:
                        token.transliteration ?? transliterateGreekSurface(token.surface),
                      gloss: token.gloss ?? null
                    })
                  }
                  type="button"
                >
                  {token.surface}
                </button>
              ) : (
                <span className="verse-greek-inline-token-text">{token.surface}</span>
              )}
              {token.trailingPunctuation ? (
                <span aria-hidden="true" className="verse-greek-inline-punctuation">
                  {token.trailingPunctuation}
                </span>
              ) : null}
            </span>
            {enableGreekLearning &&
            isGreekLearningMode &&
            isSentenceQuizActive ? (
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
        );
      })}
      {enableGreekLearning && isGreekLearningMode && isSentenceQuizActive ? (
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
