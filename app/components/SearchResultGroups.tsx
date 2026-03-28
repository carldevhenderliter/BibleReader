"use client";

import type { BibleSearchResultGroup } from "@/lib/bible/types";

type SearchResultGroupsProps = {
  groups: BibleSearchResultGroup[];
  onSelectResult: (href: string) => void;
};

function getResultTypeLabel(type: BibleSearchResultGroup["results"][number]["type"]) {
  if (type === "book") {
    return "Book";
  }

  if (type === "chapter") {
    return "Chapter";
  }

  return "Verse";
}

export function SearchResultGroups({ groups, onSelectResult }: SearchResultGroupsProps) {
  return (
    <div className="search-result-groups">
      {groups.map((group) => (
        <section className="search-result-group" key={group.id}>
          <header className="search-result-group-header">
            <p className="search-result-group-label">Query</p>
            <h3 className="search-result-group-query">{group.query}</h3>
          </header>
          {group.results.length === 0 ? (
            <p className="search-result-group-empty">
              {group.emptyMessage ?? "No matches found in the active translation."}
            </p>
          ) : (
            <div className="search-results">
              {group.results.map((result) => (
                <button
                  className="search-result"
                  key={result.id}
                  onClick={() => onSelectResult(result.href)}
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
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
