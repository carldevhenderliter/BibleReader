"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { DEFAULT_BIBLE_VERSION, LAST_READING_STORAGE_KEY } from "@/lib/bible/constants";
import type { ReadingLocation } from "@/lib/bible/types";
import { getReadingHref } from "@/lib/bible/utils";
import { getBibleVersionLabel, isBibleVersion } from "@/lib/bible/version";

type ContinueReadingProps = {
  esvEnabled: boolean;
};

export function ContinueReading({ esvEnabled }: ContinueReadingProps) {
  const [location, setLocation] = useState<ReadingLocation | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(LAST_READING_STORAGE_KEY);

      if (!storedValue) {
        setHasLoaded(true);
        return;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<ReadingLocation>;

      if (
        typeof parsedValue.book === "string" &&
        typeof parsedValue.chapter === "number" &&
        (parsedValue.view === "chapter" || parsedValue.view === "book")
      ) {
        setLocation({
          book: parsedValue.book,
          chapter: parsedValue.chapter,
          view: parsedValue.view,
          version:
            isBibleVersion(parsedValue.version) &&
            (parsedValue.version !== "esv" || esvEnabled)
              ? parsedValue.version
              : DEFAULT_BIBLE_VERSION
        });
      }
    } catch {
      window.localStorage.removeItem(LAST_READING_STORAGE_KEY);
    } finally {
      setHasLoaded(true);
    }
  }, [esvEnabled]);

  if (!hasLoaded) {
    return <div className="continue-pill">Syncing your last reading spot…</div>;
  }

  if (!location) {
    return <div className="continue-pill">Choose any book to begin the reading flow.</div>;
  }

  return (
    <div className="continue-pill">
      <Link className="secondary-link" href={getReadingHref(location)}>
        Continue reading {getBibleVersionLabel(location.version)}
      </Link>
    </div>
  );
}
