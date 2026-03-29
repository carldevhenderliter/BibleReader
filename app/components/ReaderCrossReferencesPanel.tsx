"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getCrossReferenceEntry } from "@/lib/bible/cross-references";
import { getChapterHref } from "@/lib/bible/utils";
import { formatBookLabel, formatPassageReference } from "@/lib/study-workspace";

type CrossReferenceState = Awaited<ReturnType<typeof getCrossReferenceEntry>>;

export function ReaderCrossReferencesPanel() {
  const router = useRouter();
  const { version } = useReaderVersion();
  const { activeStudyVerseNumber, currentPassage, setActiveStudyVerseNumber } = useReaderWorkspace();
  const [entry, setEntry] = useState<CrossReferenceState>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentPassage || activeStudyVerseNumber == null) {
      setEntry(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void getCrossReferenceEntry(
      version,
      currentPassage.bookSlug,
      currentPassage.chapterNumber,
      activeStudyVerseNumber
    ).then((nextEntry) => {
      if (cancelled) {
        return;
      }

      setEntry(nextEntry);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeStudyVerseNumber, currentPassage, version]);

  if (!currentPassage) {
    return (
      <div className="lookup-panel-empty">
        <p className="search-empty-copy">Open a passage to browse its cross references.</p>
      </div>
    );
  }

  return (
    <div className="reader-cross-references-panel" role="tabpanel">
      <div className="reader-cross-references-header">
        <div>
          <p className="search-tray-kicker">Cross References</p>
          <h3 className="search-tray-title">
            {formatBookLabel(currentPassage.bookSlug)} {currentPassage.chapterNumber}
            {activeStudyVerseNumber ? `:${activeStudyVerseNumber}` : ""}
          </h3>
        </div>
        <label className="reader-settings-field reader-compare-select" htmlFor="cross-reference-verse">
          <span>Verse</span>
          <input
            aria-label="Cross reference verse"
            id="cross-reference-verse"
            min="1"
            onChange={(event) => setActiveStudyVerseNumber(Number(event.target.value) || null)}
            type="number"
            value={activeStudyVerseNumber ?? ""}
          />
        </label>
      </div>

      {isLoading ? (
        <p className="search-empty-copy">Loading references…</p>
      ) : !entry ? (
        <p className="search-empty-copy">
          No curated cross references are available yet for this verse. Try another verse or open a
          highlighted search result first.
        </p>
      ) : (
        <div className="reader-cross-reference-groups">
          {entry.groups.map((group) => (
            <section className="reader-cross-reference-group" key={group.id}>
              <h4>{group.label}</h4>
              <div className="reader-cross-reference-list">
                {group.references.map((reference) => (
                  <button
                    className="reader-cross-reference-link"
                    key={reference.id}
                    onClick={() => {
                      const href = getChapterHref(
                        reference.bookSlug,
                        reference.chapterNumber,
                        reference.version
                      );
                      const url = new URL(href, window.location.origin);

                      if (reference.verseNumber) {
                        url.searchParams.set("highlight", String(reference.verseNumber));
                      }

                      router.push(`${url.pathname}${url.search}`);
                    }}
                    type="button"
                  >
                    <strong>{formatPassageReference(reference)}</strong>
                    <span>{reference.text || "Open passage"}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
