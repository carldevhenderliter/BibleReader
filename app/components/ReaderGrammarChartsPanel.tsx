"use client";

import { useEffect, useMemo, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  GREEK_CHART_TAB_OPTIONS,
  GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS,
  GREEK_SECOND_DECLENSION_ROW_LABELS,
  getDefaultGreekChartTab,
  getGreekSecondDeclensionChartByGender,
  getGreekSecondDeclensionDefiniteArticleChartByGender,
  getGreekVerbCharts,
  type GreekChartTabKey,
  type GreekSecondDeclensionGender
} from "@/lib/bible/greek-grammar-charts";
import type { GreekGrammarChartSelection } from "@/lib/bible/types";

const GENDERS: GreekSecondDeclensionGender[] = ["masculine", "neuter"];
const VERB_PERSON_ROW_LABELS = ["1st Person", "2nd Person", "3rd Person"] as const;

function formatChartGenderLabel(gender: GreekSecondDeclensionGender) {
  return gender === "masculine" ? "Masculine" : "Neuter";
}

function NounChartTable({
  gender,
  selection
}: {
  gender: GreekSecondDeclensionGender;
  selection: GreekGrammarChartSelection | null;
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
  selection: GreekGrammarChartSelection | null;
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

function VerbChartTable({
  selection
}: {
  selection: GreekGrammarChartSelection | null;
}) {
  const charts = useMemo(() => getGreekVerbCharts(selection), [selection]);
  const hasSelectedChart = charts.some((chart) => chart.isSelectedChart);

  return (
    <div className="reader-grammar-chart-section">
      <div className="reader-grammar-chart-copy">
        <h3 className="strongs-entry-lemma reader-grammar-chart-title">Verb Charts</h3>
        <p className="strongs-entry-meta">
          {hasSelectedChart
            ? "The matching tense, voice, and mood are highlighted below."
            : "Indicative verb charts are shown below."}
        </p>
      </div>
      <div className="reader-grammar-chart-stack">
        {charts.map((chart) => (
          <div className="reader-grammar-chart-section" key={chart.id}>
            <div className="reader-grammar-chart-copy">
              <h4 className="reader-grammar-chart-subtitle">
                {chart.title}
                {chart.isSelectedChart ? " · current form" : ""}
              </h4>
            </div>
            <div className="reader-grammar-chart-table-wrap">
              <table
                aria-label={`${chart.title} Verb Chart`}
                className="reader-grammar-chart-table"
              >
                <thead>
                  <tr>
                    <th scope="col">Person</th>
                    <th
                      className={
                        chart.highlightedNumber === "singular" ? "is-active-number" : undefined
                      }
                      scope="col"
                    >
                      Singular
                    </th>
                    <th
                      className={
                        chart.highlightedNumber === "plural" ? "is-active-number" : undefined
                      }
                      scope="col"
                    >
                      Plural
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {VERB_PERSON_ROW_LABELS.map((label, index) => {
                    const isActiveRow = chart.highlightedRowIndex === index;

                    return (
                      <tr
                        className={isActiveRow ? "is-active-row" : undefined}
                        key={`${chart.id}:${label}`}
                      >
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
        ))}
      </div>
    </div>
  );
}

export function ReaderGrammarChartsPanel() {
  const { activeGreekGrammarChartSelection, activeGreekSelection } = useReaderWorkspace();
  const resolvedChartSelection = useMemo<GreekGrammarChartSelection | null>(
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
  const defaultTab = useMemo(
    () => getDefaultGreekChartTab(resolvedChartSelection),
    [resolvedChartSelection]
  );
  const [activeTab, setActiveTab] = useState<GreekChartTabKey>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

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
        <div className="reader-grammar-chart-tabs" role="tablist" aria-label="Greek chart types">
          {GREEK_CHART_TAB_OPTIONS.map((option) => (
            <button
              aria-controls={`reader-grammar-chart-panel-${option.id}`}
              aria-selected={activeTab === option.id}
              className={`reader-notebook-tab${activeTab === option.id ? " is-active" : ""}`}
              id={`reader-grammar-chart-tab-${option.id}`}
              key={option.id}
              onClick={() => setActiveTab(option.id)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {activeTab === "nouns" ? (
          <div
            aria-labelledby="reader-grammar-chart-tab-nouns"
            className="reader-grammar-chart-stack"
            id="reader-grammar-chart-panel-nouns"
            role="tabpanel"
          >
            {GENDERS.map((gender) => (
              <div className="reader-grammar-chart-group" key={gender}>
                <NounChartTable gender={gender} selection={resolvedChartSelection} />
              </div>
            ))}
          </div>
        ) : null}
        {activeTab === "articles" ? (
          <div
            aria-labelledby="reader-grammar-chart-tab-articles"
            className="reader-grammar-chart-stack"
            id="reader-grammar-chart-panel-articles"
            role="tabpanel"
          >
            {GENDERS.map((gender) => (
              <div className="reader-grammar-chart-group" key={gender}>
                <ArticleChartTable gender={gender} selection={resolvedChartSelection} />
              </div>
            ))}
          </div>
        ) : null}
        {activeTab === "verbs" ? (
          <div
            aria-labelledby="reader-grammar-chart-tab-verbs"
            className="reader-grammar-chart-stack"
            id="reader-grammar-chart-panel-verbs"
            role="tabpanel"
          >
            <VerbChartTable selection={resolvedChartSelection} />
          </div>
        ) : null}
      </article>
    </section>
  );
}
