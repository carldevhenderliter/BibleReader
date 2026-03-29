"use client";

import { usePathname } from "next/navigation";

import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { SearchWorkspacePanel } from "@/app/components/SearchWorkspacePanel";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function LookupPane() {
  const {
    closeSearch,
    isSplitViewActive,
    query,
  } = useLookup();
  const { activeUtilityPane, currentPassage, setActiveUtilityPane } = useReaderWorkspace();
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
          <button
            aria-selected={activeUtilityPane === "notebook"}
            className={`lookup-pane-tab${activeUtilityPane === "notebook" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("notebook")}
            role="tab"
            type="button"
          >
            Notebook
          </button>
        </div>
      ) : null}
      <div className="lookup-pane-body">
        {activeUtilityPane === "notebook" && isReaderRoute ? (
          currentPassage ? (
            <ReaderNotebookEditor
              bookSlug={currentPassage.bookSlug}
              chapterNumber={currentPassage.chapterNumber}
            />
          ) : (
            <div className="lookup-panel-empty">
              <p className="search-empty-copy">Open a passage to use the notebook.</p>
            </div>
          )
        ) : activeUtilityPane === "compare" && isReaderRoute ? (
          <ReaderComparePanel />
        ) : activeUtilityPane === "cross-references" && isReaderRoute ? (
          <ReaderCrossReferencesPanel />
        ) : (
          <SearchWorkspacePanel className="lookup-search-workspace" title={`${getBibleVersionLabel(version)} search`} variant="panes" />
        )}
      </div>
    </aside>
  );
}
