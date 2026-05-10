"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekGrammarDetailsContent } from "@/app/components/GreekGrammarCard";
import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getGreekVerseOccurrences } from "@/lib/bible/greek";
import type { BibleSearchVerseEntry } from "@/lib/bible/types";

const MAX_EXACT_FORM_VERSES = 25;

type ExactFormVerseState = {
  status: "idle" | "loading" | "loaded";
  matches: BibleSearchVerseEntry[];
};

export function ReaderGreekGrammarPanel() {
  const {
    activeGreekGrammarSelection,
    openGreekDictionaryInCurrentPane
  } = useReaderWorkspace();
  const [exactFormVerses, setExactFormVerses] = useState<ExactFormVerseState>({
    status: "idle",
    matches: []
  });

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

  const visibleExactFormVerses = useMemo(
    () => exactFormVerses.matches.slice(0, MAX_EXACT_FORM_VERSES),
    [exactFormVerses.matches]
  );

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
        {activeGreekGrammarSelection.selectedForm ? (
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
            {exactFormVerses.status === "loading" ? (
              <p className="strongs-entry-meta">Loading Bible verses with this form…</p>
            ) : null}
            {exactFormVerses.status === "loaded" && exactFormVerses.matches.length === 0 ? (
              <p className="strongs-entry-copy">No Bible verses found with this exact form.</p>
            ) : null}
            {exactFormVerses.status === "loaded" && exactFormVerses.matches.length > MAX_EXACT_FORM_VERSES ? (
              <p className="strongs-entry-meta">
                Showing first {MAX_EXACT_FORM_VERSES} of {exactFormVerses.matches.length}
              </p>
            ) : null}
            {visibleExactFormVerses.length > 0 ? (
              <div className="strongs-entry-bible-verses">
                {visibleExactFormVerses.map((match) => (
                  <article
                    className="strongs-entry-bible-verse"
                    key={`${activeGreekGrammarSelection.entryKey}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                  >
                    <p className="strongs-entry-meta">
                      {match.bookName} {match.chapterNumber}:{match.verseNumber}
                    </p>
                    <GreekVerseTextContent
                      className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-greek"
                      enableGreekLearning={false}
                      highlightedEntryKey={activeGreekGrammarSelection.entryKey}
                      onOpenGreekDictionary={openGreekDictionaryInCurrentPane}
                      verse={{
                        number: match.verseNumber,
                        text: match.text,
                        greekTokens: match.greekTokens
                      }}
                    />
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
        <div className="greek-grammar-panel-section">
          <p className="strongs-entry-section-label">Grammar</p>
          <div className="greek-grammar-panel-expanded">
            <GreekGrammarDetailsContent grammar={grammar} />
          </div>
        </div>
      </article>
    </div>
  );
}
