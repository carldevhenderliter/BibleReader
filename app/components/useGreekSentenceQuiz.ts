"use client";

import { useEffect, useMemo, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  buildGreekLearningQuiz,
  isTypedGreekQuizAnswerCorrect
} from "@/lib/bible/greek";
import type { GreekLearningQuiz, GreekLearningQuizSelection } from "@/lib/bible/types";

type GreekSentenceQuizResult = {
  isCorrect: boolean;
  correctAnswer: string;
  longDefinition?: string | null;
};

function getSelectionKey(selection: GreekLearningQuizSelection, index: number) {
  return selection.occurrenceKey ?? `${selection.entryKey}:${index}`;
}

export function useGreekSentenceQuiz(
  selections: GreekLearningQuizSelection[],
  scopeKey: string
) {
  const { activeGreekLearningSession } = useReaderWorkspace();
  const [quizMap, setQuizMap] = useState<Record<string, GreekLearningQuiz>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, GreekSentenceQuizResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isActive = activeGreekLearningSession?.scopeKey === scopeKey && selections.length > 0;
  const focusOccurrenceKey = isActive ? activeGreekLearningSession?.currentOccurrenceKey ?? null : null;
  const selectionKeys = useMemo(
    () => selections.map((selection, index) => getSelectionKey(selection, index)),
    [selections]
  );

  useEffect(() => {
    if (!isActive) {
      setQuizMap({});
      setAnswers({});
      setResults(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    setQuizMap({});
    setAnswers({});
    setResults(null);
    setIsLoading(true);

    void Promise.all(
      selections.map(async (selection, index) => {
        const key = getSelectionKey(selection, index);
        const quiz = await buildGreekLearningQuiz(selection);
        return [key, quiz] as const;
      })
    ).then((entries) => {
      if (isCancelled) {
        return;
      }

      setQuizMap(
        Object.fromEntries(
          entries.filter(
            (entry): entry is readonly [string, GreekLearningQuiz] => entry[1] !== null
          )
        )
      );
      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeGreekLearningSession?.currentOccurrenceKey, isActive, selections, scopeKey]);

  const wrongCount = results
    ? Object.values(results).filter((result) => !result.isCorrect).length
    : 0;
  const hasUncheckedAnswers = selectionKeys.some((key) => !answers[key]?.trim());

  function setAnswer(key: string, value: string) {
    setAnswers((current) => ({
      ...current,
      [key]: value
    }));
  }

  function checkSentence() {
    const nextResults = Object.fromEntries(
      selections.map((selection, index) => {
        const key = getSelectionKey(selection, index);
        const quiz = quizMap[key];
        const answer = answers[key]?.trim() ?? "";
        const isCorrect =
          !!quiz &&
          isTypedGreekQuizAnswerCorrect(
            answer,
            selection.gloss,
            quiz.entry.shortDefinition,
            quiz.entry.longDefinition,
            quiz.correctAnswer
          );

        return [
          key,
          {
            isCorrect,
            correctAnswer: quiz?.correctAnswer ?? "",
            longDefinition: quiz?.entry.longDefinition ?? null
          }
        ] satisfies [string, GreekSentenceQuizResult];
      })
    );

    setResults(nextResults);
  }

  function resetSentence() {
    setResults(null);
  }

  return {
    answers,
    checkSentence,
    focusOccurrenceKey,
    hasUncheckedAnswers,
    isActive,
    isLoading,
    quizMap,
    resetSentence,
    results,
    setAnswer,
    wrongCount
  };
}
