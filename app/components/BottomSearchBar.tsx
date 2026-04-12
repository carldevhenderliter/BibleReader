"use client";

import { useEffect, useId, useRef } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { SearchCustomizationMenu } from "@/app/components/SearchCustomizationMenu";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useSearchCustomization } from "@/app/components/SearchCustomizationProvider";
import { SearchMatchModeToggle } from "@/app/components/SearchMatchModeToggle";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { SearchStrongsToggle } from "@/app/components/SearchStrongsToggle";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function BottomSearchBar() {
  const { version } = useReaderVersion();
  const { style } = useSearchCustomization();
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
                <h2 className="search-tray-title">{getBibleVersionLabel(version)} results</h2>
              </div>
              <div className="search-tray-header-actions">
                <div className="search-workspace-primary-actions">
                  <SearchMatchModeToggle matchMode={matchMode} onChange={setMatchMode} />
                  <SearchStrongsToggle
                    isEnabled={showStrongsInSearch}
                    onChange={setShowStrongsInSearch}
                  />
                </div>
                <div className="search-workspace-secondary-actions">
                  <SearchCustomizationMenu />
                  <button className="search-close-button" onClick={closeSearch} type="button">
                    Close
                  </button>
                </div>
              </div>
            </div>
            {!query.trim() ? (
              <p className="search-empty-copy">
                Search for a book, reference, Strongs number, Greek word, transliteration, word,
                phrase, or comma-separated list. Use `Topic:` for study topics and `Greek:` for
                transliterated Greek lookup.
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
            Search books, references, Strongs numbers, Greek words, phrases, or use Topic: or Greek:
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
            onFocus={openSearch}
            placeholder="Search books, references, Strongs numbers, Greek words, phrases, or Topic:/Greek:"
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
