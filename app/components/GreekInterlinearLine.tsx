"use client";

import { useEffect, useMemo, useState } from "react";

import { useGreekGlossOverrides } from "@/app/components/GreekGlossOverridesProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useGreekSentenceQuiz } from "@/app/components/useGreekSentenceQuiz";
import {
  createGreekLearningQuizSelections,
  getGreekGlossOptions,
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
  getGreekTokenOccurrenceKey,
  resolveGreekTokenGloss,
  transliterateGreekSurface
} from "@/lib/bible/greek";
import type {
  EsvInterlinearDisplayVerse,
  GreekGlossOption,
  GreekLemmaEntry,
  GreekToken
} from "@/lib/bible/types";

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
  showGloss = true
}: GreekInterlinearLineProps) {
  const { isGreekLearningMode } = useReaderWorkspace();
  const {
    clearLemmaDefault,
    clearOverride,
    getLemmaDefault,
    getOverride,
    saveLemmaDefault,
    saveOverride
  } = useGreekGlossOverrides();
  const [entriesByKey, setEntriesByKey] = useState<Record<string, GreekLemmaEntry>>({});
  const [openOccurrenceKey, setOpenOccurrenceKey] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
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
        const lemmaDefault = getLemmaDefault({
          entryKey: token.entryKey ?? entry?.entryKey ?? null,
          strongs: token.strongs ?? entry?.strongs ?? null,
          lemma: token.lemma
        });
        const glossOptions = entry ? getGreekGlossOptions(entry, token.gloss) : [];
        const generatedGloss = resolveGreekTokenGloss(token, entry, null, null);
        const defaultGloss = resolveGreekTokenGloss(token, entry, null, lemmaDefault);
        const effectiveGloss = resolveGreekTokenGloss(token, entry, override, lemmaDefault);

        return {
          token,
          tokenWithOccurrenceKey,
          tokenIndex,
          occurrenceKey,
          entry,
          override,
          lemmaDefault,
          glossOptions,
          generatedGloss,
          defaultGloss,
          effectiveGloss
        };
      }) ?? [],
    [bookSlug, chapterNumber, entriesByKey, getLemmaDefault, getOverride, verse]
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

  function handleSelectGloss(
    occurrenceKey: string,
    token: GreekToken,
    selectedGloss: string,
    option?: GreekGlossOption
  ) {
    const tokenEntry = tokenEntries.find((entry) => entry.occurrenceKey === occurrenceKey);
    const trimmedGloss = selectedGloss.trim();

    if (!trimmedGloss) {
      return;
    }

    if (tokenEntry && trimmedGloss === tokenEntry.defaultGloss.trim()) {
      clearOverride(occurrenceKey);
    } else {
      saveOverride({
        occurrenceKey,
        entryKey: token.entryKey,
        strongs: token.strongs,
        lemma: token.lemma,
        selectedGloss: trimmedGloss,
        optionId: option?.id,
        source: "lemma-option"
      });
    }

    setOpenOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
  }

  function handleSelectLemmaDefault(
    occurrenceKey: string,
    token: GreekToken,
    selectedGloss: string,
    option?: GreekGlossOption
  ) {
    const tokenEntry = tokenEntries.find((entry) => entry.occurrenceKey === occurrenceKey);
    const trimmedGloss = selectedGloss.trim();

    if (!trimmedGloss || !tokenEntry) {
      return;
    }

    if (trimmedGloss === tokenEntry.generatedGloss.trim()) {
      clearLemmaDefault({
        entryKey: token.entryKey ?? tokenEntry.entry?.entryKey ?? null,
        strongs: token.strongs ?? tokenEntry.entry?.strongs ?? null,
        lemma: token.lemma
      });
    } else {
      saveLemmaDefault({
        entryKey: token.entryKey ?? tokenEntry.entry?.entryKey,
        strongs: token.strongs ?? tokenEntry.entry?.strongs,
        lemma: token.lemma,
        selectedGloss: trimmedGloss,
        optionId: option?.id,
        source: option ? "lemma-option" : "custom"
      });
    }

    if (tokenEntry.override?.selectedGloss?.trim() === trimmedGloss) {
      clearOverride(occurrenceKey);
    }

    setOpenOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
  }

  function handleSaveCustomGloss(
    occurrenceKey: string,
    token: GreekToken,
    saveAsLemmaDefault = false
  ) {
    const trimmedDraft = customDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    if (saveAsLemmaDefault) {
      handleSelectLemmaDefault(occurrenceKey, token, trimmedDraft);
      return;
    }

    saveOverride({
      occurrenceKey,
      entryKey: token.entryKey,
      strongs: token.strongs,
      lemma: token.lemma,
      selectedGloss: trimmedDraft,
      source: "custom"
    });
    setOpenOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
  }

  function handleOpenGlossPicker(
    occurrenceKey: string,
    effectiveGloss: string,
    activeSource?: "lemma-option" | "custom"
  ) {
    setOpenOccurrenceKey((current) => (current === occurrenceKey ? null : occurrenceKey));
    setIsCustomMode(activeSource === "custom");
    setCustomDraft(activeSource === "custom" ? effectiveGloss : "");
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
          entry,
          override,
          lemmaDefault,
          glossOptions,
          generatedGloss,
          defaultGloss,
          effectiveGloss
        }) => {
          const partOfSpeechLabel = getPartOfSpeechLabel(token);

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
                <>
                  <button
                    aria-expanded={openOccurrenceKey === occurrenceKey}
                    aria-label={`Choose English gloss for ${token.surface}`}
                    className={`verse-greek-gloss${
                      override ? " is-overridden" : lemmaDefault ? " is-lemma-default" : ""
                    }`}
                    onClick={() =>
                      handleOpenGlossPicker(
                        occurrenceKey,
                        effectiveGloss,
                        override?.source ?? lemmaDefault?.source
                      )
                    }
                    type="button"
                  >
                    {effectiveGloss || "Choose gloss"}
                  </button>
                  {openOccurrenceKey === occurrenceKey ? (
                    <div
                      aria-label={`English gloss choices for ${token.surface}`}
                      className="verse-greek-gloss-picker"
                      role="dialog"
                    >
                      <div className="verse-greek-gloss-picker-header">
                        <div>
                          <p className="verse-greek-gloss-picker-title">{token.surface}</p>
                          <p className="verse-greek-gloss-picker-meta">
                            {token.lemma}
                            {lemmaDefault?.selectedGloss?.trim()
                              ? ` · lemma default: ${lemmaDefault.selectedGloss}`
                              : " · using generated default"}
                          </p>
                        </div>
                        <button
                          aria-label="Close gloss picker"
                          className="reader-inline-button"
                          onClick={() => {
                            setOpenOccurrenceKey(null);
                            setIsCustomMode(false);
                            setCustomDraft("");
                          }}
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                      <div className="verse-greek-gloss-options">
                        {glossOptions.map((option) => (
                          <div className="verse-greek-gloss-option-row" key={`${occurrenceKey}:${option.id}`}>
                            <button
                              aria-pressed={effectiveGloss === option.label}
                              className={`verse-greek-gloss-option${
                                effectiveGloss === option.label ? " is-active" : ""
                              }`}
                              onClick={() =>
                                handleSelectGloss(occurrenceKey, token, option.label, option)
                              }
                              type="button"
                            >
                              {option.label}
                            </button>
                            <button
                              className={`verse-greek-gloss-option verse-greek-gloss-default-action${
                                lemmaDefault?.selectedGloss === option.label ? " is-active" : ""
                              }`}
                              onClick={() =>
                                handleSelectLemmaDefault(
                                  occurrenceKey,
                                  token,
                                  option.label,
                                  option
                                )
                              }
                              type="button"
                            >
                              {lemmaDefault?.selectedGloss === option.label ? "Default" : "Make default"}
                            </button>
                          </div>
                        ))}
                        <button
                          aria-pressed={isCustomMode}
                          className={`verse-greek-gloss-option${isCustomMode ? " is-active" : ""}`}
                          onClick={() => {
                            setIsCustomMode(true);
                            setCustomDraft(
                              override?.source === "custom" || lemmaDefault?.source === "custom"
                                ? effectiveGloss
                                : ""
                            );
                          }}
                          type="button"
                        >
                          Custom…
                        </button>
                        {lemmaDefault ? (
                          <button
                            className="verse-greek-gloss-option"
                            onClick={() => {
                              clearLemmaDefault({
                                entryKey: token.entryKey ?? entry?.entryKey ?? null,
                                strongs: token.strongs ?? entry?.strongs ?? null,
                                lemma: token.lemma
                              });
                              setOpenOccurrenceKey(null);
                              setIsCustomMode(false);
                              setCustomDraft("");
                            }}
                            type="button"
                          >
                            Clear lemma default
                          </button>
                        ) : null}
                        {override ? (
                          <button
                            className="verse-greek-gloss-option"
                            onClick={() => {
                              clearOverride(occurrenceKey);
                              setOpenOccurrenceKey(null);
                              setIsCustomMode(false);
                              setCustomDraft(
                                lemmaDefault?.source === "custom" ? lemmaDefault.selectedGloss : ""
                              );
                            }}
                            type="button"
                          >
                            Reset to default
                          </button>
                        ) : null}
                      </div>
                      {isCustomMode ? (
                        <div className="verse-greek-gloss-custom">
                          <label
                            className="reader-settings-field"
                            htmlFor={`custom-gloss:${occurrenceKey}`}
                          >
                            <span>Custom gloss</span>
                            <input
                              id={`custom-gloss:${occurrenceKey}`}
                              onChange={(event) => setCustomDraft(event.target.value)}
                              placeholder={defaultGloss || generatedGloss || "Enter English gloss"}
                              type="text"
                              value={customDraft}
                            />
                          </label>
                          <div className="verse-greek-gloss-custom-actions">
                            <button
                              className="reader-inline-button"
                              onClick={() => handleSaveCustomGloss(occurrenceKey, token)}
                              type="button"
                            >
                              Save gloss
                            </button>
                            <button
                              className="reader-inline-button"
                              onClick={() => handleSaveCustomGloss(occurrenceKey, token, true)}
                              type="button"
                            >
                              Save as lemma default
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
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
