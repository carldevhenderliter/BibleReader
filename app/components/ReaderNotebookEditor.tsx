"use client";

import { useMemo } from "react";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { formatPassageReference } from "@/lib/study-workspace";

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
  const notebooks = getNotebookDocuments();
  const activeNotebook = getActiveNotebook();

  const pendingReferenceLabel = useMemo(
    () => (pendingNotebookReference ? formatPassageReference(pendingNotebookReference) : ""),
    [pendingNotebookReference]
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

  return (
    <div className="reader-notebook">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Notebook Library</p>
          <h3 className="reader-notebook-title">Bible notebooks</h3>
        </div>
        <button className="reader-inline-button" onClick={() => handleCreateNotebook()} type="button">
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
          Keep one main note per notebook. Open any notebook from the list and edit it here.
        </p>
      )}

      <div className="reader-notebook-library">
        <div className="reader-notebook-list" role="list" aria-label="Notebook list">
          {notebooks.length === 0 ? (
            <p className="reader-notebook-empty">
              Create a notebook to start keeping Bible-wide study notes.
            </p>
          ) : (
            notebooks.map((notebook) => (
              <button
                aria-pressed={activeNotebookId === notebook.id}
                className={`reader-notebook-list-item${
                  activeNotebookId === notebook.id ? " is-active" : ""
                }`}
                key={notebook.id}
                onClick={() => handleSelectNotebook(notebook.id)}
                type="button"
              >
                <strong>{notebook.title.trim() || "Untitled notebook"}</strong>
                <span>{notebook.content.trim() ? notebook.content.trim().slice(0, 90) : "Empty note"}</span>
              </button>
            ))
          )}
        </div>

        {activeNotebook ? (
          <div className="reader-notebook-editor">
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
                rows={16}
                value={activeNotebook.content}
              />
            </label>

            <div className="reader-notebook-toolbar" role="toolbar" aria-label="Notebook controls">
              <button
                className="reader-inline-button"
                onClick={() => deleteNotebook(activeNotebook.id)}
                type="button"
              >
                Delete notebook
              </button>
            </div>
          </div>
        ) : (
          <div className="reader-notebook-empty-panel">
            <p className="reader-notebook-empty">
              Select a notebook from the library or create a new one to begin editing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
