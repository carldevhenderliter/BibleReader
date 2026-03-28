"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { searchBible } from "@/lib/bible/search";
import type { BibleSearchResult } from "@/lib/bible/types";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function BottomSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const inputId = useId();
  const trayId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<BibleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);

    void searchBible(trimmedQuery, version).then((nextResults) => {
      if (isCancelled) {
        return;
      }

      setResults(nextResults);
      setIsSearching(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, query, version]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  };

  return (
    <>
      {isOpen ? (
        <button
          aria-label="Close search"
          className="search-backdrop"
          onClick={handleClose}
          type="button"
        />
      ) : null}
      <div className="search-shell">
        {isOpen ? (
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
              <button className="search-close-button" onClick={handleClose} type="button">
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
                    onClick={() => handleSelect(result.href)}
                    type="button"
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {result.type === "book" ? "Book" : "Verse"}
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
            aria-expanded={isOpen}
            autoComplete="off"
            className="search-input"
            id={inputId}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search books, words, or phrases"
            ref={inputRef}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="search-action-button"
              onClick={handleClear}
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
