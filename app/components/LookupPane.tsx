"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderGrammarChartsPanel } from "@/app/components/ReaderGrammarChartsPanel";
import { ReaderGreekGrammarPanel } from "@/app/components/ReaderGreekGrammarPanel";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { isReaderRoutePath } from "@/lib/reader-routes";

export function LookupPane() {
  const { style } = useReaderCustomization();
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    expandSplitPane,
    isSplitViewActive
  } = useLookup();
  const { activeUtilityPane, setActiveUtilityPane, utilityPaneRequestKey } = useReaderWorkspace();
  const pathname = usePathname();
  const isReaderRoute = isReaderRoutePath(pathname);
  const previousUtilityPaneRequestKeyRef = useRef(utilityPaneRequestKey);

  useEffect(() => {
    const previousUtilityPaneRequestKey = previousUtilityPaneRequestKeyRef.current;
    previousUtilityPaneRequestKeyRef.current = utilityPaneRequestKey;

    if (!isSplitViewActive || !collapsedSplitPanes.study) {
      return;
    }

    if (
      activeUtilityPane !== "search" &&
      utilityPaneRequestKey !== previousUtilityPaneRequestKey
    ) {
      expandSplitPane("study");
    }
  }, [
    activeUtilityPane,
    collapsedSplitPanes.study,
    expandSplitPane,
    isSplitViewActive,
    utilityPaneRequestKey
  ]);

  if (!isSplitViewActive) {
    return null;
  }

  if (collapsedSplitPanes.study) {
    return null;
  }

  return (
    <aside aria-label="Study pane" className="app-side-pane study-pane" style={style}>
      <div className="lookup-pane-header">
        <div className="lookup-pane-header-main">
          <p className="search-tray-kicker">Study Tools</p>
          <h2 className="search-tray-title">Notes and study tools</h2>
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
            aria-selected={activeUtilityPane === "notebook"}
            className={`lookup-pane-tab${activeUtilityPane === "notebook" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("notebook")}
            role="tab"
            type="button"
          >
            Notes
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
            aria-selected={activeUtilityPane === "grammar"}
            className={`lookup-pane-tab${activeUtilityPane === "grammar" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("grammar")}
            role="tab"
            type="button"
          >
            Grammar
          </button>
          <button
            aria-selected={activeUtilityPane === "charts"}
            className={`lookup-pane-tab${activeUtilityPane === "charts" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("charts")}
            role="tab"
            type="button"
          >
            Charts
          </button>
          <button
            aria-selected={activeUtilityPane === "strongs"}
            className={`lookup-pane-tab${activeUtilityPane === "strongs" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("strongs")}
            role="tab"
            type="button"
          >
            Strongs
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
          <button
            aria-selected={activeUtilityPane === "harmony"}
            className={`lookup-pane-tab${activeUtilityPane === "harmony" ? " is-active" : ""}`}
            onClick={() => setActiveUtilityPane("harmony")}
            role="tab"
            type="button"
          >
            Harmony
          </button>
        </div>
        <div className="lookup-pane-study-body">
          {activeUtilityPane === "notebook" ? (
            <ReaderNotebookEditor />
          ) : activeUtilityPane === "grammar" ? (
            <ReaderGreekGrammarPanel />
          ) : activeUtilityPane === "charts" ? (
            <ReaderGrammarChartsPanel />
          ) : activeUtilityPane === "strongs" ? (
            <ReaderStrongsPanel />
          ) : activeUtilityPane === "sermons" ? (
            <ReaderSermonWorkspace />
          ) : activeUtilityPane === "harmony" ? (
            <ReaderHarmonyWorkspace />
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
                Open notes, charts, Strongs, sermons, or cross references in the study pane.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
