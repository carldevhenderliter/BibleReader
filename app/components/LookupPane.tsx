"use client";

import { usePathname } from "next/navigation";

import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
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
      <div className="lookup-pane-body">
        <SearchWorkspacePanel
          className="lookup-search-workspace"
          title={`${getBibleVersionLabel(version)} search`}
          variant="panes"
        />
        {isReaderRoute ? (
          <section className="lookup-pane-study">
            <div className="lookup-pane-study-header">
              <div className="lookup-pane-header-main">
                <p className="search-tray-kicker">Study Tools</p>
                <h3 className="reader-notebook-title">Notebook and sermons</h3>
              </div>
            </div>
            <div className="lookup-pane-tabs" role="tablist" aria-label="Study workspace tabs">
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
              <button
                aria-selected={activeUtilityPane === "sermons"}
                className={`lookup-pane-tab${activeUtilityPane === "sermons" ? " is-active" : ""}`}
                onClick={() => setActiveUtilityPane("sermons")}
                role="tab"
                type="button"
              >
                Sermons
              </button>
            </div>
            <div className="lookup-pane-study-body">
              {activeUtilityPane === "notebook" ? (
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
              ) : activeUtilityPane === "sermons" ? (
                <ReaderSermonWorkspace />
              ) : activeUtilityPane === "compare" ? (
                <ReaderComparePanel />
              ) : activeUtilityPane === "cross-references" ? (
                <ReaderCrossReferencesPanel />
              ) : (
                <div className="lookup-panel-empty">
                  <p className="search-empty-copy">
                    Open notebook, sermons, compare, or cross references below the search results.
                  </p>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
