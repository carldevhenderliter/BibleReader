"use client";

import { usePathname } from "next/navigation";

import { useLookup } from "@/app/components/LookupProvider";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { getBibleVersionLabel } from "@/lib/bible/version";

function getReaderPassageFromPathname(pathname: string) {
  if (!pathname.startsWith("/read/")) {
    return null;
  }

  const parts = pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const bookSlug = parts[1];
  const chapterNumber = parts[2] && /^\d+$/.test(parts[2]) ? Number(parts[2]) : 1;

  return {
    bookSlug,
    chapterNumber
  };
}

export function LookupPane() {
  const {
    clearSearch,
    closeSearch,
    isDesktop,
    isOpen,
    isSearching,
    query,
    queryParts,
    resultGroups,
    selectResult
  } = useLookup();
  const pathname = usePathname();
  const { activeUtilityTab, setActiveUtilityTab } = useReaderWorkspace();
  const { version } = useReaderVersion();
  const readerPassage = getReaderPassageFromPathname(pathname);
  const showReaderTabs = readerPassage !== null;

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
      {showReaderTabs ? (
        <div className="lookup-pane-tabs" role="tablist" aria-label="Reader workspace">
          <button
            aria-selected={activeUtilityTab === "search"}
            aria-controls="lookup-pane-search-panel"
            className={`lookup-pane-tab${activeUtilityTab === "search" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityTab("search")}
            role="tab"
            type="button"
          >
            Search
          </button>
          <button
            aria-selected={activeUtilityTab === "notebook"}
            aria-controls="lookup-pane-notebook-panel"
            className={`lookup-pane-tab${activeUtilityTab === "notebook" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityTab("notebook")}
            role="tab"
            type="button"
          >
            Notebook
          </button>
        </div>
      ) : null}
      <div className="lookup-pane-body">
        {showReaderTabs && activeUtilityTab === "notebook" && readerPassage ? (
          <div id="lookup-pane-notebook-panel" role="tabpanel">
            <ReaderNotebookEditor
              bookSlug={readerPassage.bookSlug}
              chapterNumber={readerPassage.chapterNumber}
            />
          </div>
        ) : !isOpen || !query.trim() ? (
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
