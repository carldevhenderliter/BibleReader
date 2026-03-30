"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { WritingAssistantCard } from "@/app/components/WritingAssistantCard";
import { useWritingAssistant } from "@/app/components/WritingAssistantProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { buildNotebookAiPrompt, normalizeAiWritingResult } from "@/lib/ai/writing-assistant";
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
  const { generateWritingDraft } = useWritingAssistant();
  const {
    activeStudyVerseNumber,
    addNotebookBlock,
    addNotebookReference,
    appendNotebookDraft,
    clearNotebook,
    deleteNotebookBlock,
    getBookmarksForPassage,
    getHighlightsForPassage,
    getNotebook,
    getStudySets,
    insertNotebookDraft,
    updateNotebookBlock,
    updateNotebookTitle
  } = useReaderWorkspace();
  const notebook = getNotebook(bookSlug, chapterNumber);
  const bookLabel = useMemo(() => formatBookLabel(bookSlug), [bookSlug]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(notebook.blocks[0]?.id ?? null);
  const [preview, setPreview] = useState<AiWritingResult | null>(null);

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
