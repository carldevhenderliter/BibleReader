"use client";

import { useEffect, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getStrongsEntries } from "@/lib/bible/strongs";
import type { StrongsEntry } from "@/lib/bible/types";
import { findFathersSegmentsByGreekLemma } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

type OutsideScriptureLookupState = {
  status: "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

export function ReaderStrongsPanel() {
  const { activeStrongsLabel, activeStrongsNumbers } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});

  useEffect(() => {
    if (activeStrongsNumbers.length === 0) {
      setEntries([]);
      setIsLoading(false);
      setOutsideScripture({});
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setOutsideScripture({});

    void getStrongsEntries(activeStrongsNumbers).then((nextEntries) => {
      if (!isCancelled) {
        setEntries(nextEntries);
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeStrongsNumbers]);

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
              {entry.bdagArticles?.length ? (
                <div className="strongs-entry-bdag">
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
              {entry.language === "greek" ? (
                <div className="strongs-entry-outside-scripture">
                  <button
                    className="reader-inline-button strongs-entry-action"
                    disabled={outsideScripture[entry.id]?.status === "loading"}
                    onClick={() => void handleFindOutsideScripture(entry)}
                    type="button"
                  >
                    Find this word outside scripture
                  </button>
                  {outsideScripture[entry.id]?.status === "loading" ? (
                    <p className="strongs-entry-meta">
                      Searching the Apostolic Fathers for this Greek lemma…
                    </p>
                  ) : null}
                  {outsideScripture[entry.id]?.status === "loaded" ? (
                    <div className="strongs-entry-outside-scripture-results">
                      <p className="strongs-entry-section-label">Outside Scripture</p>
                      {outsideScripture[entry.id]?.matches.length ? (
                        Object.entries(
                          outsideScripture[entry.id].matches.reduce<
                            Record<string, FathersLemmaMatch[]>
                          >((groups, match) => {
                            groups[match.workTitle] = groups[match.workTitle]
                              ? [...groups[match.workTitle], match]
                              : [match];

                            return groups;
                          }, {})
                        ).map(([workTitle, matches]) => (
                          <section className="strongs-entry-fathers-group" key={`${entry.id}:${workTitle}`}>
                            <h4 className="strongs-entry-fathers-title">{workTitle}</h4>
                            <div className="strongs-entry-fathers-list">
                              {matches.map((match) => (
                                <article
                                  className="strongs-entry-fathers-hit"
                                  key={match.segmentId}
                                >
                                  <p className="strongs-entry-meta">
                                    {match.label}
                                    {match.ref !== match.label ? ` (${match.ref})` : ""}
                                  </p>
                                  <p className="strongs-entry-copy strongs-entry-fathers-greek">
                                    {match.greek}
                                  </p>
                                  <p className="strongs-entry-copy strongs-entry-fathers-english">
                                    {match.english}
                                  </p>
                                </article>
                              ))}
                            </div>
                          </section>
                        ))
                      ) : (
                        <p className="strongs-entry-copy">
                          No Apostolic Fathers matches found for this lemma.
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
