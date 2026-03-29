"use client";

import { useRouter } from "next/navigation";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getReadingHref } from "@/lib/bible/utils";
import type { PassageReference, ReadingLocation } from "@/lib/bible/types";
import { formatPassageReference } from "@/lib/study-workspace";

type ReaderStudySetsPanelProps = {
  bookSlug: string;
  chapterNumber: number;
};

function getReferenceLocation(reference: PassageReference): ReadingLocation {
  return {
    book: reference.bookSlug,
    chapter: reference.chapterNumber,
    view: "chapter",
    version: reference.version
  };
}

export function ReaderStudySetsPanel({
  bookSlug,
  chapterNumber
}: ReaderStudySetsPanelProps) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const {
    deleteStudySet,
    getBookmarksForPassage,
    getHighlightsForPassage,
    getStudySets,
    removeStudySetItem,
    renameStudySet,
    saveCurrentPassageToStudySet
  } = useReaderWorkspace();
  const highlights = getHighlightsForPassage(bookSlug, chapterNumber);
  const bookmarks = getBookmarksForPassage(bookSlug, chapterNumber);
  const studySets = getStudySets();

  const handleSaveCurrentPassage = () => {
    const setName = window.prompt("Save this chapter to which study set?", "Current study");

    if (!setName) {
      return;
    }

    saveCurrentPassageToStudySet(setName);
  };

  return (
    <div className="reader-study-sets">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Study Workspace</p>
          <h3 className="reader-notebook-title">Saved study sets</h3>
        </div>
        <button className="reader-inline-button" onClick={handleSaveCurrentPassage} type="button">
          Save current chapter
        </button>
      </div>

      <section className="reader-study-summary">
        <article className="reader-study-summary-card">
          <strong>{highlights.length}</strong>
          <span>highlights in this chapter</span>
        </article>
        <article className="reader-study-summary-card">
          <strong>{bookmarks.length}</strong>
          <span>bookmarks in this chapter</span>
        </article>
        <article className="reader-study-summary-card">
          <strong>{studySets.length}</strong>
          <span>saved study sets</span>
        </article>
      </section>

      {studySets.length === 0 ? (
        <p className="reader-notebook-empty">
          Save verses, passages, and search findings into named study sets to build a study
          collection.
        </p>
      ) : (
        <div className="reader-study-set-list">
          {studySets.map((studySet) => (
            <section className="reader-study-set" key={studySet.id}>
              <div className="reader-study-set-header">
                <div>
                  <h4>{studySet.name}</h4>
                  <p>{studySet.items.length} saved references</p>
                </div>
                <div className="reader-study-set-actions">
                  <button
                    className="reader-inline-button"
                    onClick={() => {
                      const nextName = window.prompt("Rename study set", studySet.name);

                      if (nextName) {
                        renameStudySet(studySet.id, nextName);
                      }
                    }}
                    type="button"
                  >
                    Rename
                  </button>
                  <button
                    className="reader-inline-button"
                    onClick={() => deleteStudySet(studySet.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="reader-study-set-items">
                {studySet.items.map((item) => (
                  <article className="reader-study-set-item" key={item.id}>
                    <button
                      className="reader-study-set-link"
                      onClick={() => router.push(getReadingHref(getReferenceLocation(item)))}
                      type="button"
                    >
                      <strong>{formatPassageReference(item)}</strong>
                      <span>{item.label || item.sourceType || version.toUpperCase()}</span>
                    </button>
                    <button
                      aria-label={`Remove ${formatPassageReference(item)} from ${studySet.name}`}
                      className="reader-inline-button"
                      onClick={() => removeStudySetItem(studySet.id, item.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
