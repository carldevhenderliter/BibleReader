"use client";

import { useEffect, useMemo, type CSSProperties } from "react";

import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getBibleVersionLabel } from "@/lib/bible/version";
import type {
  BookMeta,
  BundledBibleVersion,
  BundledBookChapterMap,
  BundledChapterMap,
  Chapter,
  ReadingView,
  Verse
} from "@/lib/bible/types";
import { formatBookLabel } from "@/lib/study-workspace";

type ReaderComparePanelProps = {
  book: BookMeta;
  view: ReadingView;
  chaptersByVersion: BundledChapterMap | BundledBookChapterMap;
  focusedChapterNumber?: number | null;
};

type CompareCell = {
  version: BundledBibleVersion;
  verse: Verse | null;
};

type CompareRow = {
  chapterNumber: number;
  number: number;
  cells: CompareCell[];
};

type CompareSection = {
  chapterNumber: number;
  rows: CompareRow[];
};

function buildCompareRows(chapters: Array<Chapter | null>, displayVersions: BundledBibleVersion[]) {
  const verseNumbers = Array.from(
    new Set(
      chapters.reduce<number[]>((numbers, chapter) => {
        for (const verse of chapter?.verses ?? []) {
          numbers.push(verse.number);
        }

        return numbers;
      }, [])
    )
  ).sort((left, right) => left - right);

  return verseNumbers.map((number) => ({
    number,
    cells: displayVersions.map((candidate, index) => ({
      version: candidate,
      verse: chapters[index]?.verses.find((verse) => verse.number === number) ?? null
    }))
  }));
}

export function ReaderComparePanel({
  book,
  view,
  chaptersByVersion,
  focusedChapterNumber = null
}: ReaderComparePanelProps) {
  const { version } = useReaderVersion();
  const {
    activeStudyVerseNumber,
    compareVersions,
    openStrongs,
    setCompareVersions,
    setCompareVersionAtIndex
  } = useReaderWorkspace();

  const availableVersionOptions = useMemo(() => {
    if (view === "chapter") {
      const chapterMap = chaptersByVersion as BundledChapterMap;
      return ([version, ...Object.keys(chapterMap)] as BundledBibleVersion[]).filter(
        (candidate, index, versions) =>
          versions.indexOf(candidate) === index && Boolean(chapterMap[candidate])
      );
    }

    const bookMap = chaptersByVersion as BundledBookChapterMap;
    return ([version, ...Object.keys(bookMap)] as BundledBibleVersion[]).filter(
      (candidate, index, versions) =>
        versions.indexOf(candidate) === index && Boolean(bookMap[candidate]?.length)
    );
  }, [chaptersByVersion, version, view]);

  const compareVersionOptions = useMemo(
    () =>
      availableVersionOptions.filter((candidate) => candidate !== version),
    [availableVersionOptions, version]
  );
  const availableVersions = useMemo(
    () =>
      [version, ...compareVersions].filter(
        (candidate, index, versions) =>
          versions.indexOf(candidate) === index &&
          (candidate === version || compareVersionOptions.includes(candidate))
      ),
    [compareVersionOptions, compareVersions, version]
  );
  const compareSelectors = useMemo(() => {
    const selected = compareVersions
      .filter((candidate) => compareVersionOptions.includes(candidate))
      .slice(0, compareVersionOptions.length);

    if (selected.length > 0) {
      return selected;
    }

    return compareVersionOptions.slice(0, Math.min(2, compareVersionOptions.length));
  }, [compareVersionOptions, compareVersions]);
  const canAddMoreComparisons = compareSelectors.length < compareVersionOptions.length;

  const compareSections = useMemo<CompareSection[]>(() => {
    if (availableVersions.length < 2) {
      return [];
    }

    if (view === "chapter") {
      const chapterMap = chaptersByVersion as BundledChapterMap;
      const chapterEntries = availableVersions.map((candidate) => chapterMap[candidate] ?? null);
      const chapterNumber = chapterEntries.find(Boolean)?.chapterNumber ?? focusedChapterNumber ?? 1;

      return [
        {
          chapterNumber,
          rows: buildCompareRows(chapterEntries, availableVersions).map((row) => ({
            ...row,
            chapterNumber
          }))
        }
      ];
    }

    const bookMap = chaptersByVersion as BundledBookChapterMap;
    const chapterNumbers = Array.from(
      new Set(
        availableVersions.reduce<number[]>((numbers, candidate) => {
          for (const chapter of bookMap[candidate] ?? []) {
            numbers.push(chapter.chapterNumber);
          }

          return numbers;
        }, [])
      )
    ).sort((left, right) => left - right);

    return chapterNumbers.map((chapterNumber) => {
      const chapterEntries = availableVersions.map(
        (candidate) =>
          bookMap[candidate]?.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null
      );

      return {
        chapterNumber,
        rows: buildCompareRows(chapterEntries, availableVersions).map((row) => ({
          ...row,
          chapterNumber
        }))
      };
    });
  }, [availableVersions, chaptersByVersion, focusedChapterNumber, view]);

  useEffect(() => {
    if (view !== "book" || !focusedChapterNumber) {
      return;
    }

    const element = document.getElementById(`compare-chapter-${book.slug}-${focusedChapterNumber}`);
    element?.scrollIntoView?.({ block: "start" });
  }, [book.slug, focusedChapterNumber, view]);

  if (availableVersions.length < 2 || compareSections.length === 0) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">
          Compare mode needs at least two bundled versions for this passage.
        </p>
      </div>
    );
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns: `4.5rem repeat(${availableVersions.length}, minmax(22rem, max-content))`
  };

  return (
    <div className="reader-compare-panel" role="tabpanel">
      <div className="reader-compare-header">
        <div>
          <p className="search-tray-kicker">Parallel Compare</p>
          <h3 className="search-tray-title">
            {view === "chapter"
              ? `${formatBookLabel(book.slug)} ${compareSections[0]?.chapterNumber ?? 1}`
              : formatBookLabel(book.slug)}
          </h3>
        </div>
        <div className="reader-compare-selectors">
          {compareSelectors.map((selectedVersion, index) => {
            const removeLabel = `Remove ${getBibleVersionLabel(selectedVersion)} from compare`;

            return (
              <div className="reader-compare-selector-row" key={`compare-version-select-${index}`}>
                <label
                  className="reader-settings-field reader-compare-select"
                  htmlFor={`compare-version-select-${index}`}
                >
                  <span>{index === 0 ? "Compare with" : `Also compare ${index + 1}`}</span>
                  <select
                    aria-label={index === 0 ? "Compare with version" : `Also compare with version ${index + 1}`}
                    id={`compare-version-select-${index}`}
                    onChange={(event) =>
                      setCompareVersionAtIndex(index, event.target.value as BundledBibleVersion)
                    }
                    value={selectedVersion}
                  >
                    {compareVersionOptions.map((candidate) => (
                      <option key={candidate} value={candidate}>
                        {getBibleVersionLabel(candidate)}
                      </option>
                    ))}
                  </select>
                </label>
                {compareSelectors.length > 1 ? (
                  <button
                    aria-label={removeLabel}
                    className="reader-inline-button reader-compare-remove"
                    onClick={() =>
                      setCompareVersions(
                        compareSelectors.filter((_, compareIndex) => compareIndex !== index)
                      )
                    }
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            );
          })}
          {canAddMoreComparisons ? (
            <button
              className="reader-inline-button reader-compare-add"
              onClick={() => {
                const nextCandidate = compareVersionOptions.find(
                  (candidate) => !compareSelectors.includes(candidate)
                );

                if (!nextCandidate) {
                  return;
                }

                setCompareVersions([...compareSelectors, nextCandidate]);
              }}
              type="button"
            >
              Add translation
            </button>
          ) : null}
        </div>
      </div>

      {compareSections.map((section) => (
        <section
          className="reader-compare-section"
          id={`compare-chapter-${book.slug}-${section.chapterNumber}`}
          key={section.chapterNumber}
        >
          {view === "book" ? (
            <div className="reader-compare-section-header">
              <h4>Chapter {section.chapterNumber}</h4>
            </div>
          ) : null}
          <div className="reader-compare-scroll" aria-label="Parallel translation comparison">
            <div className="reader-compare-columns">
              <header className="reader-compare-columns-header" style={gridStyle}>
                <span>Verse</span>
                {availableVersions.map((candidate) => (
                  <span key={`compare-column-${section.chapterNumber}-${candidate}`}>
                    {getBibleVersionLabel(candidate)}
                  </span>
                ))}
              </header>
              <div className="reader-compare-rows">
                {section.rows.map((row) => (
                  <article
                    className={`reader-compare-row${
                      activeStudyVerseNumber === row.number &&
                      (view === "chapter" || section.chapterNumber === focusedChapterNumber)
                        ? " is-active"
                        : ""
                    }`}
                    key={`${section.chapterNumber}:${row.number}`}
                    style={gridStyle}
                  >
                    <span className="reader-compare-verse-number">{row.number}</span>
                    {row.cells.map((cell) => {
                      const showStrongs = cell.version === "kjv" && Boolean(cell.verse?.tokens?.length);

                      return (
                        <div className="reader-compare-cell" key={`${section.chapterNumber}:${row.number}:${cell.version}`}>
                          <span className="reader-compare-cell-version">
                            {getBibleVersionLabel(cell.version)}
                          </span>
                          <VerseTextContent
                            className={`verse-text${showStrongs ? " verse-text-rich" : ""} reader-compare-text`}
                            onOpenStrongs={(strongsNumbers) =>
                              openStrongs(strongsNumbers, strongsNumbers.join(" "))
                            }
                            showStrongs={showStrongs}
                            verse={cell.verse}
                          />
                        </div>
                      );
                    })}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
