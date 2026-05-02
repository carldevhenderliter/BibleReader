"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  LAST_AUDIO_SESSION_STORAGE_KEY
} from "@/lib/bible/constants";
import { BOOK_AUDIO_AUTOPLAY_STORAGE_KEY } from "@/lib/bible/book-audio";

type StoredAudioSession = {
  autoplayKey: string;
  bookSlug: string;
  bookName: string;
  chapter: number;
  view: "chapter" | "book";
  version: string;
  href: string;
  sourceFilename?: string;
};

export function ContinueListening() {
  const [session, setSession] = useState<StoredAudioSession | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(LAST_AUDIO_SESSION_STORAGE_KEY);

      if (!storedValue) {
        setHasLoaded(true);
        return;
      }

      const parsedValue = JSON.parse(storedValue) as Partial<StoredAudioSession>;

      if (
        typeof parsedValue.autoplayKey === "string" &&
        typeof parsedValue.bookSlug === "string" &&
        typeof parsedValue.bookName === "string" &&
        typeof parsedValue.chapter === "number" &&
        (parsedValue.view === "chapter" || parsedValue.view === "book") &&
        typeof parsedValue.href === "string"
      ) {
        setSession(parsedValue as StoredAudioSession);
      }
    } catch {
      window.localStorage.removeItem(LAST_AUDIO_SESSION_STORAGE_KEY);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  if (!hasLoaded) {
    return <div className="continue-pill">Syncing your audio queue…</div>;
  }

  if (!session) {
    return <div className="continue-pill">Start any book audio to resume it here.</div>;
  }

  return (
    <div className="continue-pill">
      <Link
        className="secondary-link"
        href={session.href}
        onClick={() => {
          window.sessionStorage.setItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY, session.autoplayKey);
        }}
      >
        Resume audio {session.bookName}
      </Link>
    </div>
  );
}
