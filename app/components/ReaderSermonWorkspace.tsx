"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getChapterHref } from "@/lib/bible/utils";
import { createPassageReference, formatPassageReference } from "@/lib/study-workspace";

export function ReaderSermonWorkspace() {
  const router = useRouter();
  const { version } = useReaderVersion();
  const {
    activeSermonId,
    activeStudyVerseNumber,
    addReferenceToSermon,
    addSermonSection,
    createSermon,
    createSermonFromNotebook,
    currentPassage,
    deleteSermon,
    deleteSermonSection,
    getActiveSermon,
    getActiveNotebook,
    getSermonDocuments,
    removeReferenceFromSermon,
    setActiveSermonId,
    updateSermonMetadata,
    updateSermonSection
  } = useReaderWorkspace();
  const sermons = getSermonDocuments();
  const activeSermon = getActiveSermon();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    activeSermon?.sections[0]?.id ?? null
  );
  const relatedNotebook = getActiveNotebook();

  useEffect(() => {
    if (selectedSectionId && activeSermon?.sections.some((section) => section.id === selectedSectionId)) {
      return;
    }

    setSelectedSectionId(activeSermon?.sections[0]?.id ?? null);
  }, [activeSermon, selectedSectionId]);

  return (
    <div className="reader-sermons">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Study Workspace</p>
          <h3 className="reader-notebook-title">Sermon library</h3>
        </div>
        <div className="reader-study-set-actions">
          <button className="reader-inline-button" onClick={() => createSermon()} type="button">
            New sermon
          </button>
          <button
            className="reader-inline-button"
            disabled={!relatedNotebook}
            onClick={() => createSermonFromNotebook()}
            type="button"
          >
            From notebook
          </button>
        </div>
      </div>

      <div className="reader-sermons-layout">
        <div className="reader-sermon-list">
          {sermons.length === 0 ? (
            <p className="reader-notebook-empty">
              Create a sermon draft to start building outlines, introductions, and applications.
            </p>
          ) : (
            sermons.map((sermon) => (
              <article
                className={`reader-sermon-list-item${activeSermonId === sermon.id ? " is-active" : ""}`}
                key={sermon.id}
              >
                <button
                  className="reader-sermon-list-button"
                  onClick={() => setActiveSermonId(sermon.id)}
                  type="button"
                >
                  <strong>{sermon.title}</strong>
                  <span>{sermon.sections.length} sections</span>
                </button>
                <button
                  aria-label={`Delete ${sermon.title}`}
                  className="reader-inline-button"
                  onClick={() => deleteSermon(sermon.id)}
                  type="button"
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>

        {activeSermon ? (
          <div className="reader-sermon-editor">
            <label className="reader-notebook-field">
              <span>Sermon title</span>
              <input
                aria-label="Sermon title"
                className="reader-notebook-title-input"
                onChange={(event) =>
                  updateSermonMetadata(activeSermon.id, { title: event.target.value })
                }
                placeholder="Sermon title"
                type="text"
                value={activeSermon.title}
              />
            </label>

            <label className="reader-notebook-field">
              <span>Sermon summary</span>
              <textarea
                aria-label="Sermon summary"
                className="reader-notebook-textarea"
                onChange={(event) =>
                  updateSermonMetadata(activeSermon.id, { summary: event.target.value })
                }
                placeholder="Main burden or summary"
                rows={4}
                value={activeSermon.summary}
              />
            </label>

            <div className="reader-notebook-toolbar" role="toolbar" aria-label="Sermon controls">
              <button
                className="reader-inline-button"
                onClick={() => addSermonSection(activeSermon.id, `Section ${activeSermon.sections.length + 1}`)}
                type="button"
              >
                Add section
              </button>
              <button
                className="reader-inline-button"
                onClick={() => {
                  if (!currentPassage) {
                    return;
                  }

                  addReferenceToSermon(
                    activeSermon.id,
                    createPassageReference({
                      version,
                      bookSlug: currentPassage.bookSlug,
                      chapterNumber: currentPassage.chapterNumber,
                      verseNumber: activeStudyVerseNumber ?? undefined,
                      sourceType: "manual"
                    })
                  );
                }}
                type="button"
              >
                Add current passage
              </button>
            </div>

            {activeSermon.references.length > 0 ? (
              <div className="reader-notebook-references">
                {activeSermon.references.map((reference) => (
                  <span className="reader-sermon-reference" key={reference.id}>
                    <button
                      className="reader-notebook-reference"
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
                      {formatPassageReference(reference)}
                    </button>
                    <button
                      aria-label={`Remove ${formatPassageReference(reference)}`}
                      className="reader-inline-button"
                      onClick={() => removeReferenceFromSermon(activeSermon.id, reference.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="reader-sermon-sections">
              {activeSermon.sections.map((section, index) => (
                <section
                  className={`reader-notebook-block${selectedSectionId === section.id ? " is-selected" : ""}`}
                  key={section.id}
                >
                  <div className="reader-notebook-block-header">
                    <input
                      aria-label={`Sermon section title ${index + 1}`}
                      className="reader-notebook-title-input"
                      onChange={(event) =>
                        updateSermonSection(activeSermon.id, section.id, { title: event.target.value })
                      }
                      onFocus={() => setSelectedSectionId(section.id)}
                      placeholder={`Section ${index + 1}`}
                      type="text"
                      value={section.title}
                    />
                    <div className="reader-notebook-block-actions">
                      <button
                        className="reader-inline-button"
                        onClick={() => setSelectedSectionId(section.id)}
                        type="button"
                      >
                        {selectedSectionId === section.id ? "Selected" : "Select"}
                      </button>
                      <button
                        className="reader-inline-button"
                        onClick={() => deleteSermonSection(activeSermon.id, section.id)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <textarea
                    aria-label={`Sermon section ${index + 1}`}
                    className="reader-notebook-textarea"
                    onChange={(event) =>
                      updateSermonSection(activeSermon.id, section.id, {
                        content: event.target.value
                      })
                    }
                    onFocus={() => setSelectedSectionId(section.id)}
                    placeholder="Write sermon content for this section"
                    rows={7}
                    value={section.content}
                  />
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
