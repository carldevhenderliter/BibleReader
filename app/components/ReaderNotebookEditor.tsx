"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { getChapterHref } from "@/lib/bible/utils";
import { createPassageReference, formatPassageReference } from "@/lib/study-workspace";

type ReaderNotebookEditorProps = {
  bookSlug: string;
  chapterNumber: number;
};

function formatBookLabel(bookSlug: string) {
  return bookSlug
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function ReaderNotebookEditor({
  bookSlug,
  chapterNumber
}: ReaderNotebookEditorProps) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const {
    activeStudyVerseNumber,
    addNotebookBlock,
    addNotebookReference,
    clearNotebook,
    deleteNotebookBlock,
    getNotebook,
    updateNotebookBlock,
    updateNotebookTitle
  } = useReaderWorkspace();
  const notebook = getNotebook(bookSlug, chapterNumber);
  const bookLabel = useMemo(() => formatBookLabel(bookSlug), [bookSlug]);

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
              })
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
            <section className="reader-notebook-block" key={block.id}>
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
                <button
                  className="reader-inline-button"
                  onClick={() => deleteNotebookBlock(bookSlug, chapterNumber, block.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <textarea
                aria-label={`Notebook block ${index + 1}`}
                className="reader-notebook-textarea"
                onChange={(event) =>
                  updateNotebookBlock(bookSlug, chapterNumber, block.id, {
                    text: event.target.value
                  })
                }
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
