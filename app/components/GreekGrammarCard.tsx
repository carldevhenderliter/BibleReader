"use client";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { GreekDictionarySelection, GreekGrammarInfo } from "@/lib/bible/types";

type GreekGrammarCardProps = {
  grammar: GreekGrammarInfo;
  selection: GreekDictionarySelection;
};

function hasExpandedContent(grammar: GreekGrammarInfo) {
  return (
    Boolean(grammar.expandedInfo.fullMorphology) ||
    grammar.expandedInfo.functionHints.length > 0 ||
    Boolean(grammar.expandedInfo.paradigmPattern) ||
    grammar.expandedInfo.exampleForms.length > 0 ||
    Boolean(grammar.expandedInfo.linkedPhrase) ||
    grammar.expandedInfo.details.length > 0
  );
}

export function GreekGrammarDetailsContent({
  grammar
}: {
  grammar: GreekGrammarInfo;
}) {
  return (
    <div className="greek-grammar-card-expanded">
      {grammar.expandedInfo.fullMorphology ? (
        <div className="greek-grammar-card-section">
          <p className="greek-grammar-card-section-label">Full morphology</p>
          <p className="greek-grammar-card-copy">{grammar.expandedInfo.fullMorphology}</p>
        </div>
      ) : null}
      {grammar.expandedInfo.functionHints.length > 0 ? (
        <div className="greek-grammar-card-section">
          <p className="greek-grammar-card-section-label">Function hints</p>
          <div className="greek-grammar-card-list">
            {grammar.expandedInfo.functionHints.map((hint) => (
              <p className="greek-grammar-card-copy" key={hint}>
                {hint}
              </p>
            ))}
          </div>
        </div>
      ) : null}
      {grammar.expandedInfo.paradigmPattern ? (
        <div className="greek-grammar-card-section">
          <p className="greek-grammar-card-section-label">Paradigm pattern</p>
          <p className="greek-grammar-card-copy">{grammar.expandedInfo.paradigmPattern}</p>
        </div>
      ) : null}
      {grammar.expandedInfo.exampleForms.length > 0 ? (
        <div className="greek-grammar-card-section">
          <p className="greek-grammar-card-section-label">Example forms</p>
          <p className="greek-grammar-card-copy">
            {grammar.expandedInfo.exampleForms.join(" · ")}
          </p>
        </div>
      ) : null}
      {grammar.expandedInfo.linkedPhrase ? (
        <div className="greek-grammar-card-section greek-grammar-card-phrase">
          <p className="greek-grammar-card-section-label">Linked phrase</p>
          <p className="greek-grammar-card-greek" lang="el">
            {grammar.expandedInfo.linkedPhrase.combined}
          </p>
          <p className="greek-grammar-card-copy">
            {[
              grammar.expandedInfo.linkedPhrase.sharedGender,
              grammar.expandedInfo.linkedPhrase.sharedNumber,
              grammar.expandedInfo.linkedPhrase.sharedCase
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
          {grammar.expandedInfo.linkedPhrase.functionHint ? (
            <p className="greek-grammar-card-copy">
              {grammar.expandedInfo.linkedPhrase.functionHint}
            </p>
          ) : null}
          {grammar.expandedInfo.linkedPhrase.example ? (
            <p className="greek-grammar-card-copy">
              Example:{" "}
              <span className="greek-grammar-card-greek" lang="el">
                {grammar.expandedInfo.linkedPhrase.example}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}
      {grammar.expandedInfo.details.length > 0 ? (
        <div className="greek-grammar-card-section">
          <p className="greek-grammar-card-section-label">Grammar details</p>
          <div className="greek-grammar-card-details">
            {grammar.expandedInfo.details.map((detail) => (
              <article
                className="greek-grammar-card-detail"
                key={`${detail.group ?? ""}:${detail.label}`}
              >
                <p className="greek-grammar-card-detail-label">{detail.label}</p>
                <p className="greek-grammar-card-copy">{detail.definition}</p>
                {detail.example ? (
                  <p className="greek-grammar-card-copy">{detail.example}</p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function GreekGrammarCard({ grammar, selection }: GreekGrammarCardProps) {
  const { openGreekGrammarDetails } = useReaderWorkspace();
  const canExpand = hasExpandedContent(grammar);

  return (
    <div className="greek-grammar-card">
      <div className="greek-grammar-card-quick">
        {grammar.quickInfo.partOfSpeech ? (
          <p className="greek-grammar-card-kicker">{grammar.quickInfo.partOfSpeech}</p>
        ) : null}
        <p className="greek-grammar-card-line">
          <span className="greek-grammar-card-label">Lemma</span>
          <span className="greek-grammar-card-greek" lang="el">
            {grammar.quickInfo.lemma}
          </span>
        </p>
        {grammar.quickInfo.gloss ? (
          <p className="greek-grammar-card-line">
            <span className="greek-grammar-card-label">Gloss</span>
            <span>{grammar.quickInfo.gloss}</span>
          </p>
        ) : null}
        {grammar.quickInfo.summary ? (
          <p className="greek-grammar-card-line">
            <span className="greek-grammar-card-label">Form</span>
            <span>{grammar.quickInfo.summary}</span>
          </p>
        ) : null}
      </div>
      {canExpand ? (
        <button
          aria-label={`Open grammar details for ${selection.selectedForm ?? selection.lemma}`}
          className="greek-grammar-card-toggle"
          onClick={() => openGreekGrammarDetails({ ...selection, grammar })}
          type="button"
        >
          More
        </button>
      ) : null}
    </div>
  );
}
