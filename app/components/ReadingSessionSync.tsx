"use client";

import { useEffect } from "react";

import { LAST_READING_STORAGE_KEY, READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { ReadingView } from "@/lib/bible/types";

type ReadingSessionSyncProps = {
  book: string;
  chapter: number;
  view: ReadingView;
};

export function ReadingSessionSync({ book, chapter, view }: ReadingSessionSyncProps) {
  const { version } = useReaderVersion();
  const { syncCurrentPassage } = useReaderWorkspace();

  useEffect(() => {
    const location = { book, chapter, view, version };

    window.localStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify(location));
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, version);
    syncCurrentPassage(book, chapter, view);
  }, [book, chapter, syncCurrentPassage, version, view]);

  return null;
}
