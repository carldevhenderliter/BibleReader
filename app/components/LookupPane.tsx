"use client";

import { useEffect, useId, useState } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchResultGroups } from "@/app/components/SearchResultGroups";
import { getBibleVersionLabel } from "@/lib/bible/version";

const LOOKUP_PANE_WIDTH_STORAGE_KEY = "bible-reader.lookup-pane-width-rem";
const MIN_LOOKUP_PANE_WIDTH_REM = 16;
const MAX_LOOKUP_PANE_WIDTH_REM = 26;
const DEFAULT_LOOKUP_PANE_WIDTH_REM = 18;

function clampLookupPaneWidth(value: number) {
  return Math.min(MAX_LOOKUP_PANE_WIDTH_REM, Math.max(MIN_LOOKUP_PANE_WIDTH_REM, value));
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
  const { version } = useReaderVersion();
  const widthInputId = useId();
  const [paneWidthRem, setPaneWidthRem] = useState(DEFAULT_LOOKUP_PANE_WIDTH_REM);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(LOOKUP_PANE_WIDTH_STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    const parsedValue = Number(storedValue);

    if (!Number.isFinite(parsedValue)) {
      return;
    }

    setPaneWidthRem(clampLookupPaneWidth(parsedValue));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOOKUP_PANE_WIDTH_STORAGE_KEY, String(paneWidthRem));
  }, [paneWidthRem]);

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
      <div className="lookup-pane-width-control">
        <label className="lookup-pane-width-label" htmlFor={widthInputId}>
          Result width
        </label>
        <input
          className="lookup-pane-width-input"
          id={widthInputId}
          max={MAX_LOOKUP_PANE_WIDTH_REM}
          min={MIN_LOOKUP_PANE_WIDTH_REM}
          onChange={(event) => {
            setPaneWidthRem(clampLookupPaneWidth(Number(event.target.value)));
          }}
          step={1}
          type="range"
          value={paneWidthRem}
        />
        <span className="lookup-pane-width-value">{paneWidthRem}rem</span>
      </div>
      {!isOpen || !query.trim() ? (
        <p className="search-empty-copy">
          Search from the bottom bar to open books, chapters, verses, words, phrases, or comma-separated groups here.
        </p>
      ) : (
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
          paneWidthRem={paneWidthRem}
          variant="panes"
        />
      )}
      {query ? (
        <button className="lookup-pane-reset" onClick={clearSearch} type="button">
          Reset search
        </button>
      ) : null}
    </aside>
  );
}
