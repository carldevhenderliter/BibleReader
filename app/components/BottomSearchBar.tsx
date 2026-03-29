"use client";

import { useEffect, useId, useRef } from "react";

import { SearchAiPanel } from "@/app/components/SearchAiPanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchMatchModeToggle } from "@/app/components/SearchMatchModeToggle";
import { SearchModeToggle } from "@/app/components/SearchModeToggle";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { SearchStrongsToggle } from "@/app/components/SearchStrongsToggle";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function BottomSearchBar() {
  const { version } = useReaderVersion();
  const {
    aiAnswer,
    aiAvailabilityReason,
    aiProgressLabel,
    aiProgressValue,
    aiStatus,
    askAi,
    clearSearch,
    closeSearch,
    enableAi,
    isSplitViewActive,
    isOpen,
    isSearching,
    matchMode,
    openSearch,
    query,
    queryParts,
    resultGroups,
    searchMode,
    selectResult,
    selectAiSource,
    setMatchMode,
    setSearchMode,
    setQuery,
    setShowStrongsInSearch,
    showStrongsInSearch
  } = useLookup();
  const inputId = useId();
  const trayId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || isSplitViewActive) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeSearch, isOpen, isSplitViewActive]);

  return (
    <>
      {isOpen && !isSplitViewActive ? (
        <button
          aria-label="Close search"
          className="search-backdrop"
          onClick={closeSearch}
          type="button"
        />
      ) : null}
      <div className={`search-shell${isSplitViewActive ? " search-shell-split" : ""}`}>
        {isOpen && !isSplitViewActive ? (
          <section
            aria-label="Bible search results"
            className="search-tray"
            id={trayId}
          >
            <div className="search-tray-header">
              <div className="search-tray-header-main">
                <p className="search-tray-kicker">Bible Search</p>
                <h2 className="search-tray-title">{getBibleVersionLabel(version)} results</h2>
              </div>
              <div className="search-tray-header-actions">
                <SearchModeToggle onChange={setSearchMode} searchMode={searchMode} />
                {searchMode === "lookup" ? (
                  <>
                    <SearchMatchModeToggle matchMode={matchMode} onChange={setMatchMode} />
                    <SearchStrongsToggle
                      isEnabled={showStrongsInSearch}
                      onChange={setShowStrongsInSearch}
                    />
                  </>
                ) : null}
                <button className="search-close-button" onClick={closeSearch} type="button">
                  Close
                </button>
              </div>
            </div>
            {searchMode === "ai" ? (
              <SearchAiPanel
                answer={aiAnswer}
                availabilityReason={aiAvailabilityReason}
                onAsk={askAi}
                onEnable={enableAi}
                onSelectSource={selectAiSource}
                progressLabel={aiProgressLabel}
                progressValue={aiProgressValue}
                query={query}
                status={aiStatus}
              />
            ) : !query.trim() ? (
              <p className="search-empty-copy">
                Search for a book, reference, Strongs number, word, phrase, or comma-separated list, or use `Topic:` to browse study topics.
              </p>
            ) : (
              <SearchResultGroups
                groups={
                  isSearching && resultGroups.length === 0
                    ? queryParts.map((queryPart, index) => ({
                        id: `pending:${index}:${queryPart}`,
                        query: queryPart,
                        results: []
                      }))
                    : resultGroups
              }
              isSearching={isSearching}
              onSelectResult={selectResult}
              showStrongsInSearch={showStrongsInSearch}
            />
          )}
          </section>
        ) : null}
        <div className="search-bar" role="search">
          <label className="sr-only" htmlFor={inputId}>
            Search books, words, phrases, or Strongs numbers, or use Topic:
          </label>
          <input
            aria-controls={trayId}
            aria-expanded={isSplitViewActive ? true : isOpen}
            autoComplete="off"
            className="search-input"
            id={inputId}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchMode === "ai") {
                event.preventDefault();
                void askAi();
              }
            }}
            onFocus={openSearch}
            placeholder="Search books, references, Strongs numbers, words, phrases, or Topic:"
            ref={inputRef}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="search-action-button"
              onClick={() => {
                clearSearch();
                inputRef.current?.focus();
              }}
              type="button"
            >
              Clear
            </button>
          ) : (
            <span className="search-version-pill">{version.toUpperCase()}</span>
          )}
        </div>
      </div>
    </>
  );
}
