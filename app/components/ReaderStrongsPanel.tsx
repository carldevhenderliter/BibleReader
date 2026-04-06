"use client";

import { useEffect, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getStrongsEntries } from "@/lib/bible/strongs";
import type { StrongsEntry } from "@/lib/bible/types";

export function ReaderStrongsPanel() {
  const { activeStrongsLabel, activeStrongsNumbers } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeStrongsNumbers.length === 0) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

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
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
