"use client";

import { useEffect, useMemo, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { formatBdagArticle } from "@/lib/bible/bdag";
import { getBookTestamentBySlug } from "@/lib/bible/book-order";
import { getGreekLemmaEntry, getGreekVerseOccurrences } from "@/lib/bible/greek";
import { getStrongsEntry } from "@/lib/bible/strongs";
import type {
  BibleSearchVerseEntry,
  GreekLemmaEntry,
  GreekToken,
  StrongsEntry
} from "@/lib/bible/types";
import { findFathersSegmentsByGreekLemma } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

const MAX_USAGE_ITEMS = 25;

type PrototypeWordStudyTab = "dictionary" | "nt" | "lxx" | "early";

type PrototypeWordStudyState = {
  status: "idle" | "loading" | "loaded";
  greekEntry: GreekLemmaEntry | null;
  strongsEntry: StrongsEntry | null;
  occurrences: BibleSearchVerseEntry[];
  fathersMatches: FathersLemmaMatch[];
};

const PROTOTYPE_WORD_STUDY_TABS: {
  icon: string;
  label: string;
  value: PrototypeWordStudyTab;
}[] = [
  { icon: "▣", label: "Dictionary", value: "dictionary" },
  { icon: "NT", label: "NT Usage", value: "nt" },
  { icon: "LXX", label: "LXX Usage", value: "lxx" },
  { icon: "✣", label: "Early Church", value: "early" }
];

function cleanRootWord(value?: string | null) {
  if (!value?.trim()) {
    return "Unknown root";
  }

  const parts = value.split("|").map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[1]}${parts[2] ? ` (${parts[2]})` : ""}`;
  }

  return value.trim();
}

function splitDefinitionPhrases(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .replace(/\([^)]{0,200}\)/g, " ")
    .split(/[;,/]|\bor\b/i)
    .map((phrase) => phrase.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function getMatchEntryKey(token: GreekToken) {
  return token.entryKey ?? token.strongs ?? null;
}

function countOccurrenceTokens(matches: BibleSearchVerseEntry[], entryKey: string) {
  return matches.reduce((count, match) => {
    const tokenCount =
      match.greekTokens?.filter((token) => getMatchEntryKey(token) === entryKey).length ?? 0;

    return count + (tokenCount > 0 ? tokenCount : 1);
  }, 0);
}

function getUsageSummary(matches: BibleSearchVerseEntry[], entryKey: string) {
  return `Used ${countOccurrenceTokens(matches, entryKey)} times in ${matches.length} verses`;
}

function renderGreekTextWithHighlights(match: BibleSearchVerseEntry, entryKey: string) {
  if (!match.greekTokens?.length) {
    return <span>{match.text}</span>;
  }

  return match.greekTokens.map((token, index) => {
    const isMatch = getMatchEntryKey(token) === entryKey;

    return (
      <span key={`${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}:${index}`}>
        {index > 0 ? " " : ""}
        {isMatch ? (
          <mark className="reader-prototype-word-study-highlight">
            {token.surface}
            {token.trailingPunctuation ?? ""}
          </mark>
        ) : (
          <>
            {token.surface}
            {token.trailingPunctuation ?? ""}
          </>
        )}
      </span>
    );
  });
}

function getReference(match: BibleSearchVerseEntry) {
  return `${match.bookName} ${match.chapterNumber}:${match.verseNumber}`;
}

function getFirstExample(matches: BibleSearchVerseEntry[]) {
  return matches[0] ?? null;
}

export function ReaderPrototypeWordStudyPanel() {
  const { activeGreekSelection } = useReaderWorkspace();
  const [activeTab, setActiveTab] = useState<PrototypeWordStudyTab>("dictionary");
  const [state, setState] = useState<PrototypeWordStudyState>({
    status: "idle",
    greekEntry: null,
    strongsEntry: null,
    occurrences: [],
    fathersMatches: []
  });
  const entryKey = activeGreekSelection?.entryKey ?? activeGreekSelection?.strongs ?? null;

  useEffect(() => {
    setActiveTab("dictionary");
  }, [entryKey, activeGreekSelection?.selectedForm]);

  useEffect(() => {
    if (!activeGreekSelection || !entryKey) {
      setState({
        status: "idle",
        greekEntry: null,
        strongsEntry: null,
        occurrences: [],
        fathersMatches: []
      });
      return;
    }

    let isCancelled = false;
    setState((current) => ({
      ...current,
      status: "loading",
      greekEntry: null,
      strongsEntry: null,
      occurrences: [],
      fathersMatches: []
    }));

    void Promise.all([
      getGreekLemmaEntry(entryKey),
      getStrongsEntry(activeGreekSelection.strongs ?? entryKey),
      getGreekVerseOccurrences(entryKey),
      findFathersSegmentsByGreekLemma(activeGreekSelection.lemma)
    ]).then(([greekEntry, strongsEntry, occurrences, fathersMatches]) => {
      if (isCancelled) {
        return;
      }

      setState({
        status: "loaded",
        greekEntry,
        strongsEntry,
        occurrences,
        fathersMatches
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [activeGreekSelection, entryKey]);

  const ntOccurrences = useMemo(
    () =>
      state.occurrences.filter(
        (match) => getBookTestamentBySlug(match.bookSlug) === "New"
      ),
    [state.occurrences]
  );
  const lxxOccurrences = useMemo(
    () =>
      state.occurrences.filter(
        (match) => getBookTestamentBySlug(match.bookSlug) === "Old"
      ),
    [state.occurrences]
  );
  const formattedBdagArticle = useMemo(() => {
    const firstArticle = state.strongsEntry?.bdagArticles?.[0];

    return firstArticle ? formatBdagArticle(firstArticle) : null;
  }, [state.strongsEntry?.bdagArticles]);
  const semanticRanges = useMemo(() => {
    const terms = formattedBdagArticle?.keyTerms.length
      ? formattedBdagArticle.keyTerms
      : splitDefinitionPhrases(state.greekEntry?.shortDefinition);

    return terms.length > 0 ? terms.slice(0, 4) : ["Meaning", "Usage"];
  }, [formattedBdagArticle, state.greekEntry?.shortDefinition]);
  const selectedForm = activeGreekSelection?.selectedForm ?? activeGreekSelection?.lemma ?? "";
  const transliteration =
    activeGreekSelection?.transliteration ??
    state.greekEntry?.transliteration ??
    state.strongsEntry?.transliteration ??
    "";
  const strongsNumber =
    activeGreekSelection?.strongs ?? state.greekEntry?.strongs ?? state.strongsEntry?.id ?? entryKey;
  const parsing =
    activeGreekSelection?.selectedFormDecodedMorphology ??
    activeGreekSelection?.selectedFormMorphology ??
    "Unknown parsing";
  const ntExample = getFirstExample(ntOccurrences);
  const lxxExample = getFirstExample(lxxOccurrences);
  const defaultUsageTab = ntOccurrences.length > 0 ? "nt" : "lxx";

  function renderUsageList(matches: BibleSearchVerseEntry[], emptyMessage: string) {
    if (!entryKey) {
      return null;
    }

    if (state.status === "loading") {
      return <p className="reader-prototype-word-study-muted">Loading word study…</p>;
    }

    if (matches.length === 0) {
      return <p className="reader-prototype-word-study-muted">{emptyMessage}</p>;
    }

    return (
      <div className="reader-prototype-word-study-list">
        {matches.slice(0, MAX_USAGE_ITEMS).map((match) => (
          <article
            className="reader-prototype-word-study-example"
            key={`${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
          >
            <p className="reader-prototype-word-study-reference">{getReference(match)}</p>
            <p className="reader-prototype-word-study-greek">
              {renderGreekTextWithHighlights(match, entryKey)}
            </p>
            {match.translationText ? (
              <p className="reader-prototype-word-study-copy">{match.translationText}</p>
            ) : null}
          </article>
        ))}
        {matches.length > MAX_USAGE_ITEMS ? (
          <p className="reader-prototype-word-study-muted">
            Showing first {MAX_USAGE_ITEMS} of {matches.length}
          </p>
        ) : null}
      </div>
    );
  }

  function renderEarlyChurch() {
    if (state.status === "loading") {
      return <p className="reader-prototype-word-study-muted">Loading word study…</p>;
    }

    if (state.fathersMatches.length === 0) {
      return (
        <p className="reader-prototype-word-study-muted">
          No Early Church matches found for this Greek lemma.
        </p>
      );
    }

    return (
      <div className="reader-prototype-word-study-list">
        {state.fathersMatches.slice(0, MAX_USAGE_ITEMS).map((match) => (
          <article className="reader-prototype-word-study-example" key={match.segmentId}>
            <p className="reader-prototype-word-study-reference">
              {match.workTitle} · {match.label}
            </p>
            <p className="reader-prototype-word-study-greek">{match.greekContext}</p>
            <p className="reader-prototype-word-study-copy">{match.englishContext}</p>
          </article>
        ))}
        {state.fathersMatches.length > MAX_USAGE_ITEMS ? (
          <p className="reader-prototype-word-study-muted">
            Showing first {MAX_USAGE_ITEMS} of {state.fathersMatches.length}
          </p>
        ) : null}
      </div>
    );
  }

  function renderDictionary() {
    if (!entryKey) {
      return null;
    }

    if (state.status === "loading") {
      return <p className="reader-prototype-word-study-muted">Loading word study…</p>;
    }

    return (
      <div className="reader-prototype-word-study-dictionary">
        <section>
          <p className="reader-prototype-word-study-section-title">BDAG Definition</p>
          {formattedBdagArticle ? (
            <div className="reader-prototype-word-study-definition">
              <p>
                <strong>1.</strong> {formattedBdagArticle.plainMeaning}
              </p>
              {formattedBdagArticle.commonUse ? (
                <p>
                  <strong>b.</strong> {formattedBdagArticle.commonUse}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="reader-prototype-word-study-copy">
              {state.greekEntry?.longDefinition ??
                state.greekEntry?.shortDefinition ??
                state.strongsEntry?.definition ??
                "No dictionary definition is available for this word."}
            </p>
          )}
        </section>
        <section className="reader-prototype-word-study-semantic-card">
          <p className="reader-prototype-word-study-section-title">Semantic Range</p>
          <div className="reader-prototype-word-study-chip-list">
            {semanticRanges.map((range) => (
              <span className="reader-prototype-word-study-chip" key={range}>
                {range}
              </span>
            ))}
          </div>
        </section>
        <section>
          <p className="reader-prototype-word-study-section-title">NT Usage</p>
          <p className="reader-prototype-word-study-copy">
            {getUsageSummary(ntOccurrences, entryKey)}
          </p>
        </section>
        <section>
          <p className="reader-prototype-word-study-section-title">Example in Context</p>
          {ntExample ?? lxxExample ? (
            <article className="reader-prototype-word-study-example">
              <p className="reader-prototype-word-study-reference">
                {getReference((ntExample ?? lxxExample)!)}
              </p>
              <p className="reader-prototype-word-study-greek">
                {renderGreekTextWithHighlights((ntExample ?? lxxExample)!, entryKey)}
              </p>
              {(ntExample ?? lxxExample)!.translationText ? (
                <p className="reader-prototype-word-study-copy">
                  {(ntExample ?? lxxExample)!.translationText}
                </p>
              ) : null}
            </article>
          ) : (
            <p className="reader-prototype-word-study-muted">
              No Bible example is available for this lemma.
            </p>
          )}
        </section>
        <button
          className="reader-prototype-word-study-search"
          onClick={() => setActiveTab(defaultUsageTab)}
          type="button"
        >
          Search all occurrences
        </button>
      </div>
    );
  }

  return (
    <div className="reader-prototype-word-study">
      <div className="reader-prototype-word-study-header">
        <div>
          <div className="reader-prototype-word-study-title-row">
            <span aria-hidden="true" className="reader-prototype-word-study-book-icon">
              ▱
            </span>
            <p>Word Study</p>
          </div>
          {activeGreekSelection ? (
            <>
              <div className="reader-prototype-word-study-lemma-row">
                <h2 lang="el">{selectedForm}</h2>
                <button
                  aria-label={`Play pronunciation for ${selectedForm}`}
                  className="reader-prototype-word-study-audio"
                  type="button"
                >
                  ◔
                </button>
              </div>
              {transliteration ? (
                <p className="reader-prototype-word-study-transliteration">
                  {transliteration}
                </p>
              ) : null}
            </>
          ) : null}
        </div>
        {strongsNumber ? (
          <span className="reader-prototype-word-study-strongs">{strongsNumber}</span>
        ) : null}
      </div>
      {!activeGreekSelection ? (
        <p className="reader-prototype-word-study-empty">
          Select a Greek word to study it here.
        </p>
      ) : (
        <>
          <div className="reader-prototype-word-study-morph-card">
            <span>Part of Speech</span>
            <strong>{state.strongsEntry?.partOfSpeech || "Unknown"}</strong>
            <span>Parsing</span>
            <strong>{parsing}</strong>
            <span>Root</span>
            <strong>{cleanRootWord(state.strongsEntry?.rootWord ?? state.greekEntry?.lemma)}</strong>
          </div>
          <div
            aria-label="Prototype word study tabs"
            className="reader-prototype-word-study-tabs"
            role="tablist"
          >
            {PROTOTYPE_WORD_STUDY_TABS.map((tab) => (
              <button
                aria-selected={activeTab === tab.value}
                className={`reader-prototype-word-study-tab${
                  activeTab === tab.value ? " is-active" : ""
                }`}
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                role="tab"
                type="button"
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="reader-prototype-word-study-body">
            {activeTab === "dictionary" ? renderDictionary() : null}
            {activeTab === "nt"
              ? renderUsageList(ntOccurrences, "No New Testament usage found for this lemma.")
              : null}
            {activeTab === "lxx"
              ? renderUsageList(lxxOccurrences, "No LXX usage found for this lemma.")
              : null}
            {activeTab === "early" ? renderEarlyChurch() : null}
          </div>
        </>
      )}
    </div>
  );
}
