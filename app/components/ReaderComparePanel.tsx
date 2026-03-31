"use client";

import { useMemo } from "react";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getBibleVersionLabel, getInstalledBundledBibleVersions } from "@/lib/bible/version";
import { formatBookLabel } from "@/lib/study-workspace";

export function ReaderComparePanel() {
  const { version } = useReaderVersion();
  const {
    activeStudyVerseNumber,
    compareVersion,
    currentChapterByVersion,
    currentPassage,
    setCompareVersion
  } = useReaderWorkspace();

  const compareRows = useMemo(() => {
    if (!currentChapterByVersion) {
      return [];
    }

    const primaryChapter = currentChapterByVersion[version];
    const secondaryChapter = currentChapterByVersion[compareVersion];

    if (!primaryChapter || !secondaryChapter) {
      return [];
    }

    const verseNumbers = Array.from(
      new Set([
        ...primaryChapter.verses.map((verse) => verse.number),
        ...secondaryChapter.verses.map((verse) => verse.number)
      ])
    ).sort((left, right) => left - right);

    return verseNumbers.map((number) => ({
      number,
      primaryText: primaryChapter.verses.find((verse) => verse.number === number)?.text ?? "",
      secondaryText: secondaryChapter.verses.find((verse) => verse.number === number)?.text ?? ""
    }));
  }, [compareVersion, currentChapterByVersion, version]);

  const compareVersionOptions = useMemo(
    () =>
      getInstalledBundledBibleVersions().filter(
        (candidate) => candidate !== version && Boolean(currentChapterByVersion?.[candidate])
      ),
    [currentChapterByVersion, version]
  );

  if (
    !currentPassage ||
    currentPassage.view !== "chapter" ||
    !currentChapterByVersion ||
    compareVersionOptions.length === 0
  ) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">
          Compare mode is available in chapter view. Open a chapter and this pane will line up the
          current passage with another bundled translation.
        </p>
      </div>
    );
  }

  return (
    <div className="reader-compare-panel" role="tabpanel">
      <div className="reader-compare-header">
        <div>
          <p className="search-tray-kicker">Parallel Compare</p>
          <h3 className="search-tray-title">
            {formatBookLabel(currentPassage.bookSlug)} {currentPassage.chapterNumber}
          </h3>
        </div>
        <label className="reader-settings-field reader-compare-select" htmlFor="compare-version-select">
          <span>Compare with</span>
          <select
            aria-label="Compare with version"
            id="compare-version-select"
            onChange={(event) => setCompareVersion(event.target.value as typeof compareVersion)}
            value={compareVersion}
          >
            {compareVersionOptions.map((candidate) => (
              <option key={candidate} value={candidate}>
                {getBibleVersionLabel(candidate)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="reader-compare-columns" aria-label="Parallel translation comparison">
        <header className="reader-compare-columns-header">
          <span>{getBibleVersionLabel(version)}</span>
          <span>{getBibleVersionLabel(compareVersion)}</span>
        </header>
        <div className="reader-compare-rows">
          {compareRows.map((row) => (
            <article
              className={`reader-compare-row${
                activeStudyVerseNumber === row.number ? " is-active" : ""
              }`}
              key={row.number}
            >
              <span className="reader-compare-verse-number">{row.number}</span>
              <p>{row.primaryText}</p>
              <p>{row.secondaryText}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
