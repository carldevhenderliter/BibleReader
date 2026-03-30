"use client";

import type { PropsWithChildren } from "react";
import { useMemo } from "react";

import { LookupPane } from "@/app/components/LookupPane";
import { SearchPane } from "@/app/components/SearchPane";
import { useLookup } from "@/app/components/LookupProvider";

function getRootFontSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function AppSplitLayout({ children }: PropsWithChildren) {
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    expandSplitPane,
    isSplitViewActive,
    searchPaneWidthRem,
    setSearchPaneWidthRem,
    splitPaneDividerWidthRem,
    splitPaneRailWidthRem,
    studyPaneWidthRem,
    setStudyPaneWidthRem
  } = useLookup();

  const showReaderSearchDivider = isSplitViewActive && !collapsedSplitPanes.reader && !collapsedSplitPanes.search;
  const showSearchStudyDivider = isSplitViewActive && !collapsedSplitPanes.search && !collapsedSplitPanes.study;
  const splitGridTemplateColumns = useMemo(() => {
    if (!isSplitViewActive) {
      return undefined;
    }

    return [
      collapsedSplitPanes.reader ? `${splitPaneRailWidthRem}rem` : "minmax(0, 1fr)",
      showReaderSearchDivider ? `${splitPaneDividerWidthRem}rem` : "0rem",
      collapsedSplitPanes.search ? `${splitPaneRailWidthRem}rem` : `${searchPaneWidthRem}rem`,
      showSearchStudyDivider ? `${splitPaneDividerWidthRem}rem` : "0rem",
      collapsedSplitPanes.study ? `${splitPaneRailWidthRem}rem` : `${studyPaneWidthRem}rem`
    ].join(" ");
  }, [
    collapsedSplitPanes.reader,
    collapsedSplitPanes.search,
    collapsedSplitPanes.study,
    isSplitViewActive,
    searchPaneWidthRem,
    showReaderSearchDivider,
    showSearchStudyDivider,
    splitPaneDividerWidthRem,
    splitPaneRailWidthRem,
    studyPaneWidthRem
  ]);

  const beginSearchResize = (startClientX: number) => {
    const startingWidthRem = searchPaneWidthRem;
    const rootFontSize = getRootFontSize();

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - startClientX;
      setSearchPaneWidthRem(Math.max(0, startingWidthRem - deltaX / rootFontSize));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const beginStudyResize = (startClientX: number) => {
    const startingWidthRem = studyPaneWidthRem;
    const rootFontSize = getRootFontSize();

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - startClientX;
      setStudyPaneWidthRem(Math.max(0, startingWidthRem - deltaX / rootFontSize));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      className={`app-layout${isSplitViewActive ? " app-layout-split" : ""}`}
      style={
        splitGridTemplateColumns ? { gridTemplateColumns: splitGridTemplateColumns } : undefined
      }
    >
      {collapsedSplitPanes.reader ? (
        <aside aria-label="Reader pane rail" className="split-pane-rail split-pane-rail-reader">
          <button
            aria-label="Show reader pane"
            className="split-pane-rail-button"
            onClick={() => expandSplitPane("reader")}
            type="button"
          >
            Reader
          </button>
        </aside>
      ) : (
        <div className="app-layout-reader-pane">
          <div className="app-layout-reader-pane-actions">
            <button
              aria-label="Hide reader pane"
              className="split-pane-hide-button"
              disabled={!canCollapseSplitPane("reader")}
              onClick={() => collapseSplitPane("reader")}
              type="button"
            >
              Hide
            </button>
          </div>
          <main className="site-main app-layout-main">{children}</main>
        </div>
      )}
      {showReaderSearchDivider ? (
        <button
          aria-label="Resize reader and search panes"
          className="app-layout-divider"
          onDoubleClick={() => setSearchPaneWidthRem(null)}
          onPointerDown={(event) => beginSearchResize(event.clientX)}
          title="Drag to resize reader and search panes. Double-click to reset."
          type="button"
        />
      ) : null}
      <SearchPane />
      {showSearchStudyDivider ? (
        <button
          aria-label="Resize search and study panes"
          className="app-layout-divider"
          onDoubleClick={() => setStudyPaneWidthRem(null)}
          onPointerDown={(event) => beginStudyResize(event.clientX)}
          title="Drag to resize search and study panes. Double-click to reset."
          type="button"
        />
      ) : null}
      <LookupPane />
    </div>
  );
}
