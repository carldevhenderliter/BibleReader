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

  const hasCollapsedPaneDock =
    isSplitViewActive &&
    (collapsedSplitPanes.reader || collapsedSplitPanes.search || collapsedSplitPanes.study);
  const showReaderPane = isSplitViewActive ? !collapsedSplitPanes.reader : true;
  const showSearchPane = isSplitViewActive ? !collapsedSplitPanes.search : false;
  const showStudyPane = isSplitViewActive ? !collapsedSplitPanes.study : false;
  const showReaderSearchDivider = isSplitViewActive && showReaderPane && showSearchPane;
  const showSearchStudyDivider = isSplitViewActive && showSearchPane && showStudyPane;
  const showReaderStudyDivider = isSplitViewActive && showReaderPane && !showSearchPane && showStudyPane;
  const splitGridTemplateColumns = useMemo(() => {
    if (!isSplitViewActive) {
      return undefined;
    }

    const columns: string[] = [];

    if (hasCollapsedPaneDock) {
      columns.push(`${splitPaneRailWidthRem}rem`);
    }

    if (showReaderPane) {
      columns.push("minmax(0, 1fr)");
    }

    if (showReaderSearchDivider || showReaderStudyDivider) {
      columns.push(`${splitPaneDividerWidthRem}rem`);
    }

    if (showSearchPane) {
      columns.push(`${searchPaneWidthRem}rem`);
    }

    if (showSearchStudyDivider) {
      columns.push(`${splitPaneDividerWidthRem}rem`);
    }

    if (showStudyPane) {
      columns.push(`${studyPaneWidthRem}rem`);
    }

    return columns.join(" ");
  }, [
    hasCollapsedPaneDock,
    isSplitViewActive,
    searchPaneWidthRem,
    showReaderSearchDivider,
    showReaderPane,
    showReaderStudyDivider,
    showSearchPane,
    showSearchStudyDivider,
    showStudyPane,
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
      {hasCollapsedPaneDock ? (
        <aside aria-label="Collapsed panes dock" className="split-pane-dock">
          {collapsedSplitPanes.reader ? (
            <button
              aria-label="Show reader pane"
              className="split-pane-rail-button"
              onClick={() => expandSplitPane("reader")}
              type="button"
            >
              Reader
            </button>
          ) : null}
          {collapsedSplitPanes.search ? (
            <button
              aria-label="Show search pane"
              className="split-pane-rail-button"
              onClick={() => expandSplitPane("search")}
              type="button"
            >
              Search
            </button>
          ) : null}
          {collapsedSplitPanes.study ? (
            <button
              aria-label="Show study pane"
              className="split-pane-rail-button"
              onClick={() => expandSplitPane("study")}
              type="button"
            >
              Study
            </button>
          ) : null}
        </aside>
      ) : null}
      {showReaderPane ? (
        <div className="app-layout-reader-pane">
          <main className="site-main app-layout-main">{children}</main>
        </div>
      ) : null}
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
      {showReaderStudyDivider ? (
        <button
          aria-label="Resize reader and study panes"
          className="app-layout-divider"
          onDoubleClick={() => setStudyPaneWidthRem(null)}
          onPointerDown={(event) => beginStudyResize(event.clientX)}
          title="Drag to resize reader and study panes. Double-click to reset."
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
