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
import { parseBibleSearchQueries, searchBibleGroups } from "@/lib/bible/search";
import type { BibleSearchResultGroup } from "@/lib/bible/types";

const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 64rem)";

type LookupContextValue = {
  query: string;
  queryParts: string[];
  setQuery: (value: string) => void;
  resultGroups: BibleSearchResultGroup[];
  isSplitViewActive: boolean;
  isOpen: boolean;
  isSearching: boolean;
  clearSearch: () => void;
  closeSearch: () => void;
  openSearch: () => void;
  selectResult: (href: string) => void;
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

export function LookupProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const [query, setQuery] = useState("");
  const [resultGroups, setResultGroups] = useState<BibleSearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSplitViewActive, setIsSplitViewActive] = useState(() => getSplitViewActive());
  const queryParts = useMemo(() => parseBibleSearchQueries(query), [query]);

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

    void searchBibleGroups(trimmedQuery, version).then((nextResults) => {
      if (isCancelled) {
        return;
      }

      setResultGroups(nextResults);
      setIsSearching(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [isOpen, isSplitViewActive, query, version]);

  const value = useMemo<LookupContextValue>(
    () => ({
      query,
      queryParts,
      setQuery: (value) => {
        setQuery(value);

        if (value.trim().length > 0 || isSplitViewActive) {
          setIsOpen(true);
        }
      },
      resultGroups,
      isSplitViewActive,
      isOpen,
      isSearching,
      clearSearch: () => {
        setQuery("");
        setResultGroups([]);

        if (!isSplitViewActive) {
          setIsOpen(false);
        }
      },
      closeSearch: () => {
        if (isSplitViewActive) {
          setQuery("");
          setResultGroups([]);
          setIsSearching(false);
        }

        setIsOpen(false);
      },
      openSearch: () => {
        setIsOpen(true);
      },
      selectResult: (href) => {
        router.push(href);

        if (!isSplitViewActive) {
          setIsOpen(false);
          setQuery("");
          setResultGroups([]);
        } else {
          setIsOpen(true);
        }
      }
    }),
    [isOpen, isSearching, isSplitViewActive, query, queryParts, resultGroups, router]
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
