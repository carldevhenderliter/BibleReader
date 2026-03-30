"use client";

import type { ReactNode } from "react";

import { SearchCustomizationMenu } from "@/app/components/SearchCustomizationMenu";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchMatchModeToggle } from "@/app/components/SearchMatchModeToggle";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { SearchStrongsToggle } from "@/app/components/SearchStrongsToggle";
import { getBibleVersionLabel } from "@/lib/bible/version";

type SearchWorkspacePanelProps = {
  title?: string;
  variant?: "stack" | "panes";
  className?: string;
  extraActions?: ReactNode;
};

export function SearchWorkspacePanel({
  title,
  variant = "stack",
  className = "",
  extraActions = null
}: SearchWorkspacePanelProps) {
  const { version } = useReaderVersion();
  const {
    clearSearch,
    isSearching,
    matchMode,
    query,
    queryParts,
    resultGroups,
    selectResult,
    setMatchMode,
    setShowStrongsInSearch,
    showStrongsInSearch
  } = useLookup();

  return (
    <div className={`search-workspace-panel ${className}`.trim()} role="tabpanel">
      <div className="lookup-pane-header search-workspace-header">
        <div className="lookup-pane-header-main">
          <p className="search-tray-kicker">Bible Search</p>
          <h2 className="search-tray-title">{title ?? `${getBibleVersionLabel(version)} results`}</h2>
        </div>
        <div className="lookup-pane-header-actions">
          <div className="search-workspace-primary-actions">
            <SearchMatchModeToggle matchMode={matchMode} onChange={setMatchMode} />
            <SearchStrongsToggle
              isEnabled={showStrongsInSearch}
              onChange={setShowStrongsInSearch}
            />
          </div>
          <div className="search-workspace-secondary-actions">
            <SearchCustomizationMenu />
            {query ? (
              <button className="search-close-button" onClick={clearSearch} type="button">
                Clear
              </button>
            ) : null}
            {extraActions}
          </div>
        </div>
      </div>
      {!query.trim() ? (
        <p className="search-empty-copy">
          Search for a book, reference, Strongs number, word, phrase, or comma-separated list, or
          use `Topic:` to browse study topics.
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
          variant={variant}
        />
      )}
    </div>
  );
}
