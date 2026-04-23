"use client";

import { useEffect, useState } from "react";

import {
  buildGreekLearningQuiz,
  isTypedGreekQuizAnswerCorrect
} from "@/lib/bible/greek";
import type { GreekLearningQuiz, GreekLearningQuizSelection } from "@/lib/bible/types";

type GreekInlineQuizAnswerProps = {
  selection: GreekLearningQuizSelection;
};

export function GreekInlineQuizAnswer({ selection }: GreekInlineQuizAnswerProps) {
  const [quiz, setQuiz] = useState<GreekLearningQuiz | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded">("loading");
  const [answer, setAnswer] = useState("");
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    setStatus("loading");
    setQuiz(null);
    setAnswer("");
    setSubmittedAnswer(null);

    void buildGreekLearningQuiz(selection).then((nextQuiz) => {
      if (isCancelled) {
        return;
      }

      setQuiz(nextQuiz);
      setStatus("loaded");
    });

    return () => {
      isCancelled = true;
    };
  }, [selection]);

  if (status === "loading") {
    return <p className="greek-inline-quiz-status">Loading quiz…</p>;
  }

  if (!quiz) {
    return <p className="greek-inline-quiz-status">No quiz available.</p>;
  }

  const isAnswered = submittedAnswer !== null;
  const isCorrect =
    submittedAnswer !== null &&
    isTypedGreekQuizAnswerCorrect(submittedAnswer, quiz.correctAnswer);

  return (
    <form
      className={`greek-inline-quiz${isAnswered ? (isCorrect ? " is-correct" : " is-wrong") : ""}`}
      onSubmit={(event) => {
        event.preventDefault();

        if (!answer.trim()) {
          return;
        }

        setSubmittedAnswer(answer.trim());
      }}
    >
      <label className="greek-inline-quiz-label" htmlFor={`greek-inline-quiz:${selection.occurrenceKey ?? selection.entryKey}`}>
        Type meaning
      </label>
      <div className="greek-inline-quiz-row">
        <input
          className="greek-inline-quiz-input"
          disabled={isAnswered}
          id={`greek-inline-quiz:${selection.occurrenceKey ?? selection.entryKey}`}
          onChange={(event) => setAnswer(event.currentTarget.value)}
          placeholder="beginning"
          type="text"
          value={answer}
        />
        <button
          className="greek-inline-quiz-button"
          disabled={!answer.trim() || isAnswered}
          type="submit"
        >
          Check
        </button>
      </div>
      {isAnswered ? (
        <div className="greek-inline-quiz-feedback">
          <p>{isCorrect ? "Correct" : "Correct answer"}</p>
          <span>{quiz.correctAnswer}</span>
          {!isCorrect && quiz.entry.longDefinition ? (
            <small>{quiz.entry.longDefinition}</small>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
