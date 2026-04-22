"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  buildGreekLearningQuiz,
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
  getGreekVerseOccurrences,
  normalizeGreekFormLookupValue
} from "@/lib/bible/greek";
import {
  getStrongsEntries,
  getStrongsEntry,
  getStrongsVerseOccurrencesWithTokens
} from "@/lib/bible/strongs";
import type {
  BibleSearchVerseEntry,
  GreekLearningQuiz,
  GreekInflectedForm,
  GreekLemmaEntry,
  StrongsEntry
} from "@/lib/bible/types";
import { getBookHighlightedVerseHref } from "@/lib/bible/utils";
import { findFathersSegmentsByGreekLemma, normalizeFathersGreekText } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

type OutsideScriptureLookupState = {
  status: "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

type BibleOccurrencesState = {
  status: "loading" | "loaded";
  matches: Array<BibleSearchVerseEntry & { href?: string }>;
};

type StrongsTab = "bible" | "bdag" | "outside-bible";

function getAvailableTabs(entry: StrongsEntry): StrongsTab[] {
  const tabs: StrongsTab[] = ["bible"];

  if (entry.bdagArticles?.length) {
    tabs.push("bdag");
  }

  if (entry.language === "greek") {
    tabs.push("outside-bible");
  }

  return tabs;
}

function getGreekAvailableTabs(entry: StrongsEntry | null): StrongsTab[] {
  const tabs: StrongsTab[] = ["bible"];

  if (entry?.bdagArticles?.length) {
    tabs.push("bdag");
  }

  tabs.push("outside-bible");
  return tabs;
}

function getTabLabel(tab: StrongsTab) {
  if (tab === "bible") {
    return "Verses In Bible";
  }

  if (tab === "bdag") {
    return "BDAG";
  }

  return "Outside Bible";
}

function renderHighlightedGreekContext(context: string, lemma: string) {
  const normalizedLemma = normalizeFathersGreekText(lemma);
  const segments = context.match(/[\p{Script=Greek}]+|[^\p{Script=Greek}]+/gu) ?? [context];

  return segments.map((segment, index) => {
    if (!/[\p{Script=Greek}]/u.test(segment)) {
      return <span key={`${segment}:${index}`}>{segment}</span>;
    }

    return normalizeFathersGreekText(segment) === normalizedLemma ? (
      <mark className="strongs-inline-match" key={`${segment}:${index}`}>
        {segment}
      </mark>
    ) : (
      <span key={`${segment}:${index}`}>{segment}</span>
    );
  });
}

function renderBdagArticles(entry: StrongsEntry) {
  if (!entry.bdagArticles?.length) {
    return <p className="strongs-entry-copy">No BDAG article is available for this lemma.</p>;
  }

  return (
    <>
      {entry.bdagArticles.map((article) => {
        const summary = article.summary ?? { plainMeaning: article.entry };

        return (
          <section
            className="strongs-entry-bdag-article"
            key={`${entry.id}:${article.headword}:${article.transliteration}`}
          >
            <p className="strongs-entry-meta">
              {article.headword} ({article.transliteration})
            </p>
            <div className="strongs-entry-bdag-summary">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                BDAG Summary
              </p>
              <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.plainMeaning}</p>
              {summary.commonUse ? (
                <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.commonUse}</p>
              ) : null}
              {summary.ntNote ? (
                <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.ntNote}</p>
              ) : null}
            </div>
            <div className="strongs-entry-bdag-original">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                Original BDAG
              </p>
              <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
                {article.entry}
              </p>
            </div>
          </section>
        );
      })}
    </>
  );
}

export function ReaderStrongsPanel() {
  const {
    activeGreekLearningQuizSelection,
    activeGreekSelection,
    activeStrongsLabel,
    activeStrongsNumbers,
    openGreekDictionary,
    openStrongs
  } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [greekEntry, setGreekEntry] = useState<GreekLemmaEntry | null>(null);
  const [greekStrongsEntry, setGreekStrongsEntry] = useState<StrongsEntry | null>(null);
  const [greekLearningQuiz, setGreekLearningQuiz] = useState<GreekLearningQuiz | null>(null);
  const [greekLearningQuizStatus, setGreekLearningQuizStatus] = useState<"idle" | "loading" | "loaded">("idle");
  const [greekLearningAttempt, setGreekLearningAttempt] = useState(0);
  const [selectedQuizOptionId, setSelectedQuizOptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, StrongsTab>>({});
  const [bibleOccurrences, setBibleOccurrences] = useState<Record<string, BibleOccurrencesState>>({});
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});
  const isGreekLearningQuizMode = activeGreekLearningQuizSelection !== null;
  const isGreekDictionaryMode = activeGreekSelection !== null;
  const activeGreekModeSelection = activeGreekSelection ?? activeGreekLearningQuizSelection;
  const activeGreekEntryKey =
    activeGreekModeSelection?.entryKey ?? activeGreekModeSelection?.strongs ?? null;
  const activePanelTitle =
    activeGreekModeSelection?.lemma ??
    activeStrongsLabel?.trim() ??
    activeStrongsNumbers[0] ??
    "Strongs details";
  const selectedGreekForm = useMemo(() => {
    if (!greekEntry || !activeGreekModeSelection?.selectedForm) {
      return null;
    }

    const normalizedSelectedForm = normalizeGreekFormLookupValue(activeGreekModeSelection.selectedForm);

    return (
      greekEntry.forms.find(
        (form) => normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm
      ) ?? null
    );
  }, [activeGreekModeSelection?.selectedForm, greekEntry]);
  const selectedGreekFormDetails: GreekInflectedForm | null = useMemo(() => {
    if (selectedGreekForm) {
      return selectedGreekForm;
    }

    if (!activeGreekModeSelection?.selectedForm) {
      return null;
    }

    return {
      form: activeGreekModeSelection.selectedForm,
      morphology: activeGreekModeSelection.selectedFormMorphology ?? "",
      decodedMorphology: activeGreekModeSelection.selectedFormDecodedMorphology ?? undefined,
      definition: undefined
    };
  }, [
    activeGreekModeSelection?.selectedFormDecodedMorphology,
    activeGreekModeSelection?.selectedForm,
    activeGreekModeSelection?.selectedFormMorphology,
    selectedGreekForm
  ]);
  const selectedGreekMorphologyDetails = useMemo(() => {
    if (!selectedGreekFormDetails?.morphology && !selectedGreekFormDetails?.decodedMorphology) {
      return null;
    }

    return getGreekMorphologyDetails({
      morphology: selectedGreekFormDetails?.morphology,
      decodedMorphology: selectedGreekFormDetails?.decodedMorphology
    });
  }, [selectedGreekFormDetails?.decodedMorphology, selectedGreekFormDetails?.morphology]);

  useEffect(() => {
    if (!isGreekDictionaryMode && !isGreekLearningQuizMode) {
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      return;
    }

    if (!activeGreekEntryKey) {
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setEntries([]);
    setActiveTabs({});
    setBibleOccurrences({});
    setOutsideScripture({});

    void Promise.all([
      getGreekLemmaEntry(activeGreekEntryKey),
      activeGreekModeSelection?.strongs
        ? getStrongsEntry(activeGreekModeSelection.strongs)
        : Promise.resolve(null)
    ]).then(([nextGreekEntry, nextGreekStrongsEntry]) => {
        if (isCancelled) {
          return;
        }

        setGreekEntry(nextGreekEntry);
        setGreekStrongsEntry(nextGreekStrongsEntry);
        setIsLoading(false);
        if (nextGreekEntry) {
          setActiveTabs({
            [nextGreekEntry.entryKey]: "bible"
          });
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [
    activeGreekEntryKey,
    activeGreekModeSelection?.strongs,
    isGreekDictionaryMode,
    isGreekLearningQuizMode
  ]);

  useEffect(() => {
    setGreekLearningAttempt(0);
    setSelectedQuizOptionId(null);
  }, [activeGreekLearningQuizSelection?.entryKey, activeGreekLearningQuizSelection?.selectedForm]);

  useEffect(() => {
    if (!isGreekLearningQuizMode || !activeGreekLearningQuizSelection) {
      setGreekLearningQuiz(null);
      setGreekLearningQuizStatus("idle");
      return;
    }

    let isCancelled = false;
    setGreekLearningQuizStatus("loading");

    void buildGreekLearningQuiz(activeGreekLearningQuizSelection, greekLearningAttempt).then(
      (quiz) => {
        if (isCancelled) {
          return;
        }

        setGreekLearningQuiz(quiz);
        setGreekLearningQuizStatus("loaded");
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [activeGreekLearningQuizSelection, greekLearningAttempt, isGreekLearningQuizMode]);

  useEffect(() => {
    if (isGreekDictionaryMode) {
      return;
    }

    if (activeStrongsNumbers.length === 0) {
      setEntries([]);
      setIsLoading(false);
      setActiveTabs({});
      setBibleOccurrences({});
      setOutsideScripture({});
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setActiveTabs({});
    setBibleOccurrences({});
    setOutsideScripture({});

    void getStrongsEntries(activeStrongsNumbers).then((nextEntries) => {
      if (!isCancelled) {
        setEntries(nextEntries);
        setIsLoading(false);
        setActiveTabs(
          nextEntries.reduce<Record<string, StrongsTab>>((tabs, entry) => {
            tabs[entry.id] = "bible";
            return tabs;
          }, {})
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeStrongsNumbers, isGreekDictionaryMode]);

  useEffect(() => {
    const activeIds = [...entries.map((entry) => entry.id), ...(greekEntry ? [greekEntry.entryKey] : [])];

    activeIds.forEach((entryId) => {
      if (bibleOccurrences[entryId]) {
        return;
      }

      setBibleOccurrences((current) => ({
        ...current,
        [entryId]: {
          status: "loading",
          matches: []
        }
      }));

      const lookupPromise =
        greekEntry?.entryKey === entryId
          ? getGreekVerseOccurrences(entryId)
          : getStrongsVerseOccurrencesWithTokens(entryId);

      void lookupPromise.then((matches) => {
        setBibleOccurrences((current) => ({
          ...current,
          [entryId]: {
            status: "loaded",
            matches
          }
        }));
      });
    });
  }, [bibleOccurrences, entries, greekEntry]);

  async function handleFindOutsideScripture(lemma: string, strongsKey: string) {
    setOutsideScripture((current) => ({
      ...current,
      [strongsKey]: {
        status: "loading",
        matches: current[strongsKey]?.matches ?? []
      }
    }));

    const matches = await findFathersSegmentsByGreekLemma(lemma);

    setOutsideScripture((current) => ({
      ...current,
      [strongsKey]: {
        status: "loaded",
        matches
      }
    }));
  }

  function handleSelectTab(strongsKey: string, tab: StrongsTab, greekLemma?: string) {
    setActiveTabs((current) => ({
      ...current,
      [strongsKey]: tab
    }));

    if (tab === "outside-bible" && greekLemma && !outsideScripture[strongsKey]) {
      void handleFindOutsideScripture(greekLemma, strongsKey);
    }
  }

  function renderBibleOccurrences(entryId: string, mode: "strongs" | "greek") {
    const occurrences = bibleOccurrences[entryId];

    if (occurrences?.status === "loading") {
      return (
        <p className="strongs-entry-meta">
          {mode === "greek" ? "Loading Greek verse occurrences…" : "Loading KJV verse occurrences…"}
        </p>
      );
    }

    if (!occurrences?.matches.length) {
      return (
        <p className="strongs-entry-copy">
          {mode === "greek"
            ? "No Greek Bible occurrences were found for this entry."
            : "No KJV verse occurrences were found for this Strong’s number."}
        </p>
      );
    }

    return (
      <div className="strongs-entry-bible-verses">
        {occurrences.matches.map((match) => (
          <article
            className="strongs-entry-bible-verse"
            key={`${entryId}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
          >
            <a
              className="strongs-entry-bible-verse-link"
              href={
                "href" in match && typeof match.href === "string"
                  ? match.href
                  : getBookHighlightedVerseHref(
                      match.bookSlug,
                      match.chapterNumber,
                      match.verseNumber,
                      mode === "greek" ? "greek" : "kjv"
                    )
              }
            >
              {match.bookName} {match.chapterNumber}:{match.verseNumber}
            </a>
            {mode === "greek" ? (
              <GreekVerseTextContent
                className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-greek"
                onOpenGreekDictionary={openGreekDictionary}
                verse={{
                  number: match.verseNumber,
                  text: match.text,
                  greekTokens: match.greekTokens
                }}
              />
            ) : (
              <VerseTextContent
                className="strongs-entry-copy strongs-entry-bible-verse-text"
                highlightedStrongsNumber={entryId}
                onOpenStrongs={(strongsNumbers) =>
                  openStrongs(strongsNumbers, strongsNumbers.join(" "))
                }
                showStrongs
                verse={{
                  number: match.verseNumber,
                  text: match.text,
                  tokens: match.tokens
                }}
              />
            )}
          </article>
        ))}
      </div>
    );
  }

  function renderOutsideBibleSection(strongsNumber: string, lemma: string) {
    const state = outsideScripture[strongsNumber];

    if (state?.status === "loading") {
      return (
        <p className="strongs-entry-meta">
          Searching the Apostolic Fathers for this Greek lemma…
        </p>
      );
    }

    if (state?.status === "loaded" && state.matches.length) {
      return Object.entries(
        state.matches.reduce<Record<string, FathersLemmaMatch[]>>((groups, match) => {
          groups[match.workTitle] = groups[match.workTitle]
            ? [...groups[match.workTitle], match]
            : [match];

          return groups;
        }, {})
      ).map(([workTitle, matches]) => (
        <section className="strongs-entry-fathers-group" key={`${strongsNumber}:${workTitle}`}>
          <h4 className="strongs-entry-fathers-title">{workTitle}</h4>
          <div className="strongs-entry-fathers-list">
            {matches.map((match) => (
              <article className="strongs-entry-fathers-hit" key={match.segmentId}>
                <p className="strongs-entry-meta">
                  {match.label}
                  {match.ref !== match.label ? ` (${match.ref})` : ""}
                </p>
                <div className="strongs-entry-fathers-interlinear">
                  <div className="strongs-entry-fathers-line-pair">
                    <p className="strongs-entry-copy strongs-entry-fathers-greek">
                      {renderHighlightedGreekContext(match.greekContext, lemma)}
                    </p>
                    <p className="strongs-entry-copy strongs-entry-fathers-english">
                      {match.englishContext}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ));
    }

    if (state?.status === "loaded") {
      return (
        <p className="strongs-entry-copy">
          No Apostolic Fathers matches found for this lemma.
        </p>
      );
    }

    return <p className="strongs-entry-meta">Select this tab to search the Apostolic Fathers.</p>;
  }

  function renderGreekDictionaryCard(entry: GreekLemmaEntry) {
    const strongsKey = entry.entryKey;
    const activeTab = activeTabs[strongsKey] ?? "bible";
    const selectedFormValue = activeGreekModeSelection?.selectedForm ?? null;
    const normalizedSelectedForm = selectedFormValue
      ? normalizeGreekFormLookupValue(selectedFormValue)
      : null;

    return (
      <article className="strongs-entry-card greek-dictionary-card" key={entry.entryKey}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{entry.strongs ?? entry.entryKey}</span>
          <span className="strongs-entry-language">Greek dictionary</span>
        </div>
        <p className="strongs-entry-lemma greek-dictionary-lemma">{entry.lemma}</p>
        <div className="greek-dictionary-meta-list">
          <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
          {entry.pronunciation ? (
            <p className="strongs-entry-meta">Pronunciation: {entry.pronunciation}</p>
          ) : null}
        </div>
        {selectedGreekFormDetails ? (
          <section className="greek-dictionary-selected-form">
            <p className="strongs-entry-section-label">Selected Form</p>
            <div className="greek-dictionary-selected-form-card">
              <p className="strongs-entry-lemma greek-dictionary-selected-form-value">
                {selectedGreekFormDetails.form}
              </p>
              <p className="strongs-entry-meta">
                {["Lemma: " + entry.lemma, entry.strongs ? `Strong’s: ${entry.strongs}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {selectedGreekFormDetails.morphology ? (
                <p className="strongs-entry-meta">
                  Morphology:{" "}
                  {selectedGreekFormDetails.decodedMorphology
                    ? `${selectedGreekFormDetails.decodedMorphology} (${selectedGreekFormDetails.morphology})`
                    : selectedGreekFormDetails.morphology}
                </p>
              ) : null}
              {selectedGreekMorphologyDetails ? (
                <div className="verse-greek-morphology-list">
                  {selectedGreekMorphologyDetails.terms.map((term) => (
                    <article
                      className="verse-greek-morphology-item"
                      key={`${entry.entryKey}:${selectedGreekFormDetails.form}:${term.key}`}
                    >
                      <p className="verse-greek-morphology-term">{term.label}</p>
                      <p className="verse-greek-morphology-copy">{term.definition}</p>
                      {term.example ? (
                        <p className="verse-greek-morphology-copy">{term.example}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
              {selectedGreekFormDetails.definition ? (
                <p className="strongs-entry-copy">{selectedGreekFormDetails.definition}</p>
              ) : null}
            </div>
          </section>
        ) : null}
        <div className="greek-dictionary-definition">
          <p className="strongs-entry-section-label">Lemma Definition</p>
          <p className="strongs-entry-copy">{entry.shortDefinition}</p>
          {entry.longDefinition ? (
            <p className="strongs-entry-copy greek-dictionary-long-definition">
              {entry.longDefinition}
            </p>
          ) : null}
        </div>
        <section className="greek-dictionary-forms">
          <p className="strongs-entry-section-label">Inflected Forms</p>
          <div className="greek-dictionary-form-list">
            {entry.forms.map((form, index) => {
              const isSelected =
                normalizedSelectedForm !== null &&
                normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm;

              return (
                <article
                  className={`greek-dictionary-form-row${isSelected ? " is-selected" : ""}`}
                  key={`${entry.entryKey}:${form.form}:${form.morphology}:${index}`}
                >
                  <p className="greek-dictionary-form-line">
                    <span className="greek-dictionary-form-text">{form.form}</span>
                    <span className="greek-dictionary-form-separator">—</span>
                    <span className="greek-dictionary-form-code">{form.morphology}</span>
                    {form.decodedMorphology ? (
                      <>
                        <span className="greek-dictionary-form-separator">—</span>
                        <span className="greek-dictionary-form-decoded">
                          {form.decodedMorphology}
                        </span>
                      </>
                    ) : null}
                    {form.definition ? (
                      <>
                        <span className="greek-dictionary-form-separator">—</span>
                        <span className="greek-dictionary-form-definition">
                          {form.definition}
                        </span>
                      </>
                    ) : null}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
        <div
          className="strongs-entry-tabs"
          role="tablist"
          aria-label={`${entry.strongs ?? entry.entryKey} study tabs`}
        >
          {getGreekAvailableTabs(greekStrongsEntry).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={`lookup-pane-tab${activeTab === tab ? " is-active" : ""}`}
              key={`${entry.entryKey}:${tab}`}
              onClick={() => handleSelectTab(entry.entryKey, tab, entry.lemma)}
              role="tab"
              type="button"
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        {activeTab === "bible" ? (
          <div className="strongs-entry-tab-panel">
            <p className="strongs-entry-section-label">Verses In Bible</p>
            {renderBibleOccurrences(entry.entryKey, "greek")}
          </div>
        ) : null}
        {activeTab === "bdag" ? (
          <div className="strongs-entry-tab-panel strongs-entry-bdag-body">
            <p className="strongs-entry-section-label">BDAG</p>
            {greekStrongsEntry ? renderBdagArticles(greekStrongsEntry) : (
              <p className="strongs-entry-copy">No BDAG article is available for this lemma.</p>
            )}
          </div>
        ) : null}
        {activeTab === "outside-bible" ? (
          <div className="strongs-entry-tab-panel strongs-entry-outside-scripture-results">
            <p className="strongs-entry-section-label">Verses Found Outside Bible</p>
            {renderOutsideBibleSection(entry.entryKey, entry.lemma)}
          </div>
        ) : null}
      </article>
    );
  }

  function renderGreekLearningQuizCard(quiz: GreekLearningQuiz) {
    const selectedOption = selectedQuizOptionId
      ? quiz.options.find((option) => option.id === selectedQuizOptionId) ?? null
      : null;
    const hasAnswered = selectedOption !== null;
    const answeredCorrectly = selectedOption?.isCorrect === true;

    return (
      <article className="strongs-entry-card greek-learning-quiz-card" key={quiz.entry.entryKey}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{quiz.entry.strongs ?? quiz.entry.entryKey}</span>
          <span className="strongs-entry-language">Greek learning</span>
        </div>
        <p className="strongs-entry-lemma greek-dictionary-lemma">{quiz.entry.lemma}</p>
        <div className="greek-dictionary-meta-list">
          <p className="strongs-entry-meta">
            Form: {quiz.selectedFormValue ?? quiz.entry.lemma}
          </p>
          <p className="strongs-entry-meta">
            Transliteration: {quiz.selectedTransliteration || quiz.entry.transliteration}
          </p>
          {selectedGreekFormDetails?.morphology ? (
            <p className="strongs-entry-meta">
              Morphology:{" "}
              {selectedGreekFormDetails.decodedMorphology
                ? `${selectedGreekFormDetails.decodedMorphology} (${selectedGreekFormDetails.morphology})`
                : selectedGreekFormDetails.morphology}
            </p>
          ) : null}
        </div>
        <section className="greek-learning-quiz-body">
          <p className="strongs-entry-section-label">Greek Quiz</p>
          <p className="strongs-entry-copy greek-learning-quiz-prompt">{quiz.prompt}</p>
          <div className="greek-learning-quiz-options">
            {quiz.options.map((option) => {
              const isSelected = selectedQuizOptionId === option.id;
              const showCorrectState = hasAnswered && option.isCorrect;
              const showWrongState = hasAnswered && isSelected && !option.isCorrect;

              return (
                <button
                  className={`greek-learning-quiz-option${
                    isSelected ? " is-selected" : ""
                  }${showCorrectState ? " is-correct" : ""}${
                    showWrongState ? " is-wrong" : ""
                  }`}
                  disabled={hasAnswered}
                  key={option.id}
                  onClick={() => setSelectedQuizOptionId(option.id)}
                  type="button"
                >
                  <span>{option.label}</span>
                  {showCorrectState ? (
                    <span className="greek-learning-quiz-option-status">Correct</span>
                  ) : null}
                  {showWrongState ? (
                    <span className="greek-learning-quiz-option-status">Not this one</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {hasAnswered ? (
            <div
              className={`greek-learning-quiz-feedback${
                answeredCorrectly ? " is-correct" : " is-wrong"
              }`}
            >
              <p className="strongs-entry-section-label">
                {answeredCorrectly ? "Correct" : "Correct Answer"}
              </p>
              <p className="strongs-entry-copy">
                {answeredCorrectly
                  ? `${quiz.selectedFormValue ?? quiz.entry.lemma} means ${quiz.correctAnswer}.`
                  : `${quiz.selectedFormValue ?? quiz.entry.lemma} means ${quiz.correctAnswer}, not ${selectedOption?.label}.`}
              </p>
            </div>
          ) : null}
        </section>
        <div className="greek-learning-quiz-actions">
          <button
            className="reader-inline-button"
            onClick={() =>
              activeGreekLearningQuizSelection
                ? openGreekDictionary({
                    ...activeGreekLearningQuizSelection,
                    transliteration: activeGreekLearningQuizSelection.transliteration ?? null,
                    gloss: activeGreekLearningQuizSelection.gloss ?? null
                  })
                : null
            }
            type="button"
          >
            Open Dictionary
          </button>
          <button
            className="reader-inline-button"
            onClick={() => {
              setGreekLearningAttempt((current) => current + 1);
              setSelectedQuizOptionId(null);
            }}
            type="button"
          >
            Try Again
          </button>
        </div>
      </article>
    );
  }

  function renderStrongsEntryCard(entry: StrongsEntry) {
    const activeTab = activeTabs[entry.id] ?? "bible";

    return (
      <article className="strongs-entry-card" key={entry.id}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{entry.id}</span>
          <span className="strongs-entry-language">
            {entry.language === "hebrew" ? "Hebrew" : "Greek"}
          </span>
        </div>
        <p className="strongs-entry-lemma">{entry.lemma}</p>
        {entry.transliteration ? (
          <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
        ) : null}
        {entry.partOfSpeech ? (
          <p className="strongs-entry-meta">Part of speech: {entry.partOfSpeech}</p>
        ) : null}
        {entry.definition ? <p className="strongs-entry-copy">{entry.definition}</p> : null}
        {entry.outlineUsage ? <p className="strongs-entry-copy">{entry.outlineUsage}</p> : null}
        {entry.rootWord ? <p className="strongs-entry-meta">Root word: {entry.rootWord}</p> : null}
        <div className="strongs-entry-tabs" role="tablist" aria-label={`${entry.id} study tabs`}>
          {getAvailableTabs(entry).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={`lookup-pane-tab${activeTab === tab ? " is-active" : ""}`}
              key={`${entry.id}:${tab}`}
              onClick={() =>
                handleSelectTab(entry.id, tab, entry.language === "greek" ? entry.lemma : undefined)
              }
              role="tab"
              type="button"
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        {activeTab === "bible" ? (
          <div className="strongs-entry-tab-panel">
            <p className="strongs-entry-section-label">Verses In Bible</p>
            {renderBibleOccurrences(entry.id, "strongs")}
          </div>
        ) : null}
        {activeTab === "bdag" && entry.bdagArticles?.length ? (
          <div className="strongs-entry-tab-panel strongs-entry-bdag-body">
            <p className="strongs-entry-section-label">BDAG</p>
            {renderBdagArticles(entry)}
          </div>
        ) : null}
        {activeTab === "outside-bible" && entry.language === "greek" ? (
          <div className="strongs-entry-tab-panel strongs-entry-outside-scripture-results">
            <p className="strongs-entry-section-label">Verses Found Outside Bible</p>
            {renderOutsideBibleSection(entry.id, entry.lemma)}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <div className="reader-strongs-panel">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">
            {isGreekLearningQuizMode
              ? "Greek Learning"
              : isGreekDictionaryMode
                ? "Greek Dictionary"
                : "Strongs Study"}
          </p>
          <h3 className="reader-notebook-title">{activePanelTitle}</h3>
        </div>
      </div>

      {activeStrongsNumbers.length === 0 &&
      !activeGreekSelection &&
      !activeGreekLearningQuizSelection ? (
        <p className="reader-notebook-empty">
          Search for a Strong’s number, Greek lemma, inflected form, transliteration, or gloss,
          or open a tagged word to study it here.
        </p>
      ) : isLoading ? (
        <p className="reader-notebook-empty">
          {isGreekLearningQuizMode
            ? "Loading Greek quiz…"
            : isGreekDictionaryMode
              ? "Loading Greek dictionary…"
              : "Loading Strongs details…"}
        </p>
      ) : isGreekLearningQuizMode ? (
        greekLearningQuizStatus === "loading" ? (
          <p className="reader-notebook-empty">Loading Greek quiz…</p>
        ) : greekLearningQuiz ? (
          <div className="reader-strongs-list">{renderGreekLearningQuizCard(greekLearningQuiz)}</div>
        ) : (
          <p className="reader-notebook-empty">
            No Greek learning quiz is available for this selection.
          </p>
        )
      ) : isGreekDictionaryMode ? (
        greekEntry ? (
          <div className="reader-strongs-list">{renderGreekDictionaryCard(greekEntry)}</div>
        ) : (
          <p className="reader-notebook-empty">
            No Greek dictionary entry is available for this selection.
          </p>
        )
      ) : entries.length === 0 ? (
        <p className="reader-notebook-empty">
          No Strongs entry details are available for this selection.
        </p>
      ) : (
        <div className="reader-strongs-list">{entries.map((entry) => renderStrongsEntryCard(entry))}</div>
      )}
    </div>
  );
}
