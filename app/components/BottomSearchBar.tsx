"use client";

import { useEffect, useId, useRef } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function BottomSearchBar() {
  const { version } = useReaderVersion();
  const {
    clearSearch,
    closeSearch,
    isSplitViewActive,
    isOpen,
    isSearching,
    openSearch,
    query,
    queryParts,
    resultGroups,
    selectResult,
    setQuery
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
              <div>
                <p className="search-tray-kicker">Bible Search</p>
                <h2 className="search-tray-title">{getBibleVersionLabel(version)} results</h2>
              </div>
              <button className="search-close-button" onClick={closeSearch} type="button">
                Close
              </button>
            </div>
            {!query.trim() ? (
              <p className="search-empty-copy">
                Search for a book, reference, word, phrase, or comma-separated list to jump anywhere in scripture.
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
              />
            )}
          </section>
        ) : null}
        <div className="search-bar" role="search">
          <label className="sr-only" htmlFor={inputId}>
            Search books, words, or phrases
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
            placeholder="Search books, references, words, or phrases"
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
