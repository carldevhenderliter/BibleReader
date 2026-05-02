"use client";

import { useEffect, useId, useRef, useState } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderBottomBar } from "@/app/components/ReaderBottomBarProvider";
import { SearchCustomizationMenu } from "@/app/components/SearchCustomizationMenu";
import { SearchVersionFilters } from "@/app/components/SearchVersionFilters";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useSearchCustomization } from "@/app/components/SearchCustomizationProvider";
import { SearchMatchModeToggle } from "@/app/components/SearchMatchModeToggle";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { SearchStrongsToggle } from "@/app/components/SearchStrongsToggle";
import {
  getBibleVersionLabel,
  getBibleVersionSelectionLabel
} from "@/lib/bible/version";

export function BottomSearchBar() {
  const { version } = useReaderVersion();
  const { style } = useSearchCustomization();
  const { bottomBarPanel } = useReaderBottomBar();
  const {
    clearSearch,
    closeSearch,
    isSplitViewActive,
    isOpen,
    isSearching,
    matchMode,
    openSearch,
    query,
    queryParts,
    resultGroups,
    searchVersions,
    selectResult,
    setMatchMode,
    setQuery,
    setShowStrongsInSearch,
    searchShellLeftOffsetRem,
    searchShellRightOffsetRem,
    showStrongsInSearch
  } = useLookup();
  const inputId = useId();
  const trayId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isBarExpanded, setIsBarExpanded] = useState(false);
  const shouldCollapseBar = !isBarExpanded && !isOpen && !query.trim();

  const expandBar = () => {
    setIsBarExpanded(true);
    openSearch();
  };

  const handleCloseSearch = () => {
    closeSearch();

    if (!query.trim()) {
      setIsBarExpanded(false);
    }
  };

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

  useEffect(() => {
    if (!isBarExpanded) {
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [isBarExpanded]);

  return (
    <>
      {isOpen && !isSplitViewActive ? (
        <button
          aria-label="Close search"
          className="search-backdrop"
          onClick={handleCloseSearch}
          type="button"
        />
      ) : null}
      <div
        className={`search-shell${isSplitViewActive ? " search-shell-split" : ""}`}
        style={{
          ...style,
          ...(isSplitViewActive
            ? {
                ["--search-shell-left-offset" as string]: `${searchShellLeftOffsetRem}rem`,
                ["--search-shell-right-offset" as string]: `${searchShellRightOffsetRem}rem`
              }
            : {})
        }}
      >
        {isOpen && !isSplitViewActive ? (
          <section
            aria-label="Bible search results"
            className="search-tray"
            id={trayId}
          >
            <div className="search-tray-header">
              <div className="search-tray-header-main">
                <p className="search-tray-kicker">Bible Search</p>
                <h2 className="search-tray-title">
                  {getBibleVersionSelectionLabel(searchVersions)} results
                </h2>
              </div>
              <div className="search-tray-header-actions">
                <div className="search-workspace-primary-actions">
                  <SearchVersionFilters />
                  <SearchMatchModeToggle matchMode={matchMode} onChange={setMatchMode} />
                  <SearchStrongsToggle
                    isEnabled={showStrongsInSearch}
                    onChange={setShowStrongsInSearch}
                  />
                </div>
                <div className="search-workspace-secondary-actions">
                  <SearchCustomizationMenu />
                  <button className="search-close-button" onClick={handleCloseSearch} type="button">
                    Close
                  </button>
                </div>
              </div>
            </div>
            {!query.trim() ? (
              <p className="search-empty-copy">
                Search for a book, reference, Strong’s number, Greek lemma or inflected form,
                transliteration, gloss, word, phrase, or comma-separated list. Choose which Bible
                versions to search, then use `Topic:` for study topics and `Greek:` to force a
                Greek lookup.
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
        <div className="search-shell-dock-row">
          {bottomBarPanel ? (
            <div className="search-shell-reader-panel">{bottomBarPanel}</div>
          ) : null}
          <div
            className={`search-bar${shouldCollapseBar ? " search-bar-collapsed" : ""}`}
            role="search"
          >
            <label className="sr-only" htmlFor={inputId}>
              Search books, references, Strong’s numbers, Greek lemmas, inflected forms, glosses,
              phrases, or use Topic: or Greek:
            </label>
            <button
              aria-label={shouldCollapseBar ? "Open search" : "Search"}
              className="search-icon-button"
              onClick={expandBar}
              type="button"
            >
              <svg
                aria-hidden="true"
                className="search-icon"
                fill="none"
                height="18"
                viewBox="0 0 18 18"
                width="18"
              >
                <circle cx="8" cy="8" r="4.75" stroke="currentColor" strokeWidth="1.5" />
                <path d="m11.5 11.5 3.75 3.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
              </svg>
            </button>
            <input
              aria-controls={trayId}
              aria-expanded={isSplitViewActive ? true : isOpen}
              autoComplete="off"
              className="search-input"
              id={inputId}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              onFocus={() => {
                setIsBarExpanded(true);
                openSearch();
              }}
              placeholder="Search references, Strong’s, Greek lemmas/forms, glosses, or Topic:/Greek:"
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
              <span className="search-version-pill">
                {searchVersions.length === 1
                  ? getBibleVersionLabel(searchVersions[0] ?? version).toUpperCase()
                  : getBibleVersionSelectionLabel(searchVersions)}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
