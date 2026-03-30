"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const LOOKUP_STUDY_HEIGHT_STORAGE_KEY = "bible-reader.lookup-study-height-px";
const DEFAULT_LOOKUP_STUDY_HEIGHT_PX = 320;
const MIN_LOOKUP_STUDY_HEIGHT_PX = 220;
const MIN_LOOKUP_SEARCH_HEIGHT_PX = 280;
const FALLBACK_LOOKUP_BODY_HEIGHT_PX = 720;
const LOOKUP_STUDY_DIVIDER_HEIGHT_PX = 14;

function getLookupBodyHeight(element: HTMLDivElement | null) {
  return element?.clientHeight || FALLBACK_LOOKUP_BODY_HEIGHT_PX;
}

function clampLookupStudyHeightPx(value: number, bodyHeight: number) {
  const availableHeight = Math.max(0, bodyHeight - LOOKUP_STUDY_DIVIDER_HEIGHT_PX);
  const minimumStudyHeight = Math.min(
    MIN_LOOKUP_STUDY_HEIGHT_PX,
    Math.max(140, Math.round(availableHeight * 0.35))
  );
  const maximumStudyHeight = Math.max(minimumStudyHeight, availableHeight - MIN_LOOKUP_SEARCH_HEIGHT_PX);

  return Math.min(maximumStudyHeight, Math.max(minimumStudyHeight, value));
}

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
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [lookupBodyHeight, setLookupBodyHeight] = useState(FALLBACK_LOOKUP_BODY_HEIGHT_PX);
  const [manualStudyHeightPx, setManualStudyHeightPx] = useState<number | null>(null);

  const effectiveStudyHeightPx = useMemo(
    () =>
      clampLookupStudyHeightPx(
        manualStudyHeightPx ?? DEFAULT_LOOKUP_STUDY_HEIGHT_PX,
        lookupBodyHeight
      ),
    [lookupBodyHeight, manualStudyHeightPx]
  );

  useEffect(() => {
    if (!isReaderRoute) {
      return;
    }

    const syncBodyHeight = () => {
      setLookupBodyHeight(getLookupBodyHeight(bodyRef.current));
    };

    syncBodyHeight();

    if (typeof ResizeObserver === "undefined" || !bodyRef.current) {
      window.addEventListener("resize", syncBodyHeight);

      return () => {
        window.removeEventListener("resize", syncBodyHeight);
      };
    }

    const observer = new ResizeObserver(() => {
      syncBodyHeight();
    });

    observer.observe(bodyRef.current);
    window.addEventListener("resize", syncBodyHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncBodyHeight);
    };
  }, [isReaderRoute]);

  useEffect(() => {
    if (!isReaderRoute) {
      return;
    }

    const storedValue = window.localStorage.getItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    const parsedValue = Number(storedValue);

    if (!Number.isFinite(parsedValue)) {
      window.localStorage.removeItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY);
      return;
    }

    setManualStudyHeightPx(clampLookupStudyHeightPx(parsedValue, lookupBodyHeight));
  }, [isReaderRoute, lookupBodyHeight]);

  useEffect(() => {
    if (!isReaderRoute || manualStudyHeightPx === null) {
      return;
    }

    const clampedHeight = clampLookupStudyHeightPx(manualStudyHeightPx, lookupBodyHeight);

    if (clampedHeight !== manualStudyHeightPx) {
      setManualStudyHeightPx(clampedHeight);
    }
  }, [isReaderRoute, lookupBodyHeight, manualStudyHeightPx]);

  useEffect(() => {
    if (!isReaderRoute) {
      return;
    }

    if (manualStudyHeightPx === null) {
      window.localStorage.removeItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY, String(manualStudyHeightPx));
  }, [isReaderRoute, manualStudyHeightPx]);

  if (!isSplitViewActive) {
    return null;
  }

  const beginStudyResize = (startClientY: number) => {
    const startingHeight = effectiveStudyHeightPx;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaY = startClientY - event.clientY;
      const nextHeight = clampLookupStudyHeightPx(
        startingHeight + deltaY,
        getLookupBodyHeight(bodyRef.current)
      );

      setManualStudyHeightPx(nextHeight);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

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
      <div
        className={`lookup-pane-body${isReaderRoute ? " lookup-pane-body-has-study" : ""}`}
        ref={bodyRef}
        style={
          isReaderRoute
            ? {
                ["--lookup-study-height" as string]: `${effectiveStudyHeightPx}px`
              }
            : undefined
        }
      >
        <SearchWorkspacePanel
          className="lookup-search-workspace"
          title={`${getBibleVersionLabel(version)} search`}
          variant="panes"
        />
        {isReaderRoute ? (
          <>
            <button
              aria-label="Resize study pane"
              className="lookup-pane-study-divider"
              onDoubleClick={() => setManualStudyHeightPx(null)}
              onPointerDown={(event) => beginStudyResize(event.clientY)}
              title="Drag to resize notebook and sermon area. Double-click to reset."
              type="button"
            />
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
          </>
        ) : null}
      </div>
    </aside>
  );
}
