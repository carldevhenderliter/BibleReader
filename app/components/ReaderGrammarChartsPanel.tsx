"use client";

import { useMemo } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS,
  GREEK_SECOND_DECLENSION_ROW_LABELS,
  getGreekSecondDeclensionChartByGender,
  getGreekSecondDeclensionDefiniteArticleChartByGender,
  type GreekSecondDeclensionGender
} from "@/lib/bible/greek-grammar-charts";

const GENDERS: GreekSecondDeclensionGender[] = ["masculine", "neuter"];

function formatChartGenderLabel(gender: GreekSecondDeclensionGender) {
  return gender === "masculine" ? "Masculine" : "Neuter";
}

function NounChartTable({
  gender,
  selection
}: {
  gender: GreekSecondDeclensionGender;
  selection:
    | {
        entryKey: string;
        strongs: string | null;
        lemma: string;
        label: string | null;
        selectedForm: string | null;
        selectedFormMorphology: string | null;
        selectedFormDecodedMorphology: string | null;
      }
    | null;
}) {
  const chart = useMemo(
    () => getGreekSecondDeclensionChartByGender(gender, selection),
    [gender, selection]
  );

  return (
    <div className="reader-grammar-chart-section">
      <div className="reader-grammar-chart-copy">
        <h3 className="strongs-entry-lemma reader-grammar-chart-title">
          {chart.title}
        </h3>
        <p className="strongs-entry-meta">Gender: {formatChartGenderLabel(chart.gender)}</p>
      </div>
      <div className="reader-grammar-chart-table-wrap">
        <table aria-label={`${formatChartGenderLabel(gender)} 2nd Declension Noun Chart`} className="reader-grammar-chart-table">
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th
                className={chart.highlightedNumber === "singular" ? "is-active-number" : undefined}
                scope="col"
              >
                Singular
              </th>
              <th
                className={chart.highlightedNumber === "plural" ? "is-active-number" : undefined}
                scope="col"
              >
                Plural
              </th>
            </tr>
          </thead>
          <tbody>
            {GREEK_SECOND_DECLENSION_ROW_LABELS.map((label, index) => {
              const isActiveRow = chart.highlightedRowIndex === index;

              return (
                <tr className={isActiveRow ? "is-active-row" : undefined} key={`${gender}:${label}`}>
                  <th scope="row">{label}</th>
                  <td
                    className={
                      isActiveRow && chart.highlightedNumber === "singular"
                        ? "is-active-cell"
                        : undefined
                    }
                  >
                    {chart.singular[index]}
                  </td>
                  <td
                    className={
                      isActiveRow && chart.highlightedNumber === "plural"
                        ? "is-active-cell"
                        : undefined
                    }
                  >
                    {chart.plural[index]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArticleChartTable({
  gender,
  selection
}: {
  gender: GreekSecondDeclensionGender;
  selection:
    | {
        entryKey: string;
        strongs: string | null;
        lemma: string;
        label: string | null;
        selectedForm: string | null;
        selectedFormMorphology: string | null;
        selectedFormDecodedMorphology: string | null;
      }
    | null;
}) {
  const chart = useMemo(
    () => getGreekSecondDeclensionDefiniteArticleChartByGender(gender, selection),
    [gender, selection]
  );

  return (
    <div className="reader-grammar-chart-section">
      <div className="reader-grammar-chart-copy">
        <h4 className="reader-grammar-chart-subtitle">{chart.title}</h4>
        <p className="strongs-entry-meta">
          {formatChartGenderLabel(chart.gender)} example noun: {chart.baseNoun} ({chart.meaning})
        </p>
      </div>
      <div className="reader-grammar-chart-table-wrap">
        <table aria-label={`${formatChartGenderLabel(gender)} Definite Articles Chart`} className="reader-grammar-chart-table">
          <thead>
            <tr>
              <th scope="col">Case</th>
              <th scope="col">Function</th>
              <th
                className={chart.highlightedNumber === "singular" ? "is-active-number" : undefined}
                scope="col"
              >
                Singular
              </th>
              <th
                className={chart.highlightedNumber === "plural" ? "is-active-number" : undefined}
                scope="col"
              >
                Plural
              </th>
            </tr>
          </thead>
          <tbody>
            {chart.forms.map((form, index) => {
              const isActiveRow = chart.highlightedRowIndex === index;

              return (
                <tr className={isActiveRow ? "is-active-row" : undefined} key={`${gender}:${form.case}`}>
                  <th scope="row">{GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS[index]}</th>
                  <td>{form.function}</td>
                  <td
                    className={
                      isActiveRow && chart.highlightedNumber === "singular"
                        ? "is-active-cell"
                        : undefined
                    }
                  >
                    <span className="reader-grammar-chart-combined">{form.singular.combined}</span>
                  </td>
                  <td
                    className={
                      isActiveRow && chart.highlightedNumber === "plural"
                        ? "is-active-cell"
                        : undefined
                    }
                  >
                    <span className="reader-grammar-chart-combined">{form.plural.combined}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="reader-grammar-chart-examples">
        <p className="strongs-entry-section-label-subtle">Examples</p>
        {chart.examples.map((example) => (
          <div className="reader-grammar-chart-example" key={`${gender}:${example.greek}`}>
            <p className="strongs-entry-copy reader-grammar-chart-example-greek">{example.greek}</p>
            <p className="strongs-entry-meta">{example.english}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReaderGrammarChartsPanel() {
  const { activeGreekGrammarChartSelection, activeGreekSelection } = useReaderWorkspace();
  const resolvedChartSelection = useMemo(
    () =>
      activeGreekGrammarChartSelection ??
      (activeGreekSelection
        ? {
            entryKey: activeGreekSelection.entryKey,
            strongs: activeGreekSelection.strongs ?? null,
            lemma: activeGreekSelection.lemma,
            label: activeGreekSelection.label ?? null,
            selectedForm: activeGreekSelection.selectedForm ?? null,
            selectedFormMorphology: activeGreekSelection.selectedFormMorphology ?? null,
            selectedFormDecodedMorphology:
              activeGreekSelection.selectedFormDecodedMorphology ?? null
          }
        : null),
    [activeGreekGrammarChartSelection, activeGreekSelection]
  );

  return (
    <section className="reader-grammar-chart-panel">
      <article className="strongs-entry-card reader-grammar-chart-card">
        <div className="reader-grammar-chart-copy">
          <p className="strongs-entry-section-label">Charts</p>
          <h2 className="strongs-entry-lemma reader-grammar-chart-title">Greek Charts</h2>
          {resolvedChartSelection ? (
            <p className="strongs-entry-meta">
              {[
                `Current lemma: ${resolvedChartSelection.lemma}`,
                resolvedChartSelection.selectedForm
                  ? `Selected form: ${resolvedChartSelection.selectedForm}`
                  : null,
                resolvedChartSelection.selectedFormDecodedMorphology ??
                  resolvedChartSelection.selectedFormMorphology ??
                  null
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : (
            <p className="strongs-entry-meta">
              All available charts are shown below.
            </p>
          )}
        </div>
        <div className="reader-grammar-chart-stack">
          {GENDERS.map((gender) => (
            <div className="reader-grammar-chart-group" key={gender}>
              <NounChartTable gender={gender} selection={resolvedChartSelection} />
              <ArticleChartTable gender={gender} selection={resolvedChartSelection} />
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
