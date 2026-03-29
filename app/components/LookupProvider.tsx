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

import { buildBibleAiPrompt } from "@/lib/ai/bible-assistant";
import {
  generateLocalBibleAiAnswer,
  getLocalBibleAiAvailability,
  loadLocalBibleAi,
  normalizeLocalBibleAiProgress
} from "@/lib/ai/browser-llm";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { parseBibleSearchQueries, searchBibleGroups } from "@/lib/bible/search";
import type {
  BibleSearchResult,
  BibleSearchResultGroup,
  LocalBibleAiAnswer,
  LocalBibleAiSource,
  LocalBibleAiStatus,
  SearchMatchMode,
  SearchMode
} from "@/lib/bible/types";

const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 64rem)";
const SEARCH_MODE_STORAGE_KEY = "bible-reader.search-mode";
const SEARCH_MATCH_MODE_STORAGE_KEY = "bible-reader.search-match-mode";
const SEARCH_SHOW_STRONGS_STORAGE_KEY = "bible-reader.search-show-strongs";

type LookupContextValue = {
  query: string;
  queryParts: string[];
  setQuery: (value: string) => void;
  resultGroups: BibleSearchResultGroup[];
  searchMode: SearchMode;
  setSearchMode: (value: SearchMode) => void;
  matchMode: SearchMatchMode;
  setMatchMode: (value: SearchMatchMode) => void;
  showStrongsInSearch: boolean;
  setShowStrongsInSearch: (value: boolean) => void;
  aiStatus: LocalBibleAiStatus;
  aiAvailabilityReason: string;
  aiProgressLabel: string;
  aiProgressValue: number;
  aiAnswer: LocalBibleAiAnswer | null;
  enableAi: () => Promise<void>;
  askAi: () => Promise<void>;
  selectAiSource: (source: LocalBibleAiSource) => void;
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

  return (
    /iPad/i.test(userAgent) ||
    ((/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) && maxTouchPoints > 1)
  );
}

function getSplitViewActive() {
  return getSplitViewMediaMatch() || getIsIpadDevice();
}

function normalizeSearchMode(value: string | null): SearchMode {
  return value === "ai" ? "ai" : "lookup";
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
  const {
    activeStudyVerseNumber,
    activeUtilityPane,
    currentChapterByVersion,
    currentPassage,
    getBookmarksForPassage,
    getHighlightsForPassage,
    getNotebook,
    getStudySets,
    setActiveStudyVerseNumber,
    setActiveUtilityPane
  } = useReaderWorkspace();
  const [query, setQuery] = useState("");
  const [resultGroups, setResultGroups] = useState<BibleSearchResultGroup[]>([]);
  const [searchMode, setSearchMode] = useState<SearchMode>("lookup");
  const [matchMode, setMatchMode] = useState<SearchMatchMode>("partial");
  const [showStrongsInSearch, setShowStrongsInSearch] = useState(false);
  const [aiStatus, setAiStatus] = useState<LocalBibleAiStatus>("disabled");
  const [aiAvailabilityReason, setAiAvailabilityReason] = useState(
    "Enable local AI to ask Bible study questions."
  );
  const [aiProgressLabel, setAiProgressLabel] = useState("");
  const [aiProgressValue, setAiProgressValue] = useState(0);
  const [aiAnswer, setAiAnswer] = useState<LocalBibleAiAnswer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSplitViewActive, setIsSplitViewActive] = useState(() => getSplitViewActive());
  const [expandedTopicsByQuery, setExpandedTopicsByQuery] = useState<Record<string, string>>({});
  const queryParts = useMemo(() => parseBibleSearchQueries(query), [query]);

  useEffect(() => {
    setSearchMode(normalizeSearchMode(window.localStorage.getItem(SEARCH_MODE_STORAGE_KEY)));
    setMatchMode(normalizeSearchMatchMode(window.localStorage.getItem(SEARCH_MATCH_MODE_STORAGE_KEY)));
    setShowStrongsInSearch(
      normalizeShowStrongsInSearch(window.localStorage.getItem(SEARCH_SHOW_STRONGS_STORAGE_KEY))
    );
    const availability = getLocalBibleAiAvailability();
    setAiAvailabilityReason(
      availability.isSupported
        ? "Enable local AI to ask Bible study questions."
        : availability.reason
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_MODE_STORAGE_KEY, searchMode);
  }, [searchMode]);

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
    setAiAnswer(null);
    setExpandedTopicsByQuery({});
  }, [isSplitViewActive, pathname]);

  useEffect(() => {
    if (searchMode !== "lookup") {
      setResultGroups([]);
      setIsSearching(false);
      return;
    }

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
  }, [expandedTopicsByQuery, isOpen, isSplitViewActive, matchMode, query, searchMode, version]);

  const value = useMemo<LookupContextValue>(
    () => ({
      query,
      queryParts,
      setQuery: (value) => {
        setQuery(value);
        setAiAnswer(null);
        setExpandedTopicsByQuery((current) => pruneExpandedTopics(current, value));
        if (activeUtilityPane !== "notebook") {
          setActiveUtilityPane("search");
        }

        if (value.trim().length > 0 || isSplitViewActive) {
          setIsOpen(true);
        }
      },
      resultGroups,
      searchMode,
      setSearchMode: (value) => {
        setSearchMode(value);
        if (value === "lookup") {
          setAiAnswer(null);
        } else {
          setResultGroups([]);
          setIsSearching(false);
        }
      },
      matchMode,
      setMatchMode,
      showStrongsInSearch,
      setShowStrongsInSearch,
      aiStatus,
      aiAvailabilityReason,
      aiProgressLabel,
      aiProgressValue,
      aiAnswer,
      enableAi: async () => {
        const availability = getLocalBibleAiAvailability();

        if (!availability.isSupported) {
          setAiStatus("disabled");
          setAiAvailabilityReason(availability.reason);
          return;
        }

        setAiStatus("downloading");
        setAiAvailabilityReason("");
        setAiProgressLabel("Preparing local AI…");
        setAiProgressValue(0);

        try {
          await loadLocalBibleAi((report) => {
            const progress = normalizeLocalBibleAiProgress(report);
            setAiProgressLabel(progress.label || "Downloading local model…");
            setAiProgressValue(progress.progress);
          });
          setAiStatus("ready");
          setAiProgressLabel("Local AI ready.");
          setAiProgressValue(1);
        } catch (error) {
          setAiStatus("error");
          setAiAvailabilityReason(
            error instanceof Error ? error.message : "Local AI could not be started."
          );
        }
      },
      askAi: async () => {
        const trimmedQuery = query.trim();

        if (!trimmedQuery) {
          return;
        }

        const availability = getLocalBibleAiAvailability();

        if (!availability.isSupported) {
          setAiStatus("disabled");
          setAiAvailabilityReason(availability.reason);
          return;
        }

        if (aiStatus === "disabled" || aiStatus === "error") {
          try {
            setAiStatus("downloading");
            await loadLocalBibleAi((report) => {
              const progress = normalizeLocalBibleAiProgress(report);
              setAiProgressLabel(progress.label || "Downloading local model…");
              setAiProgressValue(progress.progress);
            });
            setAiStatus("ready");
            setAiProgressLabel("Local AI ready.");
            setAiProgressValue(1);
          } catch (error) {
            setAiStatus("error");
            setAiAvailabilityReason(
              error instanceof Error ? error.message : "Local AI could not be started."
            );
            return;
          }
        }

        setAiStatus("generating");
        setAiAvailabilityReason("");
        setAiAnswer(null);

        try {
          const currentChapter = currentChapterByVersion?.[version] ?? null;
          const notebook = currentPassage
            ? getNotebook(currentPassage.bookSlug, currentPassage.chapterNumber)
            : null;
          const highlights = currentPassage
            ? getHighlightsForPassage(currentPassage.bookSlug, currentPassage.chapterNumber)
            : [];
          const bookmarks = currentPassage
            ? getBookmarksForPassage(currentPassage.bookSlug, currentPassage.chapterNumber)
            : [];
          const prompt = await buildBibleAiPrompt({
            query: trimmedQuery,
            version,
            currentPassage,
            currentChapter,
            activeStudyVerseNumber,
            notebook,
            studySets: getStudySets(),
            highlights,
            bookmarks
          });
          const answerText = await generateLocalBibleAiAnswer(prompt);

          setAiAnswer({
            query: trimmedQuery,
            answer:
              answerText.trim() ||
              "The local AI could not generate an answer from the available Bible context.",
            sources: prompt.sources
          });
          setAiStatus("ready");
        } catch (error) {
          setAiStatus("error");
          setAiAvailabilityReason(
            error instanceof Error ? error.message : "Local AI could not answer this question."
          );
        }
      },
      selectAiSource: (source) => {
        if (source.verseNumber != null) {
          setActiveStudyVerseNumber(source.verseNumber);
        }

        router.push(source.href);

        if (!isSplitViewActive) {
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      },
      isSplitViewActive,
      isOpen,
      isSearching,
      clearSearch: () => {
        setQuery("");
        setResultGroups([]);
        setAiAnswer(null);
        setExpandedTopicsByQuery({});

        if (!isSplitViewActive) {
          setIsOpen(false);
        }
      },
      closeSearch: () => {
        if (isSplitViewActive) {
          setQuery("");
          setResultGroups([]);
          setAiAnswer(null);
          setIsSearching(false);
          setExpandedTopicsByQuery({});
        }

        setIsOpen(false);
      },
      openSearch: () => {
        if (activeUtilityPane !== "notebook") {
          setActiveUtilityPane("search");
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
          setAiAnswer(null);
          setExpandedTopicsByQuery({});
        } else {
          setIsOpen(true);
        }
      }
    }),
    [
      activeStudyVerseNumber,
      activeUtilityPane,
      aiAnswer,
      aiAvailabilityReason,
      aiProgressLabel,
      aiProgressValue,
      aiStatus,
      currentChapterByVersion,
      currentPassage,
      getBookmarksForPassage,
      getHighlightsForPassage,
      getNotebook,
      getStudySets,
      isOpen,
      isSearching,
      isSplitViewActive,
      matchMode,
      query,
      queryParts,
      resultGroups,
      router,
      searchMode,
      setActiveStudyVerseNumber,
      setActiveUtilityPane,
      showStrongsInSearch,
      version
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
