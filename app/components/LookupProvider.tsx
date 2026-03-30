"use client";

import {
  useCallback,
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { parseBibleSearchQueries, searchBibleGroups } from "@/lib/bible/search";
import type {
  BibleSearchResult,
  BibleSearchResultGroup,
  SearchMatchMode
} from "@/lib/bible/types";

const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 64rem)";
const SEARCH_MATCH_MODE_STORAGE_KEY = "bible-reader.search-match-mode";
const SEARCH_SHOW_STRONGS_STORAGE_KEY = "bible-reader.search-show-strongs";
const SPLIT_SEARCH_WIDTH_STORAGE_KEY = "bible-reader.split-search-width-rem";
const SPLIT_STUDY_WIDTH_STORAGE_KEY = "bible-reader.split-study-width-rem";
const SPLIT_COLLAPSED_PANES_STORAGE_KEY = "bible-reader.split-collapsed-panes";
const APP_LAYOUT_MAX_WIDTH_REM = 103.25;
const SEARCH_SHELL_VIEWPORT_MARGIN_REM = 2.7;
const NON_READER_MAX_VIEWPORT_RATIO = 0.75;
const SPLIT_PANE_DIVIDER_WIDTH_REM = 0.875;
const SPLIT_PANE_RAIL_WIDTH_REM = 3;
const MIN_READER_PANE_WIDTH_REM = 12;
const MIN_SEARCH_PANE_WIDTH_REM = 14;
const DEFAULT_SEARCH_PANE_WIDTH_REM = 18;
const SEARCH_PANE_WIDTH_PER_EXTRA_QUERY_REM = 14;
const MIN_STUDY_PANE_WIDTH_REM = 16;
const DEFAULT_STUDY_PANE_WIDTH_REM = 18;

type SplitPane = "reader" | "search" | "study";
type CollapsedSplitPanes = Record<SplitPane, boolean>;

const DEFAULT_COLLAPSED_SPLIT_PANES: CollapsedSplitPanes = {
  reader: false,
  search: false,
  study: false
};

type LookupContextValue = {
  query: string;
  queryParts: string[];
  setQuery: (value: string) => void;
  resultGroups: BibleSearchResultGroup[];
  matchMode: SearchMatchMode;
  setMatchMode: (value: SearchMatchMode) => void;
  showStrongsInSearch: boolean;
  setShowStrongsInSearch: (value: boolean) => void;
  isSplitViewActive: boolean;
  isOpen: boolean;
  isSearching: boolean;
  collapsedSplitPanes: CollapsedSplitPanes;
  canCollapseSplitPane: (pane: SplitPane) => boolean;
  collapseSplitPane: (pane: SplitPane) => void;
  expandSplitPane: (pane: SplitPane) => void;
  searchPaneWidthRem: number;
  setSearchPaneWidthRem: (value: number | null) => void;
  studyPaneWidthRem: number;
  setStudyPaneWidthRem: (value: number | null) => void;
  splitPaneRailWidthRem: number;
  splitPaneDividerWidthRem: number;
  searchShellLeftOffsetRem: number;
  searchShellRightOffsetRem: number;
  clearSearch: () => void;
  closeSearch: () => void;
  openSearch: () => void;
  selectResult: (result: BibleSearchResult, groupQuery?: string) => void;
};

const LookupContext = createContext<LookupContextValue | null>(null);

function getSplitViewMediaMatch() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(SPLIT_VIEW_MEDIA_QUERY).matches;
}

function getIsIpadDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent ?? "";
  const platform = navigator.platform ?? "";
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  return (
    /iPad/i.test(userAgent) ||
    ((/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) && maxTouchPoints > 1)
  );
}

function getSplitViewActive() {
  return getSplitViewMediaMatch() || getIsIpadDevice();
}

function getRootFontSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function getViewportWidthRem() {
  return typeof window === "undefined" ? APP_LAYOUT_MAX_WIDTH_REM : window.innerWidth / getRootFontSize();
}

function clampRange(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSearchMatchMode(value: string | null): SearchMatchMode {
  return value === "complete" ? "complete" : "partial";
}

function normalizeShowStrongsInSearch(value: string | null) {
  return value === "true";
}

function normalizeCollapsedSplitPanes(value: string | null): CollapsedSplitPanes {
  if (!value) {
    return DEFAULT_COLLAPSED_SPLIT_PANES;
  }

  try {
    const parsedValue = JSON.parse(value);

    return {
      reader: parsedValue?.reader === true,
      search: parsedValue?.search === true,
      study: parsedValue?.study === true
    };
  } catch {
    return DEFAULT_COLLAPSED_SPLIT_PANES;
  }
}

function pruneExpandedTopics(expandedTopicsByQuery: Record<string, string>, nextQuery: string) {
  const nextQueryParts = new Set(parseBibleSearchQueries(nextQuery));

  return Object.fromEntries(
    Object.entries(expandedTopicsByQuery).filter(([queryPart]) => nextQueryParts.has(queryPart))
  );
}

export function LookupProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const { setActiveStudyVerseNumber } = useReaderWorkspace();
  const [query, setQuery] = useState("");
  const [resultGroups, setResultGroups] = useState<BibleSearchResultGroup[]>([]);
  const [matchMode, setMatchMode] = useState<SearchMatchMode>("partial");
  const [showStrongsInSearch, setShowStrongsInSearch] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSplitViewActive, setIsSplitViewActive] = useState(() => getSplitViewActive());
  const [manualSearchPaneWidthRem, setManualSearchPaneWidthRem] = useState<number | null>(null);
  const [manualStudyPaneWidthRem, setManualStudyPaneWidthRem] = useState<number | null>(null);
  const [collapsedSplitPanes, setCollapsedSplitPanes] = useState<CollapsedSplitPanes>(
    DEFAULT_COLLAPSED_SPLIT_PANES
  );
  const [viewportWidthRem, setViewportWidthRem] = useState(() => getViewportWidthRem());
  const [expandedTopicsByQuery, setExpandedTopicsByQuery] = useState<Record<string, string>>({});
  const queryParts = useMemo(() => parseBibleSearchQueries(query), [query]);
  const queryCount = Math.max(queryParts.length, 1);
  const contentWidthRem = useMemo(
    () => Math.min(APP_LAYOUT_MAX_WIDTH_REM, Math.max(0, viewportWidthRem - SEARCH_SHELL_VIEWPORT_MARGIN_REM)),
    [viewportWidthRem]
  );
  const maximumNonReaderWidthRem = useMemo(() => {
    const minimumReaderWidthRem = collapsedSplitPanes.reader
      ? SPLIT_PANE_RAIL_WIDTH_REM
      : MIN_READER_PANE_WIDTH_REM;
    const minimumSideWidthRem =
      (collapsedSplitPanes.search ? SPLIT_PANE_RAIL_WIDTH_REM : MIN_SEARCH_PANE_WIDTH_REM) +
      (collapsedSplitPanes.study ? SPLIT_PANE_RAIL_WIDTH_REM : MIN_STUDY_PANE_WIDTH_REM);
    const widthCapFromViewport = viewportWidthRem * NON_READER_MAX_VIEWPORT_RATIO;
    const widthCapFromLayout = Math.max(
      minimumSideWidthRem,
      contentWidthRem - minimumReaderWidthRem - SPLIT_PANE_DIVIDER_WIDTH_REM * 2
    );

    return Math.max(minimumSideWidthRem, Math.min(widthCapFromViewport, widthCapFromLayout));
  }, [collapsedSplitPanes.reader, collapsedSplitPanes.search, collapsedSplitPanes.study, contentWidthRem, viewportWidthRem]);
  const automaticSearchPaneWidthRem = useMemo(
    () => DEFAULT_SEARCH_PANE_WIDTH_REM + (queryCount - 1) * SEARCH_PANE_WIDTH_PER_EXTRA_QUERY_REM,
    [queryCount]
  );
  const desiredStudyPaneWidthRem = manualStudyPaneWidthRem ?? DEFAULT_STUDY_PANE_WIDTH_REM;
  const studyPaneWidthRem = useMemo(() => {
    if (collapsedSplitPanes.study) {
      return SPLIT_PANE_RAIL_WIDTH_REM;
    }

    const minimumSearchWidthRem = collapsedSplitPanes.search
      ? SPLIT_PANE_RAIL_WIDTH_REM
      : MIN_SEARCH_PANE_WIDTH_REM;
    const maximumStudyWidthRem = Math.max(
      MIN_STUDY_PANE_WIDTH_REM,
      maximumNonReaderWidthRem - minimumSearchWidthRem
    );

    return clampRange(desiredStudyPaneWidthRem, MIN_STUDY_PANE_WIDTH_REM, maximumStudyWidthRem);
  }, [collapsedSplitPanes.search, collapsedSplitPanes.study, desiredStudyPaneWidthRem, maximumNonReaderWidthRem]);
  const desiredSearchPaneWidthRem = manualSearchPaneWidthRem ?? automaticSearchPaneWidthRem;
  const searchPaneWidthRem = useMemo(() => {
    if (collapsedSplitPanes.search) {
      return SPLIT_PANE_RAIL_WIDTH_REM;
    }

    const maximumSearchWidthRem = Math.max(
      MIN_SEARCH_PANE_WIDTH_REM,
      maximumNonReaderWidthRem - studyPaneWidthRem
    );

    return clampRange(desiredSearchPaneWidthRem, MIN_SEARCH_PANE_WIDTH_REM, maximumSearchWidthRem);
  }, [collapsedSplitPanes.search, desiredSearchPaneWidthRem, maximumNonReaderWidthRem, studyPaneWidthRem]);
  const readerPaneWidthRem = useMemo(() => {
    if (collapsedSplitPanes.reader) {
      return SPLIT_PANE_RAIL_WIDTH_REM;
    }

    return Math.max(
      MIN_READER_PANE_WIDTH_REM,
      contentWidthRem - SPLIT_PANE_DIVIDER_WIDTH_REM * 2 - searchPaneWidthRem - studyPaneWidthRem
    );
  }, [collapsedSplitPanes.reader, contentWidthRem, searchPaneWidthRem, studyPaneWidthRem]);
  const searchShellLeftOffsetRem = useMemo(() => {
    if (collapsedSplitPanes.search) {
      return collapsedSplitPanes.reader
        ? SPLIT_PANE_RAIL_WIDTH_REM + SPLIT_PANE_DIVIDER_WIDTH_REM
        : 0;
    }

    return readerPaneWidthRem + SPLIT_PANE_DIVIDER_WIDTH_REM;
  }, [collapsedSplitPanes.reader, collapsedSplitPanes.search, readerPaneWidthRem]);
  const searchShellRightOffsetRem = useMemo(
    () => studyPaneWidthRem + SPLIT_PANE_DIVIDER_WIDTH_REM,
    [studyPaneWidthRem]
  );

  const canCollapseSplitPane = useCallback(
    (pane: SplitPane) => {
      if (collapsedSplitPanes[pane]) {
        return true;
      }

      return (
        Object.values(collapsedSplitPanes).filter((isCollapsed) => !isCollapsed).length > 1
      );
    },
    [collapsedSplitPanes]
  );

  const setSplitPaneCollapsed = useCallback(
    (pane: SplitPane, isCollapsed: boolean) => {
      setCollapsedSplitPanes((current) => {
        if (current[pane] === isCollapsed) {
          return current;
        }

        if (isCollapsed) {
          const expandedPaneCount = Object.values(current).filter((value) => !value).length;

          if (!current[pane] && expandedPaneCount <= 1) {
            return current;
          }
        }

        return {
          ...current,
          [pane]: isCollapsed
        };
      });
    },
    []
  );

  const collapseSplitPane = useCallback(
    (pane: SplitPane) => setSplitPaneCollapsed(pane, true),
    [setSplitPaneCollapsed]
  );
  const expandSplitPane = useCallback(
    (pane: SplitPane) => setSplitPaneCollapsed(pane, false),
    [setSplitPaneCollapsed]
  );

  useEffect(() => {
    setMatchMode(normalizeSearchMatchMode(window.localStorage.getItem(SEARCH_MATCH_MODE_STORAGE_KEY)));
    setShowStrongsInSearch(
      normalizeShowStrongsInSearch(window.localStorage.getItem(SEARCH_SHOW_STRONGS_STORAGE_KEY))
    );
    setManualSearchPaneWidthRem(() => {
      const storedValue = window.localStorage.getItem(SPLIT_SEARCH_WIDTH_STORAGE_KEY);
      const parsedValue = Number(storedValue);

      return Number.isFinite(parsedValue) ? parsedValue : null;
    });
    setManualStudyPaneWidthRem(() => {
      const storedValue = window.localStorage.getItem(SPLIT_STUDY_WIDTH_STORAGE_KEY);
      const parsedValue = Number(storedValue);

      return Number.isFinite(parsedValue) ? parsedValue : null;
    });
    setCollapsedSplitPanes(
      normalizeCollapsedSplitPanes(window.localStorage.getItem(SPLIT_COLLAPSED_PANES_STORAGE_KEY))
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_MATCH_MODE_STORAGE_KEY, matchMode);
  }, [matchMode]);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_SHOW_STRONGS_STORAGE_KEY, String(showStrongsInSearch));
  }, [showStrongsInSearch]);

  useEffect(() => {
    if (manualSearchPaneWidthRem === null) {
      window.localStorage.removeItem(SPLIT_SEARCH_WIDTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPLIT_SEARCH_WIDTH_STORAGE_KEY, String(manualSearchPaneWidthRem));
  }, [manualSearchPaneWidthRem]);

  useEffect(() => {
    if (manualStudyPaneWidthRem === null) {
      window.localStorage.removeItem(SPLIT_STUDY_WIDTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPLIT_STUDY_WIDTH_STORAGE_KEY, String(manualStudyPaneWidthRem));
  }, [manualStudyPaneWidthRem]);

  useEffect(() => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify(collapsedSplitPanes)
    );
  }, [collapsedSplitPanes]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(SPLIT_VIEW_MEDIA_QUERY);
    const syncSplitView = () => {
      setIsSplitViewActive(getSplitViewActive());
      setViewportWidthRem(getViewportWidthRem());
    };

    syncSplitView();
    mediaQuery.addEventListener("change", syncSplitView);
    window.addEventListener("resize", syncSplitView);

    return () => {
      mediaQuery.removeEventListener("change", syncSplitView);
      window.removeEventListener("resize", syncSplitView);
    };
  }, []);

  useEffect(() => {
    if (isSplitViewActive) {
      return;
    }

    setIsOpen(false);
    setQuery("");
    setResultGroups([]);
    setExpandedTopicsByQuery({});
  }, [isSplitViewActive, pathname]);

  useEffect(() => {
    if (manualStudyPaneWidthRem === null || collapsedSplitPanes.study) {
      return;
    }

    if (studyPaneWidthRem !== manualStudyPaneWidthRem) {
      setManualStudyPaneWidthRem(studyPaneWidthRem);
    }
  }, [collapsedSplitPanes.study, manualStudyPaneWidthRem, studyPaneWidthRem]);

  useEffect(() => {
    if (manualSearchPaneWidthRem === null || collapsedSplitPanes.search) {
      return;
    }

    if (searchPaneWidthRem !== manualSearchPaneWidthRem) {
      setManualSearchPaneWidthRem(searchPaneWidthRem);
    }
  }, [collapsedSplitPanes.search, manualSearchPaneWidthRem, searchPaneWidthRem]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!isOpen && !isSplitViewActive) {
      return;
    }

    if (!trimmedQuery) {
      setResultGroups([]);
      setIsSearching(false);
      return;
    }

    let isCancelled = false;
    setIsSearching(true);
    setResultGroups([]);

    void searchBibleGroups(trimmedQuery, version, matchMode, expandedTopicsByQuery).then(
      (nextResults) => {
        if (isCancelled) {
          return;
        }

        setResultGroups(nextResults);
        setIsSearching(false);
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [expandedTopicsByQuery, isOpen, isSplitViewActive, matchMode, query, version]);

  const value = useMemo<LookupContextValue>(
    () => ({
      query,
      queryParts,
      setQuery: (value) => {
        setQuery(value);
        setExpandedTopicsByQuery((current) => pruneExpandedTopics(current, value));

        if (value.trim().length > 0 || isSplitViewActive) {
          setIsOpen(true);
        }

        if (isSplitViewActive && value.trim().length > 0) {
          expandSplitPane("search");
        }
      },
      resultGroups,
      matchMode,
      setMatchMode,
      showStrongsInSearch,
      setShowStrongsInSearch,
      isSplitViewActive,
      isOpen,
      isSearching,
      collapsedSplitPanes,
      canCollapseSplitPane,
      collapseSplitPane,
      expandSplitPane,
      searchPaneWidthRem,
      setSearchPaneWidthRem: setManualSearchPaneWidthRem,
      studyPaneWidthRem,
      setStudyPaneWidthRem: setManualStudyPaneWidthRem,
      splitPaneRailWidthRem: SPLIT_PANE_RAIL_WIDTH_REM,
      splitPaneDividerWidthRem: SPLIT_PANE_DIVIDER_WIDTH_REM,
      searchShellLeftOffsetRem,
      searchShellRightOffsetRem,
      clearSearch: () => {
        setQuery("");
        setResultGroups([]);
        setExpandedTopicsByQuery({});

        if (!isSplitViewActive) {
          setIsOpen(false);
        }
      },
      closeSearch: () => {
        if (isSplitViewActive) {
          setQuery("");
          setResultGroups([]);
          setIsSearching(false);
          setExpandedTopicsByQuery({});
        }

        setIsOpen(false);
      },
      openSearch: () => {
        if (isSplitViewActive) {
          expandSplitPane("search");
        }

        setIsOpen(true);
      },
      selectResult: (result, groupQuery) => {
        if (result.type === "topic-suggestion") {
          if (!groupQuery) {
            return;
          }

          setExpandedTopicsByQuery((current) => ({
            ...current,
            [groupQuery]: result.topicId
          }));
          setIsOpen(true);
          return;
        }

        if (!("href" in result)) {
          return;
        }

        if (result.type === "verse") {
          setActiveStudyVerseNumber(result.verseNumber);
        } else if (result.type === "chapter") {
          setActiveStudyVerseNumber(null);
        }

        router.push(result.href);

        if (!isSplitViewActive) {
          setIsOpen(false);
          setQuery("");
          setResultGroups([]);
          setExpandedTopicsByQuery({});
        } else {
          setIsOpen(true);
        }
      }
    }),
    [
      isOpen,
      isSearching,
      isSplitViewActive,
      matchMode,
      canCollapseSplitPane,
      collapseSplitPane,
      collapsedSplitPanes,
      expandSplitPane,
      query,
      queryParts,
      resultGroups,
      router,
      searchPaneWidthRem,
      searchShellLeftOffsetRem,
      searchShellRightOffsetRem,
      setActiveStudyVerseNumber,
      studyPaneWidthRem,
      showStrongsInSearch
    ]
  );

  return <LookupContext.Provider value={value}>{children}</LookupContext.Provider>;
}

export function useLookup() {
  const context = useContext(LookupContext);

  if (!context) {
    throw new Error("useLookup must be used within LookupProvider.");
  }

  return context;
}
