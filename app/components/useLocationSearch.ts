"use client";

import { useEffect, useState } from "react";

const SEARCH_CHANGE_EVENT = "bible-reader:location-search-change";
const HISTORY_PATCHED_FLAG = "__bibleReaderHistoryPatched";

declare global {
  interface Window {
    [HISTORY_PATCHED_FLAG]?: boolean;
  }
}

function dispatchLocationSearchChange() {
  window.dispatchEvent(new Event(SEARCH_CHANGE_EVENT));
}

function patchHistoryMethods() {
  if (typeof window === "undefined" || window[HISTORY_PATCHED_FLAG]) {
    return;
  }

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = ((...args) => {
    const result = originalPushState(...args);
    dispatchLocationSearchChange();
    return result;
  }) as History["pushState"];

  window.history.replaceState = ((...args) => {
    const result = originalReplaceState(...args);
    dispatchLocationSearchChange();
    return result;
  }) as History["replaceState"];

  window[HISTORY_PATCHED_FLAG] = true;
}

export function useLocationSearch() {
  const [locationSearch, setLocationSearch] = useState(() =>
    typeof window === "undefined" ? "" : window.location.search
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    patchHistoryMethods();

    const updateLocationSearch = () => {
      setLocationSearch(window.location.search);
    };

    updateLocationSearch();

    window.addEventListener("popstate", updateLocationSearch);
    window.addEventListener(SEARCH_CHANGE_EVENT, updateLocationSearch);

    return () => {
      window.removeEventListener("popstate", updateLocationSearch);
      window.removeEventListener(SEARCH_CHANGE_EVENT, updateLocationSearch);
    };
  }, []);

  return locationSearch;
}
