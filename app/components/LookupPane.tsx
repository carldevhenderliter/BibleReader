"use client";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function LookupPane() {
  const {
    clearSearch,
    closeSearch,
    isSplitViewActive,
    isOpen,
    isSearching,
    query,
    queryParts,
    resultGroups,
    selectResult
  } = useLookup();
  const { version } = useReaderVersion();

  if (!isSplitViewActive) {
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
      <div className="lookup-pane-body">
        {!isOpen || !query.trim() ? (
          <div id="lookup-pane-search-panel" role="tabpanel">
            <p className="search-empty-copy">
              Search from the bottom bar to open books, chapters, verses, words, phrases, or comma-separated groups here.
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
