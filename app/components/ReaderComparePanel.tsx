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
    new Set(chapters.flatMap((chapter) => chapter?.verses.map((verse) => verse.number) ?? []))
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
    setCompareVersionAtIndex
  } = useReaderWorkspace();

  const availableVersions = useMemo(() => {
    if (view === "chapter") {
      const chapterMap = chaptersByVersion as BundledChapterMap;
      return [version, ...compareVersions].filter(
        (candidate, index, versions) =>
          versions.indexOf(candidate) === index && Boolean(chapterMap[candidate])
      );
    }

    const bookMap = chaptersByVersion as BundledBookChapterMap;
    return [version, ...compareVersions].filter(
      (candidate, index, versions) =>
        versions.indexOf(candidate) === index && Boolean(bookMap[candidate]?.length)
    );
  }, [chaptersByVersion, compareVersions, version, view]);

  const compareVersionOptions = useMemo(
    () =>
      availableVersions.filter((candidate) => candidate !== version),
    [availableVersions, version]
  );
  const compareSelectors = useMemo(() => {
    const selected = compareVersions
      .filter((candidate) => compareVersionOptions.includes(candidate))
      .slice(0, Math.min(2, compareVersionOptions.length));

    if (selected.length > 0) {
      return selected;
    }

    return compareVersionOptions.slice(0, Math.min(2, compareVersionOptions.length));
  }, [compareVersionOptions, compareVersions]);

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
        availableVersions.flatMap(
          (candidate) => bookMap[candidate]?.map((chapter) => chapter.chapterNumber) ?? []
        )
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
    gridTemplateColumns: `auto repeat(${availableVersions.length}, minmax(0, 1fr))`
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
            const options = compareVersionOptions.filter(
              (candidate) =>
                candidate === selectedVersion ||
                !compareSelectors.some((value, valueIndex) => valueIndex !== index && value === candidate)
            );

            return (
              <label
                className="reader-settings-field reader-compare-select"
                htmlFor={`compare-version-select-${index}`}
                key={`compare-version-select-${index}`}
              >
                <span>{index === 0 ? "Compare with" : "Also compare"}</span>
                <select
                  aria-label={index === 0 ? "Compare with version" : "Also compare with version"}
                  id={`compare-version-select-${index}`}
                  onChange={(event) =>
                    setCompareVersionAtIndex(index, event.target.value as BundledBibleVersion)
                  }
                  value={selectedVersion}
                >
                  {options.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {getBibleVersionLabel(candidate)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
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
          <div className="reader-compare-columns" aria-label="Parallel translation comparison">
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
        </section>
      ))}
    </div>
  );
}
