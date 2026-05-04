"use client";

import { useMemo } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS,
  GREEK_SECOND_DECLENSION_ROW_LABELS,
  getGreekSecondDeclensionDefiniteArticleChart,
  getGreekSecondDeclensionChart
} from "@/lib/bible/greek-grammar-charts";

function formatChartGenderLabel(gender: "masculine" | "neuter") {
  return gender === "masculine" ? "Masculine" : "Neuter";
}

export function ReaderGrammarChartsPanel() {
  const { activeGreekGrammarChartSelection } = useReaderWorkspace();
  const chart = useMemo(
    () =>
      activeGreekGrammarChartSelection
        ? getGreekSecondDeclensionChart(activeGreekGrammarChartSelection)
        : null,
    [activeGreekGrammarChartSelection]
  );
  const definiteArticleChart = useMemo(
    () =>
      activeGreekGrammarChartSelection
        ? getGreekSecondDeclensionDefiniteArticleChart(activeGreekGrammarChartSelection)
        : null,
    [activeGreekGrammarChartSelection]
  );

  if (!activeGreekGrammarChartSelection) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">
          Open a Greek noun and choose its chart to view declension endings here.
        </p>
      </div>
    );
  }

  return (
    <section className="reader-grammar-chart-panel">
      <article className="strongs-entry-card reader-grammar-chart-card">
        <div className="reader-grammar-chart-copy">
          <p className="strongs-entry-section-label">Charts</p>
          <h3 className="strongs-entry-lemma reader-grammar-chart-title">
            {chart?.title ?? "2nd Declension Noun Chart"}
          </h3>
          <p className="strongs-entry-meta">
            {[
              `Lemma: ${activeGreekGrammarChartSelection.lemma}`,
              activeGreekGrammarChartSelection.selectedForm
                ? `Selected form: ${activeGreekGrammarChartSelection.selectedForm}`
                : null,
              activeGreekGrammarChartSelection.selectedFormDecodedMorphology ??
                activeGreekGrammarChartSelection.selectedFormMorphology ??
                null
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {chart?.status === "supported" ? (
            <p className="strongs-entry-meta">
              Gender: {formatChartGenderLabel(chart.gender)}
            </p>
          ) : null}
        </div>
        {chart?.status === "supported" ? (
          <div className="reader-grammar-chart-stack">
            <div className="reader-grammar-chart-section">
              <div className="reader-grammar-chart-table-wrap">
                <table
                  aria-label="2nd Declension Noun Chart"
                  className="reader-grammar-chart-table"
                >
                  <thead>
                    <tr>
                      <th scope="col">Case</th>
                      <th
                        className={
                          chart.highlightedNumber === "singular"
                            ? "is-active-number"
                            : undefined
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
                    {GREEK_SECOND_DECLENSION_ROW_LABELS.map((label, index) => {
                      const isActiveRow = chart.highlightedRowIndex === index;

                      return (
                        <tr
                          className={isActiveRow ? "is-active-row" : undefined}
                          key={`${label}:${chart.gender}`}
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
            {definiteArticleChart ? (
              <div className="reader-grammar-chart-section">
                <div className="reader-grammar-chart-copy">
                  <h4 className="reader-grammar-chart-subtitle">
                    {definiteArticleChart.title}
                  </h4>
                  <p className="strongs-entry-meta">
                    Example noun: {definiteArticleChart.baseNoun} ({definiteArticleChart.meaning})
                  </p>
                </div>
                <div className="reader-grammar-chart-table-wrap">
                  <table
                    aria-label="Definite Articles Chart"
                    className="reader-grammar-chart-table"
                  >
                    <thead>
                      <tr>
                        <th scope="col">Case</th>
                        <th scope="col">Function</th>
                        <th
                          className={
                            definiteArticleChart.highlightedNumber === "singular"
                              ? "is-active-number"
                              : undefined
                          }
                          scope="col"
                        >
                          Singular
                        </th>
                        <th
                          className={
                            definiteArticleChart.highlightedNumber === "plural"
                              ? "is-active-number"
                              : undefined
                          }
                          scope="col"
                        >
                          Plural
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {definiteArticleChart.forms.map((form, index) => {
                        const isActiveRow = definiteArticleChart.highlightedRowIndex === index;

                        return (
                          <tr
                            className={isActiveRow ? "is-active-row" : undefined}
                            key={`${definiteArticleChart.gender}:${form.case}`}
                          >
                            <th scope="row">
                              {GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS[index]}
                            </th>
                            <td>{form.function}</td>
                            <td
                              className={
                                isActiveRow &&
                                definiteArticleChart.highlightedNumber === "singular"
                                  ? "is-active-cell"
                                  : undefined
                              }
                            >
                              <span className="reader-grammar-chart-combined">
                                {form.singular.combined}
                              </span>
                            </td>
                            <td
                              className={
                                isActiveRow &&
                                definiteArticleChart.highlightedNumber === "plural"
                                  ? "is-active-cell"
                                  : undefined
                              }
                            >
                              <span className="reader-grammar-chart-combined">
                                {form.plural.combined}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="reader-grammar-chart-examples">
                  <p className="strongs-entry-section-label-subtle">Examples</p>
                  {definiteArticleChart.examples.map((example) => (
                    <div className="reader-grammar-chart-example" key={example.greek}>
                      <p className="strongs-entry-copy reader-grammar-chart-example-greek">
                        {example.greek}
                      </p>
                      <p className="strongs-entry-meta">{example.english}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="strongs-entry-copy">{chart?.message}</p>
        )}
      </article>
    </section>
  );
}
