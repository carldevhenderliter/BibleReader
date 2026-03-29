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

const DESKTOP_LOOKUP_MEDIA_QUERY = "(min-width: 64rem)";

type LookupContextValue = {
  query: string;
  queryParts: string[];
  setQuery: (value: string) => void;
  resultGroups: BibleSearchResultGroup[];
  isDesktop: boolean;
  isOpen: boolean;
  isSearching: boolean;
  clearSearch: () => void;
  closeSearch: () => void;
  openSearch: () => void;
  selectResult: (href: string) => void;
};

const LookupContext = createContext<LookupContextValue | null>(null);

function getDesktopMediaMatch() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DESKTOP_LOOKUP_MEDIA_QUERY).matches;
}

export function LookupProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const [query, setQuery] = useState("");
  const [resultGroups, setResultGroups] = useState<BibleSearchResultGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => getDesktopMediaMatch());
  const queryParts = useMemo(() => parseBibleSearchQueries(query), [query]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(DESKTOP_LOOKUP_MEDIA_QUERY);
    const handleChange = () => {
      setIsDesktop(mediaQuery.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) {
      return;
    }

    setIsOpen(false);
    setQuery("");
    setResultGroups([]);
  }, [isDesktop, pathname]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!isOpen && !isDesktop) {
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
  }, [isDesktop, isOpen, query, version]);

  const value = useMemo<LookupContextValue>(
    () => ({
      query,
      queryParts,
      setQuery: (value) => {
        setQuery(value);

        if (value.trim().length > 0 || isDesktop) {
          setIsOpen(true);
        }
      },
      resultGroups,
      isDesktop,
      isOpen,
      isSearching,
      clearSearch: () => {
        setQuery("");
        setResultGroups([]);

        if (!isDesktop) {
          setIsOpen(false);
        }
      },
      closeSearch: () => {
        if (isDesktop) {
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

        if (!isDesktop) {
          setIsOpen(false);
          setQuery("");
          setResultGroups([]);
        } else {
          setIsOpen(true);
        }
      }
    }),
    [isDesktop, isOpen, isSearching, query, queryParts, resultGroups, router]
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
