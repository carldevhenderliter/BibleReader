"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import { DEFAULT_BIBLE_VERSION, READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import type { BundledBibleVersion } from "@/lib/bible/types";
import { isBundledBibleVersion } from "@/lib/bible/version";

type ReaderVersionContextValue = {
  version: BundledBibleVersion;
  setVersion: (nextVersion: BundledBibleVersion) => void;
};

const ReaderVersionContext = createContext<ReaderVersionContextValue | null>(null);

function getVersionFromUrl(): BundledBibleVersion | null {
  const searchParams = new URLSearchParams(window.location.search);
  const value = searchParams.get("version");

  return isBundledBibleVersion(value) ? value : null;
}

function syncVersionToUrl(version: BundledBibleVersion) {
  const url = new URL(window.location.href);

  if (version === DEFAULT_BIBLE_VERSION) {
    url.searchParams.delete("version");
  } else {
    url.searchParams.set("version", version);
  }

  window.history.replaceState(window.history.state, "", url.toString());
}

export function ReaderVersionProvider({ children }: PropsWithChildren) {
  const [version, setVersionState] = useState<BundledBibleVersion>(DEFAULT_BIBLE_VERSION);

  useEffect(() => {
    const urlVersion = getVersionFromUrl();
    const storedVersion = window.localStorage.getItem(READER_VERSION_STORAGE_KEY);

    if (urlVersion) {
      setVersionState(urlVersion);
      window.localStorage.setItem(READER_VERSION_STORAGE_KEY, urlVersion);
      return;
    }

    if (isBundledBibleVersion(storedVersion)) {
      setVersionState(storedVersion);
      syncVersionToUrl(storedVersion);
    }
  }, []);

  const value = useMemo<ReaderVersionContextValue>(
    () => ({
      version,
      setVersion: (nextVersion) => {
        setVersionState(nextVersion);
        window.localStorage.setItem(READER_VERSION_STORAGE_KEY, nextVersion);
        syncVersionToUrl(nextVersion);
      }
    }),
    [version]
  );

  return <ReaderVersionContext.Provider value={value}>{children}</ReaderVersionContext.Provider>;
}

export function useReaderVersion() {
  const context = useContext(ReaderVersionContext);

  if (!context) {
    throw new Error("useReaderVersion must be used within ReaderVersionProvider.");
  }

  return context;
}
