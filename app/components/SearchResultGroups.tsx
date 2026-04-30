"use client";

import { useEffect, useMemo, useState } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import {
  getStrongsParallelVerseRows,
  normalizeStrongsNumber,
  type StrongsParallelVerseRow
} from "@/lib/bible/strongs";
import type {
  BibleSearchResult,
  BibleSearchResultGroup,
  BundledBibleVersion,
  VerseToken
} from "@/lib/bible/types";
import {
  getBibleVersionLabel,
  getInstalledBundledBibleVersions
} from "@/lib/bible/version";
import { createPassageReference } from "@/lib/study-workspace";

type SearchResultGroupsProps = {
  groups: BibleSearchResultGroup[];
  onSelectResult: (result: BibleSearchResult, groupQuery?: string) => void;
  variant?: "stack" | "panes";
  isSearching?: boolean;
  showStrongsInSearch?: boolean;
};

type SearchResultTab = "definitions" | "verses";

type StrongsExpansionState = {
  status: "loading" | "loaded";
  versionsKey: string;
  rows: StrongsParallelVerseRow[];
};

function getStrongsVerseExpansionKey(
  strongsNumber: string,
  row: Pick<StrongsParallelVerseRow, "bookSlug" | "chapterNumber" | "verseNumber">
) {
  return `${strongsNumber}:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`;
}

function getResultTypeLabel(type: BibleSearchResultGroup["results"][number]["type"]) {
  if (type === "book") {
    return "Book";
  }

  if (type === "chapter") {
    return "Chapter";
  }

  if (type === "range") {
    return "Range";
  }

  if (type === "strongs") {
    return "Strongs";
  }

  if (type === "greek-lemma") {
    return "Greek";
  }

  if (type === "topic") {
    return "Topic";
  }

  if (type === "topic-suggestion") {
    return "Topic";
  }

  return "Verse";
}

function normalizeQueryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStrongsQuery(query: string) {
  const match = query.match(/^(?:strongs\s+)?([hg])\s*0*(\d+)$/i);

  return match ? normalizeStrongsNumber(`${match[1]}${match[2]}`) : null;
}

function tokenMatchesQuery(tokenText: string, queryWords: string[]) {
  const normalizedToken = normalizeQueryValue(tokenText);

  return queryWords.some((word) => word && normalizedToken.includes(word));
}

function getSearchResultTabForResult(result: BibleSearchResult): SearchResultTab {
  return result.type === "strongs" || result.type === "greek-lemma"
    ? "definitions"
    : "verses";
}

function getDefaultSearchResultTab(groups: BibleSearchResultGroup[]): SearchResultTab {
  return groups.some((group) =>
    group.results.some((result) => getSearchResultTabForResult(result) === "definitions")
  )
    ? "definitions"
    : "verses";
}

function getSearchResultTabLabel(tab: SearchResultTab) {
  return tab === "definitions" ? "Definitions" : "Verses";
}

function getSearchResultEmptyMessage(tab: SearchResultTab) {
  return tab === "definitions"
    ? "No definition matches for this query."
    : "No verse matches for this query.";
}

function getVersionsKey(versions: readonly BundledBibleVersion[]) {
  return versions.join("|");
}

function getNextSelectedVersions(
  selectedVersions: readonly BundledBibleVersion[],
  toggledVersion: BundledBibleVersion
): BundledBibleVersion[] {
  if (selectedVersions.includes(toggledVersion)) {
    if (selectedVersions.length === 1) {
      return [...selectedVersions];
    }

    return selectedVersions.filter((version) => version !== toggledVersion);
  }

  return [...selectedVersions, toggledVersion];
}

function SearchVersePreview({
  preview,
  query,
  tokens,
  showStrongsInSearch = false,
  mode = "query"
}: {
  preview: string;
  query: string;
  tokens?: VerseToken[];
  showStrongsInSearch?: boolean;
  mode?: "query" | "allStrongs";
}) {
  if (!showStrongsInSearch || !tokens?.length) {
    return <span className="search-result-preview">{preview}</span>;
  }

  const strongsQuery = parseStrongsQuery(query);
  const queryWords = strongsQuery ? [] : normalizeQueryValue(query).split(" ").filter(Boolean);
  const hasAnnotatedMatch = tokens.some((token) =>
    mode === "allStrongs"
      ? (token.strongsNumbers ?? []).length > 0
      : strongsQuery
        ? (token.strongsNumbers ?? []).some(
            (value) => normalizeStrongsNumber(value) === strongsQuery
          )
        : tokenMatchesQuery(token.text, queryWords)
  );

  if (!hasAnnotatedMatch) {
    return <span className="search-result-preview">{preview}</span>;
  }

  return (
    <span className="search-result-preview search-result-preview-rich">
      {tokens.map((token, index) => {
        const matchingStrongs =
          mode === "allStrongs"
            ? token.strongsNumbers ?? []
            : strongsQuery
              ? (token.strongsNumbers ?? []).filter(
                  (value) => normalizeStrongsNumber(value) === strongsQuery
                )
              : tokenMatchesQuery(token.text, queryWords)
                ? token.strongsNumbers ?? []
                : [];

        return (
          <span className="search-preview-token" key={`${index}:${token.text}`}>
            <span className="search-preview-token-text">{token.text}</span>
            {matchingStrongs.length ? (
              <span className="search-preview-strongs">
                {Array.from(
                  new Set(
                    matchingStrongs.map((value) => normalizeStrongsNumber(value))
                  )
                ).join(" ")}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function SearchTopicVerseButton({
  query,
  verse,
  onSelectResult,
  onCompareResult,
  onSaveReference,
  showStrongsInSearch
}: {
  query: string;
  verse: Extract<BibleSearchResult, { type: "verse" }>;
  onSelectResult: (result: BibleSearchResult, groupQuery?: string) => void;
  onCompareResult: (result: Extract<BibleSearchResult, { type: "verse" }>) => void;
  onSaveReference: (result: Extract<BibleSearchResult, { type: "verse" }>) => void;
  showStrongsInSearch?: boolean;
}) {
  return (
    <article className="search-range-line search-topic-verse">
      <button
        aria-label={verse.label}
        className="search-range-line-main"
        onClick={() => onSelectResult(verse)}
        type="button"
      >
        <span className="search-range-line-number">{verse.verseNumber}</span>
        <span className="search-range-line-copy">
          <span className="search-result-reference">{verse.label}</span>
          <SearchVersePreview
            mode="allStrongs"
            preview={verse.preview}
            query={query}
            showStrongsInSearch={showStrongsInSearch}
            tokens={verse.tokens}
          />
        </span>
      </button>
      <div className="search-result-actions">
        <button
          className="reader-inline-button"
          onClick={() => onCompareResult(verse)}
          type="button"
        >
          Compare
        </button>
        <button
          className="reader-inline-button"
          onClick={() => onSaveReference(verse)}
          type="button"
        >
          Save
        </button>
      </div>
    </article>
  );
}

export function SearchStrongsParallelRows({
  expandedVerseRows,
  onToggleVerseRow,
  rows,
  strongsNumber,
  onOpenStrongs,
  onSelectResult
}: {
  expandedVerseRows: Record<string, boolean>;
  onToggleVerseRow: (row: StrongsParallelVerseRow) => void;
  rows: StrongsParallelVerseRow[];
  strongsNumber: string;
  onOpenStrongs: (strongsNumbers: string[], label?: string | null) => void;
  onSelectResult: (result: BibleSearchResult) => void;
}) {
  return (
    <div className="search-strongs-parallel-rows">
      {rows.map((row) => (
        (() => {
          const expansionKey = getStrongsVerseExpansionKey(strongsNumber, row);
          const isExpanded = expandedVerseRows[expansionKey] === true;
          const referenceLabel = `${row.bookName} ${row.chapterNumber}:${row.verseNumber}`;

          return (
            <article
              className="search-strongs-parallel-row"
              key={`${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`}
            >
              <div className="search-strongs-parallel-row-header">
                <button
                  aria-controls={`search-strongs-verse-expansion:${expansionKey}`}
                  aria-expanded={isExpanded}
                  className="search-strongs-parallel-row-toggle"
                  onClick={() => onToggleVerseRow(row)}
                  type="button"
                >
                  <strong className="search-result-reference">{referenceLabel}</strong>
                  <span className="search-strongs-parallel-row-state">
                    {isExpanded ? "Collapse" : "Expand"}
                  </span>
                </button>
              </div>
              {isExpanded ? (
                <div
                  aria-label={`Versions for ${referenceLabel}`}
                  className="search-strongs-parallel-cells"
                  id={`search-strongs-verse-expansion:${expansionKey}`}
                  role="region"
                >
                  {row.versions.map(({ entry, href, version }) => {
                    const verse = entry
                      ? {
                          number: row.verseNumber,
                          text: entry.text,
                          translationText: entry.translationText,
                          tokens: entry.tokens,
                          greekTokens: entry.greekTokens
                        }
                      : null;

                    return (
                      <section
                        className="search-strongs-parallel-cell"
                        key={`${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}:${version}`}
                      >
                        <div className="search-strongs-parallel-cell-header">
                          <span className="search-strongs-parallel-version">
                            {getBibleVersionLabel(version)}
                          </span>
                          {entry ? (
                            <button
                              className="reader-inline-button"
                              onClick={() =>
                                onSelectResult({
                                  type: "verse",
                                  id: `search-strongs-inline:${version}:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`,
                                  version,
                                  bookSlug: row.bookSlug,
                                  chapterNumber: row.chapterNumber,
                                  verseNumber: row.verseNumber,
                                  label: referenceLabel,
                                  description: `${getBibleVersionLabel(version)} verse`,
                                  href,
                                  preview: entry.text,
                                  tokens: entry.tokens
                                })
                              }
                              type="button"
                            >
                              Open
                            </button>
                          ) : null}
                        </div>
                        {entry ? (
                          <VerseTextContent
                            className={`verse-text${version === "kjv" ? " verse-text-rich" : ""}`}
                            highlightedStrongsNumber={version === "kjv" ? strongsNumber : null}
                            onOpenStrongs={(strongsNumbers) =>
                              onOpenStrongs(strongsNumbers, strongsNumber)
                            }
                            showStrongs={version === "kjv"}
                            verse={verse}
                          />
                        ) : (
                          <p className="search-result-group-empty">
                            This reference is not available in {getBibleVersionLabel(version)}.
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })()
      ))}
    </div>
  );
}

export function SearchResultGroups({
  groups,
  onSelectResult,
  variant = "stack",
  isSearching = false,
  showStrongsInSearch = false
}: SearchResultGroupsProps) {
  const { searchVersions } = useLookup();
  const { openCompare, openStrongs, saveReferenceToStudySet } = useReaderWorkspace();
  const installedVersions = useMemo(() => getInstalledBundledBibleVersions(), []);
  const [activeResultTabOverride, setActiveResultTabOverride] = useState<SearchResultTab | null>(
    null
  );
  const [expandedStrongs, setExpandedStrongs] = useState<Record<string, boolean>>({});
  const [expandedStrongsVerseRows, setExpandedStrongsVerseRows] = useState<
    Record<string, boolean>
  >({});
  const [expandedStrongsVersions, setExpandedStrongsVersions] = useState<
    Record<string, BundledBibleVersion[]>
  >({});
  const [strongsExpansionState, setStrongsExpansionState] = useState<
    Record<string, StrongsExpansionState>
  >({});

  const groupsSignature = useMemo(
    () =>
      groups
        .map((group) => `${group.id}:${group.results.map((result) => result.id).join(",")}`)
        .join("|"),
    [groups]
  );
  const defaultTab = useMemo(() => getDefaultSearchResultTab(groups), [groups]);
  const hasDefinitionResults = useMemo(
    () =>
      groups.some((group) =>
        group.results.some((result) => getSearchResultTabForResult(result) === "definitions")
      ),
    [groups]
  );
  const hasVerseResults = useMemo(
    () =>
      groups.some((group) =>
        group.results.some((result) => getSearchResultTabForResult(result) === "verses")
      ),
    [groups]
  );
  const activeResultTab = activeResultTabOverride ?? defaultTab;
  const visibleGroups = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        results: group.results.filter(
          (result) => getSearchResultTabForResult(result) === activeResultTab
        ),
        emptyMessage: getSearchResultEmptyMessage(activeResultTab)
      })),
    [activeResultTab, groups]
  );

  useEffect(() => {
    setActiveResultTabOverride(null);
    setExpandedStrongs({});
    setExpandedStrongsVerseRows({});
    setExpandedStrongsVersions({});
    setStrongsExpansionState({});
  }, [groupsSignature]);

  useEffect(() => {
    let isCancelled = false;
    const strongsToLoad = Object.entries(expandedStrongs)
      .filter(([, isExpanded]) => isExpanded)
      .map(([strongsNumber]) => {
        const selectedVersions =
          expandedStrongsVersions[strongsNumber] ?? [...searchVersions];
        const versionsKey = getVersionsKey(selectedVersions);
        const currentState = strongsExpansionState[strongsNumber];

        if (
          selectedVersions.length === 0 ||
          currentState?.versionsKey === versionsKey
        ) {
          return null;
        }

        return {
          strongsNumber,
          selectedVersions,
          versionsKey
        };
      })
      .filter(
        (
          entry
        ): entry is {
          strongsNumber: string;
          selectedVersions: BundledBibleVersion[];
          versionsKey: string;
        } => entry !== null
      );

    if (strongsToLoad.length === 0) {
      return;
    }

    strongsToLoad.forEach(({ selectedVersions, strongsNumber, versionsKey }) => {
      setStrongsExpansionState((current) => ({
        ...current,
        [strongsNumber]: {
          status: "loading",
          versionsKey,
          rows: current[strongsNumber]?.rows ?? []
        }
      }));

      void getStrongsParallelVerseRows(strongsNumber, selectedVersions).then((rows) => {
        if (isCancelled) {
          return;
        }

        setStrongsExpansionState((current) => ({
          ...current,
          [strongsNumber]: {
            status: "loaded",
            versionsKey,
            rows
          }
        }));
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [expandedStrongs, expandedStrongsVersions, searchVersions, strongsExpansionState]);

  const handleCompareResult = (
    result: Extract<BibleSearchResult, { type: "verse" | "chapter" }>
  ) => {
    openCompare(result.type === "verse" ? result.verseNumber : null);
    onSelectResult(result);
  };

  const handleSaveReference = (reference: ReturnType<typeof createPassageReference>) => {
    const setName = window.prompt("Add this result to which study set?", "Current study");

    if (!setName) {
      return;
    }

    saveReferenceToStudySet(setName, reference);
  };

  const handleSaveVerseResult = (
    result: Extract<BibleSearchResult, { type: "verse" }>
  ) => {
    handleSaveReference(
      createPassageReference({
        version: result.version,
        bookSlug: result.bookSlug,
        chapterNumber: result.chapterNumber,
        verseNumber: result.verseNumber,
        sourceType: "search"
      })
    );
  };

  const toggleExpandedStrongs = (strongsNumber: string) => {
    setExpandedStrongs((current) => {
      const nextExpanded = !current[strongsNumber];

      if (nextExpanded) {
        setExpandedStrongsVersions((currentVersions) => {
          if (currentVersions[strongsNumber]?.length) {
            return currentVersions;
          }

          return {
            ...currentVersions,
            [strongsNumber]: [...searchVersions]
          };
        });
      }

      return {
        ...current,
        [strongsNumber]: nextExpanded
      };
    });
  };

  const toggleExpandedStrongsVerseRow = (
    strongsNumber: string,
    row: StrongsParallelVerseRow
  ) => {
    const expansionKey = getStrongsVerseExpansionKey(strongsNumber, row);

    setExpandedStrongsVerseRows((current) => ({
      ...current,
      [expansionKey]: !current[expansionKey]
    }));
  };

  return (
    <div className="search-result-groups-shell">
      <div className="lookup-pane-tabs search-result-tabs" role="tablist" aria-label="Search result tabs">
        <button
          aria-selected={activeResultTab === "definitions"}
          className={`lookup-pane-tab${activeResultTab === "definitions" ? " is-active" : ""}`}
          onClick={() => setActiveResultTabOverride("definitions")}
          role="tab"
          type="button"
        >
          {getSearchResultTabLabel("definitions")}
        </button>
        <button
          aria-selected={activeResultTab === "verses"}
          className={`lookup-pane-tab${activeResultTab === "verses" ? " is-active" : ""}`}
          onClick={() => setActiveResultTabOverride("verses")}
          role="tab"
          type="button"
        >
          {getSearchResultTabLabel("verses")}
        </button>
      </div>

      {!isSearching && activeResultTab === "definitions" && !hasDefinitionResults ? (
        <p className="search-result-tab-empty">{getSearchResultEmptyMessage("definitions")}</p>
      ) : null}
      {!isSearching && activeResultTab === "verses" && !hasVerseResults ? (
        <p className="search-result-tab-empty">{getSearchResultEmptyMessage("verses")}</p>
      ) : null}

      <div
        className={`search-result-groups${
          variant === "panes" ? " search-result-groups-panes" : ""
        }`}
        style={
          variant === "panes"
            ? {
                ["--search-pane-count" as string]: String(
                  Math.max(visibleGroups.length, 1)
                )
              }
            : undefined
        }
      >
        {visibleGroups.map((group) => (
          <section
            className={`search-result-group${
              variant === "panes" ? " search-result-group-pane" : ""
            }`}
            key={group.id}
          >
            <header className="search-result-group-header">
              <p className="search-result-group-label">Query</p>
              <h3 className="search-result-group-query">{group.query}</h3>
            </header>
            {isSearching ? (
              <p className="search-result-group-empty">Searching scripture…</p>
            ) : group.results.length === 0 ? (
              <p className="search-result-group-empty">
                {group.emptyMessage ?? getSearchResultEmptyMessage(activeResultTab)}
              </p>
            ) : (
              <div className="search-results">
                {group.results.map((result) =>
                  result.type === "topic-suggestion" ? (
                    <button
                      className="search-result"
                      key={result.id}
                      onClick={() => onSelectResult(result, group.query)}
                      type="button"
                    >
                      <div className="search-result-header">
                        <span
                          className={`search-result-type search-result-type-${result.type}`}
                        >
                          {getResultTypeLabel(result.type)}
                        </span>
                        <strong>{result.label}</strong>
                      </div>
                      <p className="search-result-description">{result.description}</p>
                      <p className="search-result-preview">{result.preview}</p>
                    </button>
                  ) : result.type === "topic" ? (
                    <article
                      aria-label={result.label}
                      className="search-result search-result-topic search-result-static"
                      key={result.id}
                    >
                      <div className="search-result-header">
                        <span
                          className={`search-result-type search-result-type-${result.type}`}
                        >
                          {getResultTypeLabel(result.type)}
                        </span>
                        <strong>{result.label}</strong>
                      </div>
                      <p className="search-result-description">{result.description}</p>
                      <div className="search-topic-subtopics">
                        {result.subtopics.map((subtopic) => (
                          <section className="search-topic-subtopic" key={subtopic.id}>
                            <h4 className="search-topic-subtopic-title">
                              {subtopic.label}
                            </h4>
                            <div className="search-range-lines">
                              {subtopic.verses.map((verse) => (
                                <SearchTopicVerseButton
                                  key={verse.id}
                                  onCompareResult={handleCompareResult}
                                  onSelectResult={onSelectResult}
                                  onSaveReference={handleSaveVerseResult}
                                  query={group.query}
                                  showStrongsInSearch={showStrongsInSearch}
                                  verse={verse}
                                />
                              ))}
                            </div>
                          </section>
                        ))}
                      </div>
                    </article>
                  ) : result.type === "range" ? (
                    <article
                      aria-label={result.label}
                      className="search-result search-result-range"
                      key={result.id}
                    >
                      <div className="search-result-header">
                        <span
                          className={`search-result-type search-result-type-${result.type}`}
                        >
                          {getResultTypeLabel(result.type)}
                        </span>
                        <strong>{result.label}</strong>
                      </div>
                      <p className="search-result-description">{result.description}</p>
                      <div className="search-range-lines">
                        {result.verses.map((verse) => (
                          <article className="search-range-line" key={verse.id}>
                            <button
                              aria-label={verse.label}
                              className="search-range-line-main"
                              onClick={() =>
                                onSelectResult(
                                  {
                                    type: "verse",
                                    id: verse.id,
                                    version: verse.version,
                                    bookSlug: result.bookSlug,
                                    chapterNumber: result.chapterNumber,
                                    verseNumber: verse.verseNumber,
                                    label: verse.label,
                                    description: result.description,
                                    href: verse.href,
                                    preview: verse.preview,
                                    tokens: verse.tokens
                                  },
                                  group.query
                                )
                              }
                              type="button"
                            >
                              <span className="search-range-line-number">
                                {verse.verseNumber}
                              </span>
                              <span className="search-range-line-copy">
                                <span className="search-result-reference">
                                  {verse.label}
                                </span>
                                <SearchVersePreview
                                  mode="allStrongs"
                                  preview={verse.preview}
                                  query={group.query}
                                  showStrongsInSearch={showStrongsInSearch}
                                  tokens={verse.tokens}
                                />
                              </span>
                            </button>
                            <div className="search-result-actions">
                              <button
                                className="reader-inline-button"
                                onClick={() =>
                                  handleCompareResult({
                                    type: "verse",
                                    id: verse.id,
                                    version: verse.version,
                                    bookSlug: result.bookSlug,
                                    chapterNumber: result.chapterNumber,
                                    verseNumber: verse.verseNumber,
                                    label: verse.label,
                                    description: result.description,
                                    href: verse.href,
                                    preview: verse.preview,
                                    tokens: verse.tokens
                                  })
                                }
                                type="button"
                              >
                                Compare
                              </button>
                              <button
                                className="reader-inline-button"
                                onClick={() =>
                                  handleSaveReference(
                                    createPassageReference({
                                      version: verse.version,
                                      bookSlug: result.bookSlug,
                                      chapterNumber: result.chapterNumber,
                                      verseNumber: verse.verseNumber,
                                      sourceType: "search"
                                    })
                                  )
                                }
                                type="button"
                              >
                                Save
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </article>
                  ) : result.type === "strongs" ? (
                    <article
                      className="search-result search-result-interactive search-result-strongs"
                      key={result.id}
                    >
                      <button
                        aria-controls={`search-strongs-expansion:${result.strongsNumber}`}
                        aria-expanded={expandedStrongs[result.strongsNumber] === true}
                        className="search-result-main"
                        onClick={() => toggleExpandedStrongs(result.strongsNumber)}
                        type="button"
                      >
                        <div className="search-result-header">
                          <span
                            className={`search-result-type search-result-type-${result.type}`}
                          >
                            {getResultTypeLabel(result.type)}
                          </span>
                          <strong>{result.label}</strong>
                        </div>
                        <p className="search-result-description">{result.description}</p>
                        <p className="search-result-preview">{result.preview}</p>
                      </button>
                      <div className="search-result-actions">
                        <button
                          className="reader-inline-button"
                          onClick={() => onSelectResult(result, group.query)}
                          type="button"
                        >
                          Open in Study Pane
                        </button>
                      </div>
                      {expandedStrongs[result.strongsNumber] ? (
                        <div
                          className="search-strongs-expansion"
                          id={`search-strongs-expansion:${result.strongsNumber}`}
                        >
                          <div className="search-strongs-expansion-header">
                            <div>
                              <p className="search-result-group-label">Matching Verses</p>
                              <p className="search-result-group-query">
                                {result.strongsNumber}
                              </p>
                            </div>
                            <div
                              aria-label={`Versions for ${result.strongsNumber}`}
                              className="search-version-filters"
                              role="group"
                            >
                              {installedVersions.map((version) => {
                                const selectedVersions =
                                  expandedStrongsVersions[result.strongsNumber] ??
                                  [...searchVersions];
                                const isSelected =
                                  selectedVersions.includes(version);

                                return (
                                  <button
                                    aria-pressed={isSelected}
                                    className={`search-version-filter${
                                      isSelected
                                        ? " search-version-filter-active"
                                        : ""
                                    }`}
                                    key={`${result.strongsNumber}:${version}`}
                                    onClick={() =>
                                      setExpandedStrongsVersions((current) => ({
                                        ...current,
                                        [result.strongsNumber]: getNextSelectedVersions(
                                          current[result.strongsNumber] ??
                                            [...searchVersions],
                                          version
                                        )
                                      }))
                                    }
                                    type="button"
                                  >
                                    {getBibleVersionLabel(version)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {strongsExpansionState[result.strongsNumber]?.status === "loading" ? (
                            <p className="search-result-group-empty">
                              Loading matching verses…
                            </p>
                          ) : (strongsExpansionState[result.strongsNumber]?.rows.length ?? 0) ===
                            0 ? (
                            <p className="search-result-group-empty">
                              No verse matches were found for this Strong’s entry.
                            </p>
                          ) : (
                            <SearchStrongsParallelRows
                              expandedVerseRows={expandedStrongsVerseRows}
                              onOpenStrongs={openStrongs}
                              onSelectResult={(inlineResult) =>
                                onSelectResult(inlineResult, group.query)
                              }
                              onToggleVerseRow={(row) =>
                                toggleExpandedStrongsVerseRow(result.strongsNumber, row)
                              }
                              rows={
                                strongsExpansionState[result.strongsNumber]?.rows ?? []
                              }
                              strongsNumber={result.strongsNumber}
                            />
                          )}
                        </div>
                      ) : null}
                    </article>
                  ) : result.type === "greek-lemma" ? (
                    <article className="search-result search-result-interactive" key={result.id}>
                      <button
                        className="search-result-main"
                        onClick={() => onSelectResult(result, group.query)}
                        type="button"
                      >
                        <div className="search-result-header">
                          <span
                            className={`search-result-type search-result-type-${result.type}`}
                          >
                            {getResultTypeLabel(result.type)}
                          </span>
                          <strong>{result.label}</strong>
                        </div>
                        <p className="search-result-description">{result.description}</p>
                        <p className="search-result-preview">{result.preview}</p>
                      </button>
                    </article>
                  ) : "href" in result ? (
                    <article className="search-result search-result-interactive" key={result.id}>
                      <button
                        className="search-result-main"
                        onClick={() => onSelectResult(result)}
                        type="button"
                      >
                        <div className="search-result-header">
                          <span
                            className={`search-result-type search-result-type-${result.type}`}
                          >
                            {getResultTypeLabel(result.type)}
                          </span>
                          <strong>{result.label}</strong>
                        </div>
                        <p className="search-result-description">{result.description}</p>
                        {result.type === "verse" ? (
                          <p className="search-result-reference">{result.label}</p>
                        ) : null}
                        {"preview" in result ? (
                          <SearchVersePreview
                            mode="allStrongs"
                            preview={result.preview}
                            query={group.query}
                            showStrongsInSearch={showStrongsInSearch}
                            tokens={"tokens" in result ? result.tokens : undefined}
                          />
                        ) : null}
                      </button>
                      {result.type === "verse" || result.type === "chapter" ? (
                        <div className="search-result-actions">
                          <button
                            className="reader-inline-button"
                            onClick={() => handleCompareResult(result)}
                            type="button"
                          >
                            Compare
                          </button>
                          <button
                            className="reader-inline-button"
                            onClick={() =>
                              handleSaveReference(
                                createPassageReference({
                                  version: result.version,
                                  bookSlug: result.bookSlug,
                                  chapterNumber: result.chapterNumber,
                                  verseNumber:
                                    result.type === "verse"
                                      ? result.verseNumber
                                      : undefined,
                                  sourceType: "search"
                                })
                              )
                            }
                            type="button"
                          >
                            Save
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ) : null
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
