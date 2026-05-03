"use client";

import { useEffect } from "react";

import { LAST_READING_STORAGE_KEY, READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { BundledBibleVersion, ReadingView } from "@/lib/bible/types";

type ReadingSessionSyncProps = {
  book: string;
  chapter: number;
  view: ReadingView;
  version?: BundledBibleVersion;
};

export function ReadingSessionSync({
  book,
  chapter,
  view,
  version: versionOverride
}: ReadingSessionSyncProps) {
  const { version } = useReaderVersion();
  const { syncCurrentPassage } = useReaderWorkspace();
  const activeVersion = versionOverride ?? version;

  useEffect(() => {
    const location = { book, chapter, view, version: activeVersion };

    window.localStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify(location));
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, activeVersion);
    syncCurrentPassage(book, chapter, view);
  }, [activeVersion, book, chapter, syncCurrentPassage, view]);

  return null;
}
