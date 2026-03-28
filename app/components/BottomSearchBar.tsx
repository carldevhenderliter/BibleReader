"use client";

import { useEffect, useId, useRef } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function BottomSearchBar() {
  const { version } = useReaderVersion();
  const {
    clearSearch,
    closeSearch,
    isDesktop,
    isOpen,
    isSearching,
    openSearch,
    query,
    results,
    selectResult,
    setQuery
  } = useLookup();
  const inputId = useId();
  const trayId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen || isDesktop) {
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
  }, [closeSearch, isDesktop, isOpen]);

  return (
    <>
      {isOpen && !isDesktop ? (
        <button
          aria-label="Close search"
          className="search-backdrop"
          onClick={closeSearch}
          type="button"
        />
      ) : null}
      <div className="search-shell">
        {isOpen && !isDesktop ? (
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
                Search for a book, word, or phrase to jump anywhere in scripture.
              </p>
            ) : isSearching ? (
              <p className="search-empty-copy">Searching scripture…</p>
            ) : results.length === 0 ? (
              <p className="search-empty-copy">No matches found in the active translation.</p>
            ) : (
              <div className="search-results">
                {results.map((result) => (
                  <button
                    className="search-result"
                    key={result.id}
                    onClick={() => selectResult(result.href)}
                    type="button"
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {result.type === "book"
                          ? "Book"
                          : result.type === "chapter"
                            ? "Chapter"
                            : "Verse"}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    {"preview" in result ? (
                      <p className="search-result-preview">{result.preview}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}
        <div className="search-bar" role="search">
          <label className="sr-only" htmlFor={inputId}>
            Search books, words, or phrases
          </label>
          <input
            aria-controls={trayId}
            aria-expanded={isDesktop ? true : isOpen}
            autoComplete="off"
            className="search-input"
            id={inputId}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            onFocus={openSearch}
            placeholder="Search books, words, or phrases"
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
