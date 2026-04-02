"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { formatPassageReference } from "@/lib/study-workspace";
import {
  DEFAULT_NOTEBOOK_CUSTOMIZATION,
  NOTEBOOK_CUSTOMIZATION_STORAGE_KEY,
  normalizeNotebookCustomization,
  type NotebookSurfaceStyle,
  type NotebookWidthOption
} from "@/lib/notebook-customization";
import { BODY_FONT_OPTIONS } from "@/lib/reader-customization";
import type { BodyFontOption } from "@/lib/bible/types";

const NOTEBOOK_WIDTH_OPTIONS = [
  { id: "full", label: "Full width" },
  { id: "focused", label: "Focused width" }
] as const;

const NOTEBOOK_SURFACE_STYLE_OPTIONS = [
  { id: "soft", label: "Soft" },
  { id: "paper", label: "Paper" },
  { id: "minimal", label: "Minimal" }
] as const;

export function ReaderNotebookEditor() {
  const {
    activeNotebookId,
    addReferenceToNotebook,
    clearPendingNotebookReference,
    createNotebook,
    deleteNotebook,
    getActiveNotebook,
    getNotebookDocuments,
    pendingNotebookReference,
    setActiveNotebookId,
    updateNotebook
  } = useReaderWorkspace();
  const [customization, setCustomization] = useState(DEFAULT_NOTEBOOK_CUSTOMIZATION);
  const notebooks = getNotebookDocuments();
  const activeNotebook = getActiveNotebook();

  useEffect(() => {
    try {
      const storedSettings = window.localStorage.getItem(NOTEBOOK_CUSTOMIZATION_STORAGE_KEY);

      if (!storedSettings) {
        return;
      }

      setCustomization(normalizeNotebookCustomization(JSON.parse(storedSettings)));
    } catch {
      window.localStorage.removeItem(NOTEBOOK_CUSTOMIZATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      NOTEBOOK_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify(customization)
    );
  }, [customization]);

  const pendingReferenceLabel = useMemo(
    () => (pendingNotebookReference ? formatPassageReference(pendingNotebookReference) : ""),
    [pendingNotebookReference]
  );

  const editorStyle = useMemo(
    () =>
      ({
        "--notebook-editor-text-size": `${customization.textSize}rem`,
        "--notebook-editor-line-height": String(customization.lineHeight),
        "--notebook-editor-max-width":
          customization.width === "full" ? "100%" : "68rem"
      }) satisfies CSSProperties,
    [customization.lineHeight, customization.textSize, customization.width]
  );

  const handleCreateNotebook = () => {
    const notebook = createNotebook("");

    if (pendingNotebookReference) {
      addReferenceToNotebook(notebook.id, pendingNotebookReference);
      clearPendingNotebookReference();
    }
  };

  const handleSelectNotebook = (notebookId: string) => {
    setActiveNotebookId(notebookId);

    if (pendingNotebookReference) {
      addReferenceToNotebook(notebookId, pendingNotebookReference);
      clearPendingNotebookReference();
    }
  };

  const updateNotebookStyle = <
    Key extends keyof typeof customization
  >(
    key: Key,
    value: (typeof customization)[Key]
  ) => {
    setCustomization((current) => normalizeNotebookCustomization({ ...current, [key]: value }));
  };

  return (
    <div className="reader-notebook">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Notes Workspace</p>
          <h3 className="reader-notebook-title">Bible notebooks</h3>
        </div>
        <button className="reader-inline-button" onClick={handleCreateNotebook} type="button">
          New notebook
        </button>
      </div>

      {pendingNotebookReference ? (
        <div className="reader-notebook-picker-banner" role="status">
          <p>
            Choose a notebook for <strong>{pendingReferenceLabel}</strong>.
          </p>
          <button
            className="reader-inline-button"
            onClick={() => clearPendingNotebookReference()}
            type="button"
          >
            Cancel
          </button>
        </div>
      ) : (
        <p className="reader-notebook-copy">
          Keep one main note per notebook, switch notebooks from the tabs, and tune the writing style to fit the way you like to draft.
        </p>
      )}

      {notebooks.length === 0 ? (
        <div className="reader-notebook-empty-panel">
          <p className="reader-notebook-empty">
            Create a notebook to start keeping Bible-wide study notes.
          </p>
        </div>
      ) : (
        <>
          <div className="reader-notebook-tabbar">
            <div className="reader-notebook-tabs" role="tablist" aria-label="Notebook tabs">
              {notebooks.map((notebook) => (
                <button
                  aria-selected={activeNotebookId === notebook.id}
                  className={`reader-notebook-tab${
                    activeNotebookId === notebook.id ? " is-active" : ""
                  }`}
                  key={notebook.id}
                  onClick={() => handleSelectNotebook(notebook.id)}
                  role="tab"
                  type="button"
                >
                  {notebook.title.trim() || "Untitled notebook"}
                </button>
              ))}
            </div>
          </div>

          {activeNotebook ? (
            <div
              className={`reader-notebook-editor reader-notebook-editor-surface is-${customization.surfaceStyle}`}
              style={editorStyle}
            >
              <div className="reader-notebook-style-bar">
                <label className="reader-notebook-style-field">
                  <span>Font</span>
                  <select
                    aria-label="Notebook font"
                    onChange={(event) =>
                      updateNotebookStyle("bodyFont", event.target.value as BodyFontOption)
                    }
                    value={customization.bodyFont}
                  >
                    {BODY_FONT_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="reader-notebook-style-field">
                  <span>Text size</span>
                  <input
                    aria-label="Notebook text size"
                    max="1.6"
                    min="0.92"
                    onChange={(event) =>
                      updateNotebookStyle("textSize", Number(event.target.value))
                    }
                    step="0.02"
                    type="range"
                    value={customization.textSize}
                  />
                  <strong>{customization.textSize.toFixed(2)}rem</strong>
                </label>

                <label className="reader-notebook-style-field">
                  <span>Line height</span>
                  <input
                    aria-label="Notebook line height"
                    max="2.2"
                    min="1.4"
                    onChange={(event) =>
                      updateNotebookStyle("lineHeight", Number(event.target.value))
                    }
                    step="0.05"
                    type="range"
                    value={customization.lineHeight}
                  />
                  <strong>{customization.lineHeight.toFixed(2)}</strong>
                </label>

                <label className="reader-notebook-style-field">
                  <span>Width</span>
                  <select
                    aria-label="Notebook width"
                    onChange={(event) =>
                      updateNotebookStyle("width", event.target.value as NotebookWidthOption)
                    }
                    value={customization.width}
                  >
                    {NOTEBOOK_WIDTH_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="reader-notebook-style-field">
                  <span>Surface</span>
                  <select
                    aria-label="Notebook surface style"
                    onChange={(event) =>
                      updateNotebookStyle(
                        "surfaceStyle",
                        event.target.value as NotebookSurfaceStyle
                      )
                    }
                    value={customization.surfaceStyle}
                  >
                    {NOTEBOOK_SURFACE_STYLE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                className={`reader-notebook-editor-fields is-${customization.bodyFont}`}
              >
                <label className="reader-notebook-field">
                  <span>Notebook title</span>
                  <input
                    aria-label="Notebook title"
                    className="reader-notebook-title-input"
                    onChange={(event) =>
                      updateNotebook(activeNotebook.id, { title: event.target.value })
                    }
                    placeholder="Notebook title"
                    type="text"
                    value={activeNotebook.title}
                  />
                </label>

                <label className="reader-notebook-field">
                  <span>Notebook note</span>
                  <textarea
                    aria-label="Notebook note"
                    className="reader-notebook-textarea"
                    onChange={(event) =>
                      updateNotebook(activeNotebook.id, { content: event.target.value })
                    }
                    placeholder="Write your main note for this notebook."
                    rows={20}
                    value={activeNotebook.content}
                  />
                </label>
              </div>

              <div className="reader-notebook-toolbar" role="toolbar" aria-label="Notebook controls">
                <button
                  className="reader-inline-button"
                  onClick={() => setCustomization(DEFAULT_NOTEBOOK_CUSTOMIZATION)}
                  type="button"
                >
                  Reset note style
                </button>
                <button
                  className="reader-inline-button"
                  onClick={() => deleteNotebook(activeNotebook.id)}
                  type="button"
                >
                  Delete notebook
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
