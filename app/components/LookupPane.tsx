"use client";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function LookupPane() {
  const { clearSearch, closeSearch, isDesktop, isOpen, isSearching, query, results, selectResult } =
    useLookup();
  const { version } = useReaderVersion();

  if (!isDesktop) {
    return null;
  }

  return (
    <aside className="lookup-pane" aria-label="Lookup pane">
      <div className="lookup-pane-header">
        <div>
          <p className="search-tray-kicker">Bible Lookup</p>
          <h2 className="search-tray-title">{getBibleVersionLabel(version)} search</h2>
        </div>
        {query ? (
          <button className="search-close-button" onClick={closeSearch} type="button">
            Clear
          </button>
        ) : null}
      </div>
      {!isOpen || !query.trim() ? (
        <p className="search-empty-copy">
          Search from the bottom bar to open books, chapters, verses, words, and phrases here.
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
              {"preview" in result ? <p className="search-result-preview">{result.preview}</p> : null}
            </button>
          ))}
        </div>
      )}
      {query ? (
        <button className="lookup-pane-reset" onClick={clearSearch} type="button">
          Reset search
        </button>
      ) : null}
    </aside>
  );
}
