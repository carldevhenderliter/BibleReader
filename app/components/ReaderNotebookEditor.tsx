"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WritingAssistantCard } from "@/app/components/WritingAssistantCard";
import { useWritingAssistant } from "@/app/components/WritingAssistantProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import {
  buildNotebookAiPrompt,
  buildNotebookSermonPrompt,
  normalizeAiWritingResult
} from "@/lib/ai/writing-assistant";
import { getChapterHref } from "@/lib/bible/utils";
import type { AiWritingAction, AiWritingResult, Chapter } from "@/lib/bible/types";
import {
  createPassageReference,
  formatBookLabel,
  formatPassageReference
} from "@/lib/study-workspace";

type ReaderNotebookEditorProps = {
  bookSlug: string;
  chapterNumber: number;
  currentChapter?: Chapter | null;
};

const NOTEBOOK_AI_OPTIONS: Array<{ id: AiWritingAction; label: string }> = [
  { id: "summarize-passage-notes", label: "Summarize passage" },
  { id: "rewrite-selected-block", label: "Rewrite selected block" },
  { id: "expand-notes", label: "Expand notes" },
  { id: "create-outline", label: "Create outline" },
  { id: "turn-notes-into-sermon-points", label: "Sermon points" }
];

export function ReaderNotebookEditor({
  bookSlug,
  chapterNumber,
  currentChapter = null
}: ReaderNotebookEditorProps) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const {
    availabilityReason,
    enableAi,
    generateWritingDraft,
    progressLabel,
    progressValue,
    status
  } = useWritingAssistant();
  const {
    activeStudyVerseNumber,
    activeSermonId,
    addNotebookBlock,
    addNotebookReference,
    addReferenceToSermon,
    addSermonSection,
    appendNotebookDraft,
    clearNotebook,
    createSermon,
    deleteNotebookBlock,
    getActiveSermon,
    getBookmarksForPassage,
    getHighlightsForPassage,
    getNotebook,
    getStudySets,
    insertNotebookDraft,
    openSermons,
    updateSermonMetadata,
    updateSermonSection,
    updateNotebookBlock,
    updateNotebookTitle
  } = useReaderWorkspace();
  const notebook = getNotebook(bookSlug, chapterNumber);
  const bookLabel = useMemo(() => formatBookLabel(bookSlug), [bookSlug]);
  const activeSermon = getActiveSermon();
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(notebook.blocks[0]?.id ?? null);
  const [preview, setPreview] = useState<AiWritingResult | null>(null);
  const [sermonPromptInput, setSermonPromptInput] = useState("");
  const [sermonPreview, setSermonPreview] = useState<AiWritingResult | null>(null);

  useEffect(() => {
    if (selectedBlockId && notebook.blocks.some((block) => block.id === selectedBlockId)) {
      return;
    }

    setSelectedBlockId(notebook.blocks[0]?.id ?? null);
  }, [notebook.blocks, selectedBlockId]);

  const handleRunWritingAction = async (action: AiWritingAction) => {
    const prompt = buildNotebookAiPrompt({
      action: action as
        | "summarize-passage-notes"
        | "rewrite-selected-block"
        | "expand-notes"
        | "create-outline"
        | "turn-notes-into-sermon-points",
      version,
      passageLabel: `${bookLabel} ${chapterNumber}`,
      currentChapter,
      activeVerseNumber: activeStudyVerseNumber,
      notebook,
      selectedBlockId,
      highlights: getHighlightsForPassage(bookSlug, chapterNumber),
      bookmarks: getBookmarksForPassage(bookSlug, chapterNumber),
      studySets: getStudySets()
    });
    const result = await generateWritingDraft(prompt);

    if (!result) {
      return;
    }

    setPreview(normalizeAiWritingResult(result));
  };

  const buildSermonDraftTitle = (result: AiWritingResult) => {
    const firstLine = result.content
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean);

    if (firstLine && firstLine.length <= 90 && !/[.!?]$/.test(firstLine)) {
      return firstLine;
    }

    if (sermonPromptInput.trim().length > 0) {
      return sermonPromptInput.trim().slice(0, 80);
    }

    return `${bookLabel} ${chapterNumber} sermon draft`;
  };

  const buildSermonDraftSummary = (result: AiWritingResult) =>
    result.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => line !== buildSermonDraftTitle(result)) ?? "";

  const buildSermonDraftContent = (result: AiWritingResult) => {
    const title = buildSermonDraftTitle(result);
    const lines = result.content.split("\n");
    const firstMeaningfulLineIndex = lines.findIndex((line) => line.trim().length > 0);

    if (firstMeaningfulLineIndex < 0) {
      return result.content.trim();
    }

    if (lines[firstMeaningfulLineIndex]?.trim() !== title) {
      return result.content.trim();
    }

    return lines.slice(firstMeaningfulLineIndex + 1).join("\n").trim() || result.content.trim();
  };

  const attachNotebookReferences = (sermonId: string) => {
    const references = [
      createPassageReference({
        version,
        bookSlug,
        chapterNumber,
        verseNumber: activeStudyVerseNumber ?? undefined,
        sourceType: "manual"
      }),
      ...notebook.blocks.flatMap((block) => block.references)
    ];

    Array.from(new Map(references.map((reference) => [reference.id, reference])).values()).forEach(
      (reference) => addReferenceToSermon(sermonId, reference)
    );
  };

  const handleRunSermonPrompt = async () => {
    if (!sermonPromptInput.trim()) {
      return;
    }

    const prompt = buildNotebookSermonPrompt({
      prompt: sermonPromptInput,
      version,
      passageLabel: `${bookLabel} ${chapterNumber}`,
      currentChapter,
      activeVerseNumber: activeStudyVerseNumber,
      notebook,
      highlights: getHighlightsForPassage(bookSlug, chapterNumber),
      bookmarks: getBookmarksForPassage(bookSlug, chapterNumber),
      studySets: getStudySets(),
      sermon: activeSermon
    });
    const result = await generateWritingDraft(prompt);

    if (!result) {
      return;
    }

    setSermonPreview(normalizeAiWritingResult(result));
  };

  const handleCreateSermonDraft = () => {
    if (!sermonPreview) {
      return;
    }

    const draft = createSermon(buildSermonDraftTitle(sermonPreview));
    const firstSectionId = draft.sections[0]?.id;
    attachNotebookReferences(draft.id);
    if (firstSectionId) {
      updateSermonSection(draft.id, firstSectionId, {
        title: buildSermonDraftTitle(sermonPreview),
        content: buildSermonDraftContent(sermonPreview)
      });
    }
    const summary = buildSermonDraftSummary(sermonPreview);

    if (summary) {
      updateSermonMetadata(draft.id, { summary });
    }

    setSermonPreview(null);
    openSermons();
  };

  const handleUpdateCurrentSermonDraft = () => {
    if (!sermonPreview || !activeSermonId || !activeSermon) {
      return;
    }

    const summary = buildSermonDraftSummary(sermonPreview);

    if (!activeSermon.summary.trim() && summary) {
      updateSermonMetadata(activeSermonId, { summary });
    }

    addSermonSection(
      activeSermonId,
      buildSermonDraftTitle(sermonPreview),
      buildSermonDraftContent(sermonPreview)
    );
    attachNotebookReferences(activeSermonId);
    setSermonPreview(null);
    openSermons();
  };

  return (
    <div className="reader-notebook">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Passage Notebook</p>
          <h3 className="reader-notebook-title">
            {bookLabel} {chapterNumber}
          </h3>
        </div>
        <button
          className="reader-inline-button"
          onClick={() => clearNotebook(bookSlug, chapterNumber)}
          type="button"
        >
          Clear notebook
        </button>
      </div>

      <label className="reader-notebook-field">
        <span>Notebook title</span>
        <input
          aria-label="Notebook title"
          className="reader-notebook-title-input"
          onChange={(event) => updateNotebookTitle(bookSlug, chapterNumber, event.target.value)}
          placeholder={`Notes for ${bookLabel} ${chapterNumber}`}
          type="text"
          value={notebook.title}
        />
      </label>

      <WritingAssistantCard
        description="Use local AI to summarize the passage, expand notes, rewrite a selected block, or turn your notes into sermon material."
        onRun={(action) => void handleRunWritingAction(action)}
        options={NOTEBOOK_AI_OPTIONS.map((option) => ({
          ...option,
          disabled: option.id === "rewrite-selected-block" && !selectedBlockId
        }))}
        preview={preview}
        previewActions={
          preview ? (
            <>
              <button
                className="reader-inline-button"
                onClick={() => insertNotebookDraft(bookSlug, chapterNumber, preview.content)}
                type="button"
              >
                Insert as new block
              </button>
              <button
                className="reader-inline-button"
                onClick={() => appendNotebookDraft(bookSlug, chapterNumber, preview.content, selectedBlockId ?? undefined)}
                type="button"
              >
                Append to notebook
              </button>
              <button
                className="reader-inline-button"
                disabled={!selectedBlockId}
                onClick={() => {
                  if (!selectedBlockId) {
                    return;
                  }

                  updateNotebookBlock(bookSlug, chapterNumber, selectedBlockId, {
                    text: preview.content
                  });
                }}
                type="button"
              >
                Replace selected block
              </button>
            </>
          ) : null
        }
        title="Notebook AI"
      />

      <section className="writing-ai-card" aria-label="Notebook sermon prompt">
        <div className="writing-ai-card-header">
          <h4 className="writing-ai-card-title">Sermon Prompt</h4>
          <p className="writing-ai-card-copy">
            Ask local AI to turn this passage and notebook into sermon material. The result previews
            first and then saves into your sermon library.
          </p>
        </div>

        <label className="reader-notebook-field">
          <span>Sermon request</span>
          <textarea
            aria-label="Sermon request"
            className="reader-notebook-textarea"
            onChange={(event) => setSermonPromptInput(event.target.value)}
            placeholder="Turn these notes into a three-point sermon outline with an introduction and application."
            rows={4}
            value={sermonPromptInput}
          />
        </label>

        {status === "downloading" ? (
          <div className="writing-ai-state" aria-live="polite">
            <p className="writing-ai-card-copy">{progressLabel || "Preparing local AI…"}</p>
            <progress max={1} value={progressValue} />
          </div>
        ) : null}

        {status === "disabled" || status === "error" ? (
          <div className="writing-ai-state">
            <p className="writing-ai-card-copy">{availabilityReason}</p>
            <button className="reader-inline-button" onClick={() => void enableAi()} type="button">
              Enable AI
            </button>
          </div>
        ) : null}

        <div className="writing-ai-actions">
          <button
            className="reader-inline-button"
            disabled={status !== "ready" || !sermonPromptInput.trim()}
            onClick={() => void handleRunSermonPrompt()}
            type="button"
          >
            Generate sermon draft
          </button>
          <button className="reader-inline-button" onClick={() => openSermons()} type="button">
            Open sermon workspace
          </button>
        </div>

        {sermonPreview ? (
          <div className="writing-ai-preview">
            <div className="writing-ai-preview-header">
              <div>
                <p className="writing-ai-preview-label">Preview</p>
                <h5 className="writing-ai-preview-title">{buildSermonDraftTitle(sermonPreview)}</h5>
              </div>
            </div>
            <pre className="writing-ai-preview-content">{sermonPreview.content}</pre>
            <div className="writing-ai-preview-actions">
              <button
                className="reader-inline-button"
                onClick={() => handleCreateSermonDraft()}
                type="button"
              >
                Create new sermon draft
              </button>
              <button
                className="reader-inline-button"
                disabled={!activeSermonId}
                onClick={() => handleUpdateCurrentSermonDraft()}
                type="button"
              >
                Update current sermon draft
              </button>
              <button
                className="reader-inline-button"
                onClick={() => openSermons()}
                type="button"
              >
                Open in sermon workspace
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <div className="reader-notebook-toolbar" role="toolbar" aria-label="Notebook block controls">
        <button
          className="reader-inline-button"
          onClick={() => addNotebookBlock(bookSlug, chapterNumber, "paragraph")}
          type="button"
        >
          Add paragraph
        </button>
        <button
          className="reader-inline-button"
          onClick={() => addNotebookBlock(bookSlug, chapterNumber, "list")}
          type="button"
        >
          Add list
        </button>
        <button
          className="reader-inline-button"
          onClick={() => {
            if (!activeStudyVerseNumber) {
              return;
            }

            addNotebookReference(
              bookSlug,
              chapterNumber,
              createPassageReference({
                version,
                bookSlug,
                chapterNumber,
                verseNumber: activeStudyVerseNumber,
                sourceType: "manual"
              }),
              selectedBlockId ?? undefined
            );
          }}
          type="button"
        >
          Add selected verse
        </button>
      </div>

      {notebook.blocks.length === 0 ? (
        <p className="reader-notebook-empty">
          Add paragraphs or list blocks to build a notebook for this passage.
        </p>
      ) : (
        <div className="reader-notebook-blocks">
          {notebook.blocks.map((block, index) => (
            <section
              className={`reader-notebook-block${selectedBlockId === block.id ? " is-selected" : ""}`}
              key={block.id}
            >
              <div className="reader-notebook-block-header">
                <label className="reader-notebook-block-type">
                  <span className="sr-only">Block type {index + 1}</span>
                  <select
                    aria-label={`Block type ${index + 1}`}
                    onChange={(event) =>
                      updateNotebookBlock(bookSlug, chapterNumber, block.id, {
                        type: event.target.value as "paragraph" | "list"
                      })
                    }
                    value={block.type}
                  >
                    <option value="paragraph">Paragraph</option>
                    <option value="list">List</option>
                  </select>
                </label>
                <div className="reader-notebook-block-actions">
                  <button
                    className="reader-inline-button"
                    onClick={() => setSelectedBlockId(block.id)}
                    type="button"
                  >
                    {selectedBlockId === block.id ? "Selected" : "Select"}
                  </button>
                  <button
                    className="reader-inline-button"
                    onClick={() => deleteNotebookBlock(bookSlug, chapterNumber, block.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <textarea
                aria-label={`Notebook block ${index + 1}`}
                className="reader-notebook-textarea"
                onChange={(event) =>
                  updateNotebookBlock(bookSlug, chapterNumber, block.id, {
                    text: event.target.value
                  })
                }
                onFocus={() => setSelectedBlockId(block.id)}
                placeholder={
                  block.type === "list"
                    ? "Write one list item per line"
                    : "Write your notebook entry for this passage"
                }
                rows={block.type === "list" ? 5 : 7}
                value={block.text}
              />
              {block.references.length > 0 ? (
                <div className="reader-notebook-references">
                  {block.references.map((reference) => (
                    <button
                      className="reader-notebook-reference"
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
                      {formatPassageReference(reference)}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
