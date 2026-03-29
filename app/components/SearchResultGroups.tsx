"use client";

import type { BibleSearchResult, BibleSearchResultGroup } from "@/lib/bible/types";

type SearchResultGroupsProps = {
  groups: BibleSearchResultGroup[];
  onSelectResult: (result: BibleSearchResult) => void;
  variant?: "stack" | "panes";
  isSearching?: boolean;
};

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

  return "Verse";
}

export function SearchResultGroups({
  groups,
  onSelectResult,
  variant = "stack",
  isSearching = false
}: SearchResultGroupsProps) {
  return (
    <div
      className={`search-result-groups${
        variant === "panes" ? " search-result-groups-panes" : ""
      }`}
      style={
        variant === "panes"
          ? {
              ["--search-pane-count" as string]: String(Math.max(groups.length, 1))
            }
          : undefined
      }
    >
      {groups.map((group) => (
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
              {group.emptyMessage ?? "No matches found in the active translation."}
            </p>
          ) : (
            <div className="search-results">
              {group.results.map((result) => (
                "href" in result ? (
                  <button
                    className="search-result"
                    key={result.id}
                    onClick={() => onSelectResult(result)}
                    type="button"
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    {"preview" in result ? (
                      <p className="search-result-preview">{result.preview}</p>
                    ) : null}
                  </button>
                ) : (
                  <article className="search-result search-result-static" key={result.id}>
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    {"preview" in result ? (
                      <p className="search-result-preview">{result.preview}</p>
                    ) : null}
                  </article>
                )
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
