"use client";

import { SearchWorkspacePanel } from "@/app/components/SearchWorkspacePanel";
import { useLookup } from "@/app/components/LookupProvider";
import { useSearchCustomization } from "@/app/components/SearchCustomizationProvider";
import { getBibleVersionSelectionLabel } from "@/lib/bible/version";

export function SearchPane() {
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    isSplitViewActive,
    searchVersions
  } = useLookup();
  const { style } = useSearchCustomization();

  if (!isSplitViewActive) {
    return null;
  }

  if (collapsedSplitPanes.search) {
    return null;
  }

  return (
    <aside aria-label="Search pane" className="app-side-pane search-pane" style={style}>
      <SearchWorkspacePanel
        className="search-pane-workspace"
        title={`${getBibleVersionSelectionLabel(searchVersions)} search`}
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
