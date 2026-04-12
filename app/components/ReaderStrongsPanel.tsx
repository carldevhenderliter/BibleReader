"use client";

import { useEffect, useState } from "react";

import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  getStrongsEntries,
  getStrongsVerseOccurrencesWithTokens
} from "@/lib/bible/strongs";
import type { BibleSearchVerseEntry, StrongsEntry } from "@/lib/bible/types";
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

export function ReaderStrongsPanel() {
  const { activeStrongsLabel, activeStrongsNumbers, openStrongs } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, StrongsTab>>({});
  const [bibleOccurrences, setBibleOccurrences] = useState<Record<string, BibleOccurrencesState>>({});
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});

  useEffect(() => {
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
  }, [activeStrongsNumbers]);

  useEffect(() => {
    entries.forEach((entry) => {
      if (bibleOccurrences[entry.id]) {
        return;
      }

      setBibleOccurrences((current) => ({
        ...current,
        [entry.id]: {
          status: "loading",
          matches: []
        }
      }));

      void getStrongsVerseOccurrencesWithTokens(entry.id).then((matches) => {
        setBibleOccurrences((current) => ({
          ...current,
          [entry.id]: {
            status: "loaded",
            matches
          }
        }));
      });
    });
  }, [bibleOccurrences, entries]);

  async function handleFindOutsideScripture(entry: StrongsEntry) {
    setOutsideScripture((current) => ({
      ...current,
      [entry.id]: {
        status: "loading",
        matches: current[entry.id]?.matches ?? []
      }
    }));

    const matches = await findFathersSegmentsByGreekLemma(entry.lemma);

    setOutsideScripture((current) => ({
      ...current,
      [entry.id]: {
        status: "loaded",
        matches
      }
    }));
  }

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

  function getTabLabel(tab: StrongsTab) {
    if (tab === "bible") {
      return "Verses In Bible";
    }

    if (tab === "bdag") {
      return "BDAG";
    }

    return "Outside Bible";
  }

  function handleSelectTab(entry: StrongsEntry, tab: StrongsTab) {
    setActiveTabs((current) => ({
      ...current,
      [entry.id]: tab
    }));

    if (tab === "outside-bible" && entry.language === "greek" && !outsideScripture[entry.id]) {
      void handleFindOutsideScripture(entry);
    }
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

  return (
    <div className="reader-strongs-panel">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Strongs Study</p>
          <h3 className="reader-notebook-title">
            {activeStrongsLabel?.trim() || activeStrongsNumbers[0] || "Strongs details"}
          </h3>
        </div>
      </div>

      {activeStrongsNumbers.length === 0 ? (
        <p className="reader-notebook-empty">
          Search for a Strongs number or Greek word, or open a tagged KJV word to study its
          definition here.
        </p>
      ) : isLoading ? (
        <p className="reader-notebook-empty">Loading Strongs details…</p>
      ) : entries.length === 0 ? (
        <p className="reader-notebook-empty">No Strongs entry details are available for this selection.</p>
      ) : (
        <div className="reader-strongs-list">
          {entries.map((entry) => (
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
              {entry.rootWord ? (
                <p className="strongs-entry-meta">Root word: {entry.rootWord}</p>
              ) : null}
              <div className="strongs-entry-tabs" role="tablist" aria-label={`${entry.id} study tabs`}>
                {getAvailableTabs(entry).map((tab) => (
                  <button
                    aria-selected={(activeTabs[entry.id] ?? "bible") === tab}
                    className={`lookup-pane-tab${(activeTabs[entry.id] ?? "bible") === tab ? " is-active" : ""}`}
                    key={`${entry.id}:${tab}`}
                    onClick={() => handleSelectTab(entry, tab)}
                    role="tab"
                    type="button"
                  >
                    {getTabLabel(tab)}
                  </button>
                ))}
              </div>
              {(activeTabs[entry.id] ?? "bible") === "bible" ? (
                <div className="strongs-entry-tab-panel">
                  <p className="strongs-entry-section-label">Verses In Bible</p>
                  {bibleOccurrences[entry.id]?.status === "loading" ? (
                    <p className="strongs-entry-meta">Loading KJV verse occurrences…</p>
                  ) : bibleOccurrences[entry.id]?.matches.length ? (
                    <div className="strongs-entry-bible-verses">
                      {bibleOccurrences[entry.id].matches.map((match) => (
                        <article
                          className="strongs-entry-bible-verse"
                          key={`${entry.id}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                        >
                          <a className="strongs-entry-bible-verse-link" href={match.href}>
                            {match.bookName} {match.chapterNumber}:{match.verseNumber}
                          </a>
                          <VerseTextContent
                            className="strongs-entry-copy strongs-entry-bible-verse-text"
                            highlightedStrongsNumber={entry.id}
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
                  ) : (
                    <p className="strongs-entry-copy">No KJV verse occurrences were found for this Strongs number.</p>
                  )}
                </div>
              ) : null}
              {(activeTabs[entry.id] ?? "bible") === "bdag" && entry.bdagArticles?.length ? (
                <div className="strongs-entry-tab-panel strongs-entry-bdag-body">
                  <p className="strongs-entry-section-label">BDAG</p>
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
                          <p className="strongs-entry-copy strongs-entry-copy-bdag">
                            {summary.plainMeaning}
                          </p>
                          {summary.commonUse ? (
                            <p className="strongs-entry-copy strongs-entry-copy-bdag">
                              {summary.commonUse}
                            </p>
                          ) : null}
                          {summary.ntNote ? (
                            <p className="strongs-entry-copy strongs-entry-copy-bdag">
                              {summary.ntNote}
                            </p>
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
                </div>
              ) : null}
              {(activeTabs[entry.id] ?? "bible") === "outside-bible" && entry.language === "greek" ? (
                <div className="strongs-entry-tab-panel strongs-entry-outside-scripture-results">
                  <p className="strongs-entry-section-label">Verses Found Outside Bible</p>
                  {outsideScripture[entry.id]?.status === "loading" ? (
                    <p className="strongs-entry-meta">
                      Searching the Apostolic Fathers for this Greek lemma…
                    </p>
                  ) : outsideScripture[entry.id]?.status === "loaded" &&
                    outsideScripture[entry.id].matches.length ? (
                    Object.entries(
                      outsideScripture[entry.id].matches.reduce<Record<string, FathersLemmaMatch[]>>(
                        (groups, match) => {
                          groups[match.workTitle] = groups[match.workTitle]
                            ? [...groups[match.workTitle], match]
                            : [match];

                          return groups;
                        },
                        {}
                      )
                    ).map(([workTitle, matches]) => (
                      <section className="strongs-entry-fathers-group" key={`${entry.id}:${workTitle}`}>
                        <h4 className="strongs-entry-fathers-title">{workTitle}</h4>
                        <div className="strongs-entry-fathers-list">
                          {matches.map((match) => {
                            return (
                              <article className="strongs-entry-fathers-hit" key={match.segmentId}>
                                <p className="strongs-entry-meta">
                                  {match.label}
                                  {match.ref !== match.label ? ` (${match.ref})` : ""}
                                </p>
                                <div className="strongs-entry-fathers-interlinear">
                                  <div className="strongs-entry-fathers-line-pair">
                                    <p className="strongs-entry-copy strongs-entry-fathers-greek">
                                      {renderHighlightedGreekContext(match.greekContext, entry.lemma)}
                                    </p>
                                    <p className="strongs-entry-copy strongs-entry-fathers-english">
                                      {match.englishContext}
                                    </p>
                                  </div>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))
                  ) : outsideScripture[entry.id]?.status === "loaded" ? (
                    <p className="strongs-entry-copy">
                      No Apostolic Fathers matches found for this lemma.
                    </p>
                  ) : (
                    <p className="strongs-entry-meta">Select this tab to search the Apostolic Fathers.</p>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
