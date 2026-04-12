"use client";

import { useEffect, useMemo, useState } from "react";

import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  getGreekLemmaEntry,
  normalizeGreekFormLookupValue
} from "@/lib/bible/greek";
import {
  getStrongsEntries,
  getStrongsEntry,
  getStrongsVerseOccurrencesWithTokens
} from "@/lib/bible/strongs";
import type {
  BibleSearchVerseEntry,
  GreekInflectedForm,
  GreekLemmaEntry,
  StrongsEntry
} from "@/lib/bible/types";
import { findFathersSegmentsByGreekLemma, normalizeFathersGreekText } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

type OutsideScriptureLookupState = {
  status: "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

type BibleOccurrencesState = {
  status: "loading" | "loaded";
  matches: Array<BibleSearchVerseEntry & { href: string }>;
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
    activeGreekSelection,
    activeStrongsLabel,
    activeStrongsNumbers,
    openStrongs
  } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [greekEntry, setGreekEntry] = useState<GreekLemmaEntry | null>(null);
  const [greekStrongsEntry, setGreekStrongsEntry] = useState<StrongsEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, StrongsTab>>({});
  const [bibleOccurrences, setBibleOccurrences] = useState<Record<string, BibleOccurrencesState>>({});
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});
  const isGreekDictionaryMode = activeGreekSelection !== null;
  const activeGreekStrongs = activeGreekSelection?.strongs ?? null;
  const activePanelTitle =
    activeGreekSelection?.lemma ??
    activeStrongsLabel?.trim() ??
    activeStrongsNumbers[0] ??
    "Strongs details";
  const selectedGreekForm = useMemo(() => {
    if (!greekEntry || !activeGreekSelection?.selectedForm) {
      return null;
    }

    const normalizedSelectedForm = normalizeGreekFormLookupValue(activeGreekSelection.selectedForm);

    return (
      greekEntry.forms.find(
        (form) => normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm
      ) ?? null
    );
  }, [activeGreekSelection?.selectedForm, greekEntry]);
  const selectedGreekFormDetails: GreekInflectedForm | null = useMemo(() => {
    if (selectedGreekForm) {
      return selectedGreekForm;
    }

    if (!activeGreekSelection?.selectedForm) {
      return null;
    }

    return {
      form: activeGreekSelection.selectedForm,
      morphology: activeGreekSelection.selectedFormMorphology ?? "",
      definition: undefined
    };
  }, [
    activeGreekSelection?.selectedForm,
    activeGreekSelection?.selectedFormMorphology,
    selectedGreekForm
  ]);

  useEffect(() => {
    if (!isGreekDictionaryMode) {
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      return;
    }

    if (!activeGreekStrongs) {
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

    void Promise.all([getGreekLemmaEntry(activeGreekStrongs), getStrongsEntry(activeGreekStrongs)]).then(
      ([nextGreekEntry, nextGreekStrongsEntry]) => {
        if (isCancelled) {
          return;
        }

        setGreekEntry(nextGreekEntry);
        setGreekStrongsEntry(nextGreekStrongsEntry);
        setIsLoading(false);
        if (nextGreekEntry) {
          setActiveTabs({
            [nextGreekEntry.strongs]: "bible"
          });
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [activeGreekStrongs, isGreekDictionaryMode]);

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
    const activeStrongsIds = [
      ...entries.map((entry) => entry.id),
      ...(greekEntry?.strongs ? [greekEntry.strongs] : [])
    ];

    activeStrongsIds.forEach((strongsNumber) => {
      if (bibleOccurrences[strongsNumber]) {
        return;
      }

      setBibleOccurrences((current) => ({
        ...current,
        [strongsNumber]: {
          status: "loading",
          matches: []
        }
      }));

      void getStrongsVerseOccurrencesWithTokens(strongsNumber).then((matches) => {
        setBibleOccurrences((current) => ({
          ...current,
          [strongsNumber]: {
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

  function renderBibleOccurrences(strongsNumber: string) {
    const occurrences = bibleOccurrences[strongsNumber];

    if (occurrences?.status === "loading") {
      return <p className="strongs-entry-meta">Loading KJV verse occurrences…</p>;
    }

    if (!occurrences?.matches.length) {
      return (
        <p className="strongs-entry-copy">
          No KJV verse occurrences were found for this Strong’s number.
        </p>
      );
    }

    return (
      <div className="strongs-entry-bible-verses">
        {occurrences.matches.map((match) => (
          <article
            className="strongs-entry-bible-verse"
            key={`${strongsNumber}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
          >
            <a className="strongs-entry-bible-verse-link" href={match.href}>
              {match.bookName} {match.chapterNumber}:{match.verseNumber}
            </a>
            <VerseTextContent
              className="strongs-entry-copy strongs-entry-bible-verse-text"
              highlightedStrongsNumber={strongsNumber}
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
    const strongsKey = entry.strongs;
    const activeTab = activeTabs[strongsKey] ?? "bible";
    const selectedFormValue = activeGreekSelection?.selectedForm ?? null;
    const normalizedSelectedForm = selectedFormValue
      ? normalizeGreekFormLookupValue(selectedFormValue)
      : null;

    return (
      <article className="strongs-entry-card greek-dictionary-card" key={entry.strongs}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{entry.strongs}</span>
          <span className="strongs-entry-language">Greek dictionary</span>
        </div>
        <p className="strongs-entry-lemma greek-dictionary-lemma">{entry.lemma}</p>
        <div className="greek-dictionary-meta-list">
          <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
          {entry.pronunciation ? (
            <p className="strongs-entry-meta">Pronunciation: {entry.pronunciation}</p>
          ) : null}
        </div>
        <div className="greek-dictionary-definition">
          <p className="strongs-entry-section-label">Lemma Definition</p>
          <p className="strongs-entry-copy">{entry.shortDefinition}</p>
          {entry.longDefinition ? (
            <p className="strongs-entry-copy greek-dictionary-long-definition">
              {entry.longDefinition}
            </p>
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
                Lemma: {entry.lemma}
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                Strong’s: {entry.strongs}
              </p>
              {selectedGreekFormDetails.morphology ? (
                <p className="strongs-entry-meta">
                  Morphology:{" "}
                  {selectedGreekFormDetails.decodedMorphology
                    ? `${selectedGreekFormDetails.decodedMorphology} (${selectedGreekFormDetails.morphology})`
                    : selectedGreekFormDetails.morphology}
                </p>
              ) : null}
              {selectedGreekFormDetails.definition ? (
                <p className="strongs-entry-copy">{selectedGreekFormDetails.definition}</p>
              ) : null}
            </div>
          </section>
        ) : null}
        <section className="greek-dictionary-forms">
          <p className="strongs-entry-section-label">Inflected Forms</p>
          <div className="greek-dictionary-form-list">
            {entry.forms.map((form) => {
              const isSelected =
                normalizedSelectedForm !== null &&
                normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm;

              return (
                <article
                  className={`greek-dictionary-form-row${isSelected ? " is-selected" : ""}`}
                  key={`${entry.strongs}:${form.form}:${form.morphology}`}
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
        <div className="strongs-entry-tabs" role="tablist" aria-label={`${entry.strongs} study tabs`}>
          {getGreekAvailableTabs(greekStrongsEntry).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={`lookup-pane-tab${activeTab === tab ? " is-active" : ""}`}
              key={`${entry.strongs}:${tab}`}
              onClick={() => handleSelectTab(entry.strongs, tab, entry.lemma)}
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
            {renderBibleOccurrences(entry.strongs)}
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
            {renderOutsideBibleSection(entry.strongs, entry.lemma)}
          </div>
        ) : null}
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
            {renderBibleOccurrences(entry.id)}
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
            {isGreekDictionaryMode ? "Greek Dictionary" : "Strongs Study"}
          </p>
          <h3 className="reader-notebook-title">{activePanelTitle}</h3>
        </div>
      </div>

      {activeStrongsNumbers.length === 0 && !activeGreekSelection ? (
        <p className="reader-notebook-empty">
          Search for a Strong’s number, Greek lemma, inflected form, transliteration, or gloss,
          or open a tagged word to study it here.
        </p>
      ) : isLoading ? (
        <p className="reader-notebook-empty">
          {isGreekDictionaryMode ? "Loading Greek dictionary…" : "Loading Strongs details…"}
        </p>
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
