"use client";

import { useEffect } from "react";

import { LAST_READING_STORAGE_KEY, READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import type { ReadingLocation } from "@/lib/bible/types";

type ReadingSessionSyncProps = {
  location: ReadingLocation;
};

export function ReadingSessionSync({ location }: ReadingSessionSyncProps) {
  useEffect(() => {
    window.localStorage.setItem(LAST_READING_STORAGE_KEY, JSON.stringify(location));
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, location.version);
  }, [location]);

  return null;
}
