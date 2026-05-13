"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekGrammarDetailsContent } from "@/app/components/GreekGrammarCard";
import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import { getBookTestamentBySlug } from "@/lib/bible/book-order";
import { getGreekVerseOccurrences, normalizeGreekFormLookupValue } from "@/lib/bible/greek";
import { getStrongsEnglishHighlightPhrases } from "@/lib/bible/strongs-highlighting";
import {
  getVerseEntriesForVersion,
  type StrongsParallelVerseVersion,
  type VerseReferenceAnchor
} from "@/lib/bible/strongs";
import type { BibleSearchVerseEntry, BundledBibleVersion } from "@/lib/bible/types";
import { getBibleVersionLabel, getInstalledBundledBibleVersions } from "@/lib/bible/version";
import { findFathersSegmentsByGreekLemma, normalizeFathersGreekText } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

const MAX_EXACT_FORM_VERSES = 25;
const MAX_EXACT_FORM_FATHERS_MATCHES = 25;

type GreekGrammarPanelTab = "grammar" | "verses";
type GreekGrammarVerseScope = "new-testament" | "old-testament" | "early-fathers";

const GREEK_GRAMMAR_VERSE_SCOPES: {
  label: string;
  value: GreekGrammarVerseScope;
}[] = [
  { label: "New Testament", value: "new-testament" },
  { label: "Old Testament", value: "old-testament" },
  { label: "Early Fathers", value: "early-fathers" }
];

type ExactFormVerseState = {
  status: "idle" | "loading" | "loaded";
  matches: BibleSearchVerseEntry[];
};

type ExactFormFathersState = {
  status: "idle" | "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

type ParallelVerseEntriesState = {
  status: "loading" | "loaded";
  matches: StrongsParallelVerseVersion[];
};

function getDefaultGrammarVerseVersions(availableVersions: readonly BundledBibleVersion[]) {
  if (availableVersions.includes("greek")) {
    return ["greek"] satisfies BundledBibleVersion[];
  }

  return availableVersions.slice(0, 1);
}

function doesFathersMatchSelectedForm(
  match: FathersLemmaMatch,
  entryKey: string,
  selectedForm: string
) {
  const normalizedSelectedForm = normalizeGreekFormLookupValue(selectedForm);

  return (
    match.greekLexicalTokens?.some((token) => {
      const tokenEntryKey = token.entryKey ?? token.strongs ?? null;

      return (
        tokenEntryKey === entryKey &&
        normalizeGreekFormLookupValue(token.surface) === normalizedSelectedForm
      );
    }) ?? false
  );
}

function renderHighlightedFathersForm(context: string, selectedForm: string) {
  const normalizedSelectedForm = normalizeFathersGreekText(selectedForm);
  const segments = context.match(/[\p{Script=Greek}]+|[^\p{Script=Greek}]+/gu) ?? [context];

  return segments.map((segment, index) => {
    if (!/[\p{Script=Greek}]/u.test(segment)) {
      return <span key={`${segment}:${index}`}>{segment}</span>;
    }

    return normalizeFathersGreekText(segment) === normalizedSelectedForm ? (
      <mark className="strongs-inline-match" key={`${segment}:${index}`}>
        {segment}
      </mark>
    ) : (
      <span key={`${segment}:${index}`}>{segment}</span>
    );
  });
}

function getBibleScopeEmptyMessage(scope: GreekGrammarVerseScope) {
  if (scope === "old-testament") {
    return "No Old Testament Bible verses found with this exact form.";
  }

  return "No New Testament Bible verses found with this exact form.";
}

export function ReaderGreekGrammarPanel() {
  const {
    activeGreekGrammarSelection,
    openGreekDictionaryInCurrentPane,
    openStrongsInCurrentPane
  } = useReaderWorkspace();
  const installedVersions = useMemo(() => getInstalledBundledBibleVersions(), []);
  const defaultVerseVersions = useMemo(
    () => getDefaultGrammarVerseVersions(installedVersions),
    [installedVersions]
  );
  const [exactFormVerses, setExactFormVerses] = useState<ExactFormVerseState>({
    status: "idle",
    matches: []
  });
  const [exactFormFathers, setExactFormFathers] = useState<ExactFormFathersState>({
    status: "idle",
    matches: []
  });
  const [parallelVerseEntries, setParallelVerseEntries] = useState<
    Partial<Record<BundledBibleVersion, ParallelVerseEntriesState>>
  >({});
  const [selectedVerseVersions, setSelectedVerseVersions] = useState<BundledBibleVersion[]>(
    defaultVerseVersions
  );
  const [selectedVerseScope, setSelectedVerseScope] =
    useState<GreekGrammarVerseScope>("new-testament");
  const [activeTab, setActiveTab] = useState<GreekGrammarPanelTab>("grammar");

  const exactFormLookupKey = activeGreekGrammarSelection?.selectedForm
    ? `${activeGreekGrammarSelection.entryKey}:${activeGreekGrammarSelection.selectedForm}`
    : null;

  useEffect(() => {
    if (!activeGreekGrammarSelection?.selectedForm) {
      setExactFormVerses({
        status: "idle",
        matches: []
      });
      return;
    }

    let isCancelled = false;
    const { entryKey, selectedForm } = activeGreekGrammarSelection;

    setExactFormVerses({
      status: "loading",
      matches: []
    });

    void getGreekVerseOccurrences(entryKey, selectedForm).then((matches) => {
      if (isCancelled) {
        return;
      }

      setExactFormVerses({
        status: "loaded",
        matches
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeGreekGrammarSelection?.entryKey, exactFormLookupKey, activeGreekGrammarSelection?.selectedForm]);

  useEffect(() => {
    if (!activeGreekGrammarSelection?.selectedForm || selectedVerseScope !== "early-fathers") {
      setExactFormFathers({
        status: "idle",
        matches: []
      });
      return;
    }

    let isCancelled = false;
    const { entryKey, lemma, selectedForm } = activeGreekGrammarSelection;

    setExactFormFathers({
      status: "loading",
      matches: []
    });

    void findFathersSegmentsByGreekLemma(lemma).then((matches) => {
      if (isCancelled) {
        return;
      }

      setExactFormFathers({
        status: "loaded",
        matches: matches.filter((match) =>
          doesFathersMatchSelectedForm(match, entryKey, selectedForm)
        )
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    activeGreekGrammarSelection?.entryKey,
    activeGreekGrammarSelection?.lemma,
    exactFormLookupKey,
    activeGreekGrammarSelection?.selectedForm,
    selectedVerseScope
  ]);

  const scopedExactFormVerses = useMemo(
    () =>
      exactFormVerses.matches.filter((match) => {
        if (selectedVerseScope === "early-fathers") {
          return false;
        }

        const testament = getBookTestamentBySlug(match.bookSlug);

        return selectedVerseScope === "old-testament"
          ? testament === "Old"
          : testament === "New";
      }),
    [exactFormVerses.matches, selectedVerseScope]
  );

  const visibleExactFormVerses = useMemo(
    () => scopedExactFormVerses.slice(0, MAX_EXACT_FORM_VERSES),
    [scopedExactFormVerses]
  );

  const visibleExactFormFathers = useMemo(
    () => exactFormFathers.matches.slice(0, MAX_EXACT_FORM_FATHERS_MATCHES),
    [exactFormFathers.matches]
  );

  const visibleExactFormAnchors = useMemo(
    () =>
      visibleExactFormVerses.map(
        (match): VerseReferenceAnchor => ({
          bookSlug: match.bookSlug,
          chapterNumber: match.chapterNumber,
          verseNumber: match.verseNumber
        })
      ),
    [visibleExactFormVerses]
  );

  useEffect(() => {
    setSelectedVerseVersions(defaultVerseVersions);
    setParallelVerseEntries({});
    setSelectedVerseScope("new-testament");
  }, [defaultVerseVersions, exactFormLookupKey]);

  useEffect(() => {
    if (!activeGreekGrammarSelection?.selectedForm && activeTab === "verses") {
      setActiveTab("grammar");
    }
  }, [activeGreekGrammarSelection?.selectedForm, activeTab]);

  useEffect(() => {
    const versionsToLoad = selectedVerseVersions.filter((version) => version !== "greek");

    if (
      exactFormVerses.status !== "loaded" ||
      selectedVerseScope === "early-fathers" ||
      visibleExactFormAnchors.length === 0 ||
      versionsToLoad.length === 0
    ) {
      setParallelVerseEntries({});
      return;
    }

    let isCancelled = false;

    setParallelVerseEntries(
      Object.fromEntries(
        versionsToLoad.map((version) => [
          version,
          {
            status: "loading",
            matches: []
          }
        ])
      ) as Partial<Record<BundledBibleVersion, ParallelVerseEntriesState>>
    );

    void Promise.all(
      versionsToLoad.map(async (version) => [
        version,
        await getVerseEntriesForVersion(visibleExactFormAnchors, version)
      ] as const)
    ).then((entriesByVersion) => {
      if (isCancelled) {
        return;
      }

      setParallelVerseEntries(
        Object.fromEntries(
          entriesByVersion.map(([version, matches]) => [
            version,
            {
              status: "loaded",
              matches
            }
          ])
        ) as Partial<Record<BundledBibleVersion, ParallelVerseEntriesState>>
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [
    activeGreekGrammarSelection?.selectedForm,
    exactFormVerses.status,
    selectedVerseVersions,
    selectedVerseScope,
    visibleExactFormAnchors
  ]);

  if (!activeGreekGrammarSelection) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">
          Open a Greek word and use More to view its grammar details here.
        </p>
      </div>
    );
  }

  const { grammar } = activeGreekGrammarSelection;
  const selectedGreekForm = activeGreekGrammarSelection.selectedForm;
  const canShowVersesTab = Boolean(activeGreekGrammarSelection.selectedForm);
  const loadingVerseVersions = selectedVerseVersions.filter(
    (version) => version !== "greek" && parallelVerseEntries[version]?.status !== "loaded"
  );

  const toggleSelectedVerseVersion = (version: BundledBibleVersion) => {
    setSelectedVerseVersions((current) => {
      const currentSelection = current.length > 0 ? current : defaultVerseVersions;
      const nextSelection = currentSelection.includes(version)
        ? currentSelection.length > 1
          ? currentSelection.filter((selectedVersion) => selectedVersion !== version)
          : currentSelection
        : installedVersions.filter(
            (candidate) => currentSelection.includes(candidate) || candidate === version
          );

      return nextSelection;
    });
  };

  return (
    <div className="reader-strongs-panel">
      <article className="strongs-entry-card greek-dictionary-card">
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">
            {activeGreekGrammarSelection.strongs ?? activeGreekGrammarSelection.entryKey}
          </span>
          <span className="strongs-entry-language">Greek grammar</span>
        </div>
        <button
          className="strongs-entry-lemma greek-dictionary-lemma greek-grammar-panel-lemma"
          onClick={() => openGreekDictionaryInCurrentPane(activeGreekGrammarSelection)}
          type="button"
        >
          {activeGreekGrammarSelection.lemma}
        </button>
        {activeGreekGrammarSelection.transliteration ? (
          <p className="strongs-entry-meta">
            Transliteration: {activeGreekGrammarSelection.transliteration}
          </p>
        ) : null}
        <div
          aria-label={`${activeGreekGrammarSelection.lemma} grammar views`}
          className="strongs-entry-tabs"
          role="tablist"
        >
          <button
            aria-selected={activeTab === "grammar"}
            className={`lookup-pane-tab${activeTab === "grammar" ? " is-active" : ""}`}
            onClick={() => setActiveTab("grammar")}
            role="tab"
            type="button"
          >
            Details
          </button>
          {canShowVersesTab ? (
            <button
              aria-selected={activeTab === "verses"}
              className={`lookup-pane-tab${activeTab === "verses" ? " is-active" : ""}`}
              onClick={() => setActiveTab("verses")}
              role="tab"
              type="button"
            >
              Verses
            </button>
          ) : null}
        </div>
        {activeTab === "grammar" ? (
          <>
            <div className="greek-grammar-panel-section">
              <p className="strongs-entry-section-label">Grammar</p>
              <div className="greek-grammar-panel-expanded">
                <GreekGrammarDetailsContent grammar={grammar} />
              </div>
            </div>
            <div className="greek-dictionary-selected-form-card greek-grammar-panel-card">
              <p className="strongs-entry-section-label">Selected Form</p>
              {activeGreekGrammarSelection.selectedForm ? (
                <p
                  className="strongs-entry-lemma greek-dictionary-selected-form-value"
                  lang="el"
                >
                  {activeGreekGrammarSelection.selectedForm}
                </p>
              ) : null}
              <p className="strongs-entry-meta">
                {[
                  `Lemma: ${activeGreekGrammarSelection.lemma}`,
                  activeGreekGrammarSelection.strongs
                    ? `Strong’s: ${activeGreekGrammarSelection.strongs}`
                    : null
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {grammar.quickInfo.partOfSpeech ? (
                <p className="strongs-entry-meta">Part of speech: {grammar.quickInfo.partOfSpeech}</p>
              ) : null}
              {activeGreekGrammarSelection.selectedFormDecodedMorphology ? (
                <p className="strongs-entry-meta">
                  Morphology: {activeGreekGrammarSelection.selectedFormDecodedMorphology}
                  {activeGreekGrammarSelection.selectedFormMorphology
                    ? ` (${activeGreekGrammarSelection.selectedFormMorphology})`
                    : ""}
                </p>
              ) : null}
              {grammar.quickInfo.gloss ? (
                <p className="strongs-entry-copy">{grammar.quickInfo.gloss}</p>
              ) : null}
              <button
                className="reader-inline-button"
                onClick={() => openGreekDictionaryInCurrentPane(activeGreekGrammarSelection)}
                type="button"
              >
                Open lemma in Strongs
              </button>
            </div>
          </>
        ) : null}
        {activeTab === "verses" && selectedGreekForm ? (
          <section
            aria-labelledby="greek-grammar-exact-form-verses-heading"
            className="greek-grammar-panel-section"
          >
            <p
              className="strongs-entry-section-label"
              id="greek-grammar-exact-form-verses-heading"
            >
              Bible Verses With This Form
            </p>
            <div className="strongs-entry-bible-filter-group">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                Scope
              </p>
              <div
                aria-label="Choose grammar verse source"
                className="strongs-entry-bible-version-selector"
                role="group"
              >
                {GREEK_GRAMMAR_VERSE_SCOPES.map((scope) => (
                  <button
                    aria-pressed={selectedVerseScope === scope.value}
                    className={`reader-inline-button strongs-entry-bible-version-button${
                      selectedVerseScope === scope.value ? " is-active" : ""
                    }`}
                    key={`grammar-verses-scope:${scope.value}`}
                    onClick={() => setSelectedVerseScope(scope.value)}
                    type="button"
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </div>
            {selectedVerseScope !== "early-fathers" ? (
              <>
                <div className="strongs-entry-bible-filter-group">
                  <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                    Versions
                  </p>
                  <div
                    aria-label="Display versions for grammar verses"
                    className="strongs-entry-bible-version-selector"
                    role="group"
                  >
                    {installedVersions.map((version) => (
                      <button
                        aria-pressed={selectedVerseVersions.includes(version)}
                        className={`reader-inline-button strongs-entry-bible-version-button${
                          selectedVerseVersions.includes(version) ? " is-active" : ""
                        }`}
                        key={`grammar-verses:${version}`}
                        onClick={() => toggleSelectedVerseVersion(version)}
                        type="button"
                      >
                        {getBibleVersionLabel(version)}
                      </button>
                    ))}
                  </div>
                </div>
                {exactFormVerses.status === "loading" ? (
                  <p className="strongs-entry-meta">Loading Bible verses with this form…</p>
                ) : null}
                {exactFormVerses.status === "loaded" && scopedExactFormVerses.length === 0 ? (
                  <p className="strongs-entry-copy">
                    {getBibleScopeEmptyMessage(selectedVerseScope)}
                  </p>
                ) : null}
                {exactFormVerses.status === "loaded" &&
                scopedExactFormVerses.length > MAX_EXACT_FORM_VERSES ? (
                  <p className="strongs-entry-meta">
                    Showing first {MAX_EXACT_FORM_VERSES} of {scopedExactFormVerses.length}
                  </p>
                ) : null}
                {loadingVerseVersions.length > 0 ? (
                  <p className="strongs-entry-meta">
                    Loading{" "}
                    {loadingVerseVersions.map((version) => getBibleVersionLabel(version)).join(" + ")} verses…
                  </p>
                ) : null}
                {visibleExactFormVerses.length > 0 ? (
                  <div className="strongs-entry-bible-verses">
                    {visibleExactFormVerses.map((match, index) => (
                      <article
                        className="strongs-entry-bible-verse"
                        key={`${activeGreekGrammarSelection.entryKey}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                      >
                        <p className="strongs-entry-meta">
                          {match.bookName} {match.chapterNumber}:{match.verseNumber}
                        </p>
                        <div className="strongs-entry-bible-version-list">
                          {selectedVerseVersions.map((selectedVersion) => {
                            const versionState = parallelVerseEntries[selectedVersion] ?? null;
                            const versionMatch =
                              selectedVersion === "greek"
                                ? match
                                : versionState?.matches[index]?.entry ?? null;
                            const englishHighlightPhrases =
                              versionMatch && selectedVersion !== "greek"
                                ? getStrongsEnglishHighlightPhrases(
                                    activeGreekGrammarSelection.strongs ??
                                      activeGreekGrammarSelection.entryKey,
                                    match,
                                    "greek"
                                  )
                                : [];

                            return (
                              <div
                                className="strongs-entry-bible-version-row"
                                key={`${activeGreekGrammarSelection.entryKey}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}:${selectedVersion}`}
                              >
                                <p className="strongs-entry-meta strongs-entry-bible-version-label">
                                  {getBibleVersionLabel(selectedVersion)}
                                </p>
                                {versionMatch ? (
                                  selectedVersion === "greek" ? (
                                    <GreekVerseTextContent
                                      className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-greek"
                                      enableGreekLearning={false}
                                      highlightedEntryKey={activeGreekGrammarSelection.entryKey}
                                      onOpenGreekDictionary={openGreekDictionaryInCurrentPane}
                                      verse={{
                                        number: versionMatch.verseNumber,
                                        text: versionMatch.text,
                                        greekTokens: versionMatch.greekTokens
                                      }}
                                    />
                                  ) : (
                                    <VerseTextContent
                                      className="strongs-entry-copy strongs-entry-bible-verse-text"
                                      highlightedPhrases={
                                        selectedVersion === "kjv" ? [] : englishHighlightPhrases
                                      }
                                      highlightedStrongsNumber={
                                        selectedVersion === "kjv"
                                          ? activeGreekGrammarSelection.strongs ??
                                            activeGreekGrammarSelection.entryKey
                                          : null
                                      }
                                      onOpenStrongs={(strongsNumbers) =>
                                        openStrongsInCurrentPane(
                                          strongsNumbers,
                                          strongsNumbers.join(" ")
                                        )
                                      }
                                      showStrongs={selectedVersion === "kjv"}
                                      verse={{
                                        number: versionMatch.verseNumber,
                                        text: versionMatch.text,
                                        translationText: versionMatch.translationText,
                                        tokens: versionMatch.tokens,
                                        greekTokens: versionMatch.greekTokens
                                      }}
                                    />
                                  )
                                ) : !versionState || versionState.status === "loading" ? null : (
                                  <p className="strongs-entry-copy">
                                    This verse is not available in{" "}
                                    {getBibleVersionLabel(selectedVersion)}.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {exactFormFathers.status === "loading" ? (
                  <p className="strongs-entry-meta">
                    Searching Early Fathers for this exact form…
                  </p>
                ) : null}
                {exactFormFathers.status === "loaded" && exactFormFathers.matches.length === 0 ? (
                  <p className="strongs-entry-copy">
                    No Early Fathers matches found with this exact form.
                  </p>
                ) : null}
                {exactFormFathers.status === "loaded" &&
                exactFormFathers.matches.length > MAX_EXACT_FORM_FATHERS_MATCHES ? (
                  <p className="strongs-entry-meta">
                    Showing first {MAX_EXACT_FORM_FATHERS_MATCHES} of{" "}
                    {exactFormFathers.matches.length}
                  </p>
                ) : null}
                {visibleExactFormFathers.length > 0 ? (
                  <div className="strongs-entry-fathers-list">
                    {visibleExactFormFathers.map((match) => (
                      <article className="strongs-entry-fathers-hit" key={match.segmentId}>
                        <p className="strongs-entry-meta">
                          {match.workTitle} · {match.label}
                          {match.ref !== match.label ? ` (${match.ref})` : ""}
                        </p>
                        <div className="strongs-entry-fathers-interlinear">
                          <div className="strongs-entry-fathers-line-pair">
                            <p className="strongs-entry-copy strongs-entry-fathers-greek">
                              {renderHighlightedFathersForm(
                                match.greekContext,
                                selectedGreekForm
                              )}
                            </p>
                            <p className="strongs-entry-copy strongs-entry-fathers-english">
                              {match.englishContext}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : null}
      </article>
    </div>
  );
}
