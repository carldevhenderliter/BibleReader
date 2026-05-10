"use client";

import { GreekGrammarDetailsContent } from "@/app/components/GreekGrammarCard";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function ReaderGreekGrammarPanel() {
  const {
    activeGreekGrammarSelection,
    openGreekDictionaryInCurrentPane
  } = useReaderWorkspace();

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
