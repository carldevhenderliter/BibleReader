"use client";

import { useEffect, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getStrongsEntries, getStrongsVerseOccurrences } from "@/lib/bible/strongs";
import type { BibleSearchStrongsVerseEntry, StrongsEntry } from "@/lib/bible/types";
import { findFathersSegmentsByGreekLemma } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

type OutsideScriptureLookupState = {
  status: "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

type BibleOccurrencesState = {
  status: "loading" | "loaded";
  matches: Array<BibleSearchStrongsVerseEntry & { href: string }>;
};

type StrongsTab = "bible" | "bdag" | "outside-bible";

type InterlinearLinePair = {
  greek: string;
  english: string;
};

function splitInterlinearLines(value: string, pattern: RegExp) {
  return value
    .split(pattern)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildInterlinearLinePairs(greek: string, english: string): InterlinearLinePair[] {
  const greekLines = splitInterlinearLines(greek, /(?<=[.;·;!?])/u);
  const englishLines = splitInterlinearLines(english, /(?<=[.!?;:])/);

  if (
    greekLines.length > 1 &&
    englishLines.length > 1 &&
    Math.abs(greekLines.length - englishLines.length) <= 1
  ) {
    const lineCount = Math.max(greekLines.length, englishLines.length);

    return Array.from({ length: lineCount }, (_, index) => ({
      greek: greekLines[index] ?? "",
      english: englishLines[index] ?? ""
    })).filter((pair) => pair.greek || pair.english);
  }

  return [{ greek, english }];
}

export function ReaderStrongsPanel() {
  const { activeStrongsLabel, activeStrongsNumbers } = useReaderWorkspace();
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

      void getStrongsVerseOccurrences(entry.id).then((matches) => {
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
          Search for a Strongs number or open a tagged KJV word to study its definition here.
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
                        <a
                          className="strongs-entry-bible-verse"
                          href={match.href}
                          key={`${match.strongsNumber}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                        >
                          <p className="strongs-entry-meta">
                            {match.bookName} {match.chapterNumber}:{match.verseNumber}
                          </p>
                          <p className="strongs-entry-copy">{match.text}</p>
                        </a>
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
                            const linePairs = buildInterlinearLinePairs(
                              match.greekContext,
                              match.englishContext
                            );

                            return (
                              <article className="strongs-entry-fathers-hit" key={match.segmentId}>
                                <p className="strongs-entry-meta">
                                  {match.label}
                                  {match.ref !== match.label ? ` (${match.ref})` : ""}
                                </p>
                                <div className="strongs-entry-fathers-interlinear">
                                  {linePairs.map((pair, index) => (
                                    <div
                                      className="strongs-entry-fathers-line-pair"
                                      key={`${match.segmentId}:${index}`}
                                    >
                                      {pair.greek ? (
                                        <p className="strongs-entry-copy strongs-entry-fathers-greek">
                                          {pair.greek}
                                        </p>
                                      ) : null}
                                      {pair.english ? (
                                        <p className="strongs-entry-copy strongs-entry-fathers-english">
                                          {pair.english}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
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
