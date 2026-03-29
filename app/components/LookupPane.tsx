"use client";

import { usePathname } from "next/navigation";

import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { SearchMatchModeToggle } from "@/app/components/SearchMatchModeToggle";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { SearchStrongsToggle } from "@/app/components/SearchStrongsToggle";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function LookupPane() {
  const {
    clearSearch,
    closeSearch,
    isSplitViewActive,
    isOpen,
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
  const { activeUtilityPane, setActiveUtilityPane } = useReaderWorkspace();
  const { version } = useReaderVersion();
  const pathname = usePathname();
  const isReaderRoute = pathname.startsWith("/read");

  if (!isSplitViewActive) {
    return null;
  }

  return (
    <aside className="lookup-pane" aria-label="Lookup pane">
      <div className="lookup-pane-header">
        <div className="lookup-pane-header-main">
          <p className="search-tray-kicker">Bible Lookup</p>
          <h2 className="search-tray-title">{getBibleVersionLabel(version)} study workspace</h2>
        </div>
        <div className="lookup-pane-header-actions">
          {activeUtilityPane === "search" ? (
            <>
              <SearchMatchModeToggle matchMode={matchMode} onChange={setMatchMode} />
              <SearchStrongsToggle
                isEnabled={showStrongsInSearch}
                onChange={setShowStrongsInSearch}
              />
            </>
          ) : null}
          {query ? (
            <button className="search-close-button" onClick={closeSearch} type="button">
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {isReaderRoute ? (
        <div className="lookup-pane-tabs" role="tablist" aria-label="Study workspace tabs">
          <button
            aria-selected={activeUtilityPane === "search"}
            className={`lookup-pane-tab${activeUtilityPane === "search" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("search")}
            role="tab"
            type="button"
          >
            Search
          </button>
          <button
            aria-selected={activeUtilityPane === "cross-references"}
            className={`lookup-pane-tab${activeUtilityPane === "cross-references" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("cross-references")}
            role="tab"
            type="button"
          >
            Cross References
          </button>
          <button
            aria-selected={activeUtilityPane === "compare"}
            className={`lookup-pane-tab${activeUtilityPane === "compare" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("compare")}
            role="tab"
            type="button"
          >
            Compare
          </button>
        </div>
      ) : null}
      <div className="lookup-pane-body">
        {activeUtilityPane === "compare" && isReaderRoute ? (
          <ReaderComparePanel />
        ) : activeUtilityPane === "cross-references" && isReaderRoute ? (
          <ReaderCrossReferencesPanel />
        ) : !isOpen || !query.trim() ? (
          <div id="lookup-pane-search-panel" role="tabpanel">
            <p className="search-empty-copy">
              Search from the bottom bar to open books, chapters, verses, Strongs entries, words, phrases, or type `Topic:` to browse study topics here.
            </p>
          </div>
        ) : (
          <div id="lookup-pane-search-panel" role="tabpanel">
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
              variant="panes"
            />
          </div>
        )}
      </div>
      {query ? (
        <button className="lookup-pane-reset" onClick={clearSearch} type="button">
          Reset search
        </button>
      ) : null}
    </aside>
  );
}
