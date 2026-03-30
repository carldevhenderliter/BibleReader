"use client";

import { SearchWorkspacePanel } from "@/app/components/SearchWorkspacePanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getBibleVersionLabel } from "@/lib/bible/version";

export function SearchPane() {
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    isSplitViewActive
  } = useLookup();
  const { version } = useReaderVersion();

  if (!isSplitViewActive) {
    return null;
  }

  if (collapsedSplitPanes.search) {
    return null;
  }

  return (
    <aside aria-label="Search pane" className="app-side-pane search-pane">
      <SearchWorkspacePanel
        className="search-pane-workspace"
        title={`${getBibleVersionLabel(version)} search`}
        variant="panes"
        extraActions={
          <button
            aria-label="Hide search pane"
            className="split-pane-hide-button"
            disabled={!canCollapseSplitPane("search")}
            onClick={() => collapseSplitPane("search")}
            type="button"
          >
            Hide
          </button>
        }
      />
    </aside>
  );
}
