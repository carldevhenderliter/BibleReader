"use client";

import { useEffect, useState } from "react";

import {
  getBookAudioSource,
  getBookAudioSourceFromManifest,
  type BookAudioSource
} from "@/lib/bible/book-audio";
import { getAssetPath } from "@/lib/asset-path";

type RuntimeBookAudioManifestEntry = {
  bookSlug: string;
  sourceFilename: string;
  src: string;
};

type RuntimeBookAudioManifest = Record<string, RuntimeBookAudioManifestEntry>;

export function useBookAudioSource(bookSlug: string) {
  const [audioSource, setAudioSource] = useState<BookAudioSource | null>(() =>
    getBookAudioSource(bookSlug)
  );

  useEffect(() => {
    let isCancelled = false;
    const staticAudioSource = getBookAudioSource(bookSlug);

    setAudioSource(staticAudioSource);

    async function resolveAudioSource() {
      try {
        const manifestResponse = await fetch(getAssetPath("/book-audio/manifest.json"), {
          cache: "no-store"
        });

        if (manifestResponse.ok) {
          const runtimeManifest = (await manifestResponse.json()) as RuntimeBookAudioManifest;
          const runtimeMatch = getBookAudioSourceFromManifest(bookSlug, runtimeManifest);

          if (runtimeMatch && !isCancelled) {
            setAudioSource(runtimeMatch);
            return;
          }
        }
      } catch {
        // Ignore manifest fetch failures and fall back to the bundled manifest.
      }

      if (!isCancelled && !staticAudioSource) {
        setAudioSource(null);
      }
    }

    void resolveAudioSource();

    return () => {
      isCancelled = true;
    };
  }, [bookSlug]);

  return audioSource;
}
