"use client";

import { useEffect, useRef, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  buildGreekLearningQuiz,
  isTypedGreekQuizAnswerCorrect
} from "@/lib/bible/greek";
import type { GreekLearningQuiz, GreekLearningQuizSelection } from "@/lib/bible/types";

type GreekInlineQuizAnswerProps = {
  selection: GreekLearningQuizSelection;
};

export function GreekInlineQuizAnswer({ selection }: GreekInlineQuizAnswerProps) {
  const { activeGreekLearningSession, advanceGreekLearningSession } = useReaderWorkspace();
  const [quiz, setQuiz] = useState<GreekLearningQuiz | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "correct" | "wrong">("loading");
  const [answer, setAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasNextSelection =
    activeGreekLearningSession !== null &&
    activeGreekLearningSession.currentIndex < activeGreekLearningSession.queue.length - 1;

  useEffect(() => {
    let isCancelled = false;

    setStatus("loading");
    setQuiz(null);
    setAnswer("");

    void buildGreekLearningQuiz(selection).then((nextQuiz) => {
      if (isCancelled) {
        return;
      }

      setQuiz(nextQuiz);
      setStatus("idle");
    });

    return () => {
      isCancelled = true;
    };
  }, [selection]);

  useEffect(() => {
    if (status !== "idle") {
      return;
    }

    inputRef.current?.focus();
    inputRef.current?.select();
  }, [selection, status]);

  useEffect(() => {
    if (status !== "correct" || !hasNextSelection) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      advanceGreekLearningSession();
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [advanceGreekLearningSession, hasNextSelection, status]);

  if (status === "loading") {
    return <p className="greek-inline-quiz-status">Loading quiz…</p>;
  }

  if (!quiz) {
    return <p className="greek-inline-quiz-status">No quiz available.</p>;
  }

  return (
    <form
      className={`greek-inline-quiz${
        status === "correct" ? " is-correct" : status === "wrong" ? " is-wrong" : ""
      }`}
      onSubmit={(event) => {
        event.preventDefault();

        const trimmedAnswer = answer.trim();

        if (!trimmedAnswer) {
          return;
        }

        setStatus(
          isTypedGreekQuizAnswerCorrect(
            trimmedAnswer,
            selection.gloss,
            quiz.entry.shortDefinition,
            quiz.entry.longDefinition,
            quiz.correctAnswer
          )
            ? "correct"
            : "wrong"
        );
      }}
    >
      <label
        className="greek-inline-quiz-label"
        htmlFor={`greek-inline-quiz:${selection.occurrenceKey ?? selection.entryKey}`}
      >
        Type meaning
      </label>
      <div className="greek-inline-quiz-row">
        <input
          ref={inputRef}
          className="greek-inline-quiz-input"
          disabled={status !== "idle"}
          id={`greek-inline-quiz:${selection.occurrenceKey ?? selection.entryKey}`}
          onChange={(event) => setAnswer(event.currentTarget.value)}
          placeholder="beginning"
          type="text"
          value={answer}
        />
        <button
          className="greek-inline-quiz-button"
          disabled={!answer.trim() || status !== "idle"}
          type="submit"
        >
          Check
        </button>
      </div>
      {status === "correct" ? (
        <div className="greek-inline-quiz-feedback">
          <p>Correct</p>
          {!hasNextSelection ? <small>Finished</small> : null}
        </div>
      ) : null}
      {status === "wrong" ? (
        <div className="greek-inline-quiz-feedback">
          <p>Correct answer</p>
          <span>{quiz.correctAnswer}</span>
          {quiz.entry.longDefinition ? <small>{quiz.entry.longDefinition}</small> : null}
          {hasNextSelection ? (
            <button
              className="greek-inline-quiz-button"
              onClick={() => advanceGreekLearningSession()}
              type="button"
            >
              Continue
            </button>
          ) : (
            <small>Finished</small>
          )}
        </div>
      ) : null}
    </form>
  );
}
