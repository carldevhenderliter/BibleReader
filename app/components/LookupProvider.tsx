"use client";

import {
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
import type { BibleSearchResult, BibleSearchResultGroup, SearchMatchMode } from "@/lib/bible/types";

const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 64rem)";
const SEARCH_MATCH_MODE_STORAGE_KEY = "bible-reader.search-match-mode";
const SEARCH_SHOW_STRONGS_STORAGE_KEY = "bible-reader.search-show-strongs";

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

  return /iPad/i.test(userAgent) || ((/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) && maxTouchPoints > 1);
}

function getSplitViewActive() {
  return getSplitViewMediaMatch() || getIsIpadDevice();
}

function normalizeSearchMatchMode(value: string | null): SearchMatchMode {
  return value === "complete" ? "complete" : "partial";
}

function normalizeShowStrongsInSearch(value: string | null) {
  return value === "true";
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
  const { setActiveStudyVerseNumber, setActiveUtilityPane } = useReaderWorkspace();
  const [query, setQuery] = useState("");
  const [resultGroups, setResultGroups] = useState<BibleSearchResultGroup[]>([]);
  const [matchMode, setMatchMode] = useState<SearchMatchMode>("partial");
  const [showStrongsInSearch, setShowStrongsInSearch] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSplitViewActive, setIsSplitViewActive] = useState(() => getSplitViewActive());
  const [expandedTopicsByQuery, setExpandedTopicsByQuery] = useState<Record<string, string>>({});
  const queryParts = useMemo(() => parseBibleSearchQueries(query), [query]);

  useEffect(() => {
    setMatchMode(normalizeSearchMatchMode(window.localStorage.getItem(SEARCH_MATCH_MODE_STORAGE_KEY)));
    setShowStrongsInSearch(
      normalizeShowStrongsInSearch(window.localStorage.getItem(SEARCH_SHOW_STRONGS_STORAGE_KEY))
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_MATCH_MODE_STORAGE_KEY, matchMode);
  }, [matchMode]);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_SHOW_STRONGS_STORAGE_KEY, String(showStrongsInSearch));
  }, [showStrongsInSearch]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(SPLIT_VIEW_MEDIA_QUERY);
    const syncSplitView = () => {
      setIsSplitViewActive(getSplitViewActive());
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

    void searchBibleGroups(trimmedQuery, version, matchMode, expandedTopicsByQuery).then((nextResults) => {
      if (isCancelled) {
        return;
      }

      setResultGroups(nextResults);
      setIsSearching(false);
    });

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
        setActiveUtilityPane("search");

        if (value.trim().length > 0 || isSplitViewActive) {
          setIsOpen(true);
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
        setActiveUtilityPane("search");
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
      query,
      queryParts,
      resultGroups,
      router,
      showStrongsInSearch
      ,
      setActiveStudyVerseNumber,
      setActiveUtilityPane
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
