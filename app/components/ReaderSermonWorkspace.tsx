"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WritingAssistantCard } from "@/app/components/WritingAssistantCard";
import { useWritingAssistant } from "@/app/components/WritingAssistantProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { buildSermonAiPrompt, normalizeAiWritingResult } from "@/lib/ai/writing-assistant";
import { getChapterHref } from "@/lib/bible/utils";
import type { AiWritingAction, AiWritingResult, Chapter } from "@/lib/bible/types";
import {
  createPassageReference,
  formatBookLabel,
  formatPassageReference
} from "@/lib/study-workspace";

type ReaderSermonWorkspaceProps = {
  currentChapter?: Chapter | null;
};

const SERMON_AI_OPTIONS: Array<{ id: AiWritingAction; label: string }> = [
  { id: "generate-sermon-outline", label: "Outline" },
  { id: "expand-selected-section", label: "Expand section" },
  { id: "write-introduction", label: "Introduction" },
  { id: "write-conclusion", label: "Conclusion" },
  { id: "add-application-points", label: "Applications" },
  { id: "rewrite-for-clarity", label: "Rewrite" }
];

export function ReaderSermonWorkspace({ currentChapter = null }: ReaderSermonWorkspaceProps) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const { generateWritingDraft } = useWritingAssistant();
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
  const [preview, setPreview] = useState<AiWritingResult | null>(null);
  const passageLabel = useMemo(() => {
    if (!currentPassage) {
      return null;
    }

    return `${formatBookLabel(currentPassage.bookSlug)} ${currentPassage.chapterNumber}`;
  }, [currentPassage]);
  const relatedNotebook = getActiveNotebook();

  useEffect(() => {
    if (selectedSectionId && activeSermon?.sections.some((section) => section.id === selectedSectionId)) {
      return;
    }

    setSelectedSectionId(activeSermon?.sections[0]?.id ?? null);
  }, [activeSermon, selectedSectionId]);

  const handleRunWritingAction = async (action: AiWritingAction) => {
    if (!activeSermon) {
      return;
    }

    const prompt = buildSermonAiPrompt({
      action: action as
        | "generate-sermon-outline"
        | "expand-selected-section"
        | "write-introduction"
        | "write-conclusion"
        | "add-application-points"
        | "rewrite-for-clarity",
      version,
      currentChapter,
      currentPassageLabel: passageLabel,
      notebook: relatedNotebook,
      sermon: activeSermon,
      selectedSectionId
    });
    const result = await generateWritingDraft(prompt);

    if (!result) {
      return;
    }

    setPreview(normalizeAiWritingResult(result));
  };

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

            <WritingAssistantCard
              description="Use local AI to draft sermon outlines, introductions, applications, and clearer section content from the current sermon and passage context."
              onRun={(action) => void handleRunWritingAction(action)}
              options={SERMON_AI_OPTIONS.map((option) => ({
                ...option,
                disabled: option.id === "expand-selected-section" && !selectedSectionId
              }))}
              preview={preview}
              previewActions={
                preview ? (
                  <>
                    <button
                      className="reader-inline-button"
                      onClick={() => addSermonSection(activeSermon.id, preview.title, preview.content)}
                      type="button"
                    >
                      New section
                    </button>
                    <button
                      className="reader-inline-button"
                      onClick={() => {
                        const targetSectionId =
                          selectedSectionId ?? activeSermon.sections[activeSermon.sections.length - 1]?.id;

                        if (!targetSectionId) {
                          return;
                        }

                        const section = activeSermon.sections.find((item) => item.id === targetSectionId);

                        updateSermonSection(activeSermon.id, targetSectionId, {
                          content: section?.content.trim()
                            ? `${section.content.trim()}\n\n${preview.content}`
                            : preview.content
                        });
                      }}
                      type="button"
                    >
                      Append to section
                    </button>
                    <button
                      className="reader-inline-button"
                      disabled={!selectedSectionId}
                      onClick={() => {
                        if (!selectedSectionId) {
                          return;
                        }

                        updateSermonSection(activeSermon.id, selectedSectionId, {
                          content: preview.content
                        });
                      }}
                      type="button"
                    >
                      Replace selected section
                    </button>
                  </>
                ) : null
              }
              title="Sermon AI"
            />

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
