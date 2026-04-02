"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function LookupPane() {
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    expandSplitPane,
    isSplitViewActive
  } = useLookup();
  const { activeUtilityPane, setActiveUtilityPane } = useReaderWorkspace();
  const pathname = usePathname();
  const isReaderRoute = pathname.startsWith("/read");

  useEffect(() => {
    if (!isSplitViewActive || !collapsedSplitPanes.study) {
      return;
    }

    if (activeUtilityPane !== "search") {
      expandSplitPane("study");
    }
  }, [activeUtilityPane, collapsedSplitPanes.study, expandSplitPane, isSplitViewActive]);

  if (!isSplitViewActive) {
    return null;
  }

  if (collapsedSplitPanes.study) {
    return null;
  }

  return (
    <aside aria-label="Study pane" className="app-side-pane study-pane">
      <div className="lookup-pane-header">
        <div className="lookup-pane-header-main">
          <p className="search-tray-kicker">Study Tools</p>
          <h2 className="search-tray-title">Cross references and sermons</h2>
        </div>
        <div className="lookup-pane-header-actions">
          <button
            aria-label="Hide study pane"
            className="split-pane-hide-button"
            disabled={!canCollapseSplitPane("study")}
            onClick={() => collapseSplitPane("study")}
            type="button"
          >
            Hide
          </button>
        </div>
      </div>
      <div className="lookup-pane-study">
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
          {activeUtilityPane === "sermons" ? (
            <ReaderSermonWorkspace />
          ) : activeUtilityPane === "cross-references" ? (
            isReaderRoute ? (
              <ReaderCrossReferencesPanel />
            ) : (
              <div className="lookup-panel-empty">
                <p className="search-empty-copy">Open a passage to view cross references.</p>
              </div>
            )
          ) : (
            <div className="lookup-panel-empty">
              <p className="search-empty-copy">
                Open sermons or cross references in the study pane.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
