"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

type ReaderNotebookSheetProps = {
  bookSlug: string;
  chapterNumber: number;
};

export function ReaderNotebookSheet({
  bookSlug,
  chapterNumber
}: ReaderNotebookSheetProps) {
  const { closeMobileNotebook, isMobileNotebookOpen } = useReaderWorkspace();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isMobileNotebookOpen) {
      return;
    }

    closeButtonRef.current?.focus();
  }, [isMobileNotebookOpen]);

  useEffect(() => {
    if (!isMobileNotebookOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNotebookOpen]);

  useEffect(() => {
    if (!isMobileNotebookOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileNotebook();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMobileNotebook, isMobileNotebookOpen]);

  if (!isMobileNotebookOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="reader-settings-backdrop is-open"
        onClick={closeMobileNotebook}
      />
      <aside
        aria-labelledby="reader-notebook-title"
        className="reader-settings-panel reader-notebook-sheet is-open"
        role="dialog"
      >
        <div className="reader-settings-header">
          <div>
            <p className="eyebrow">Notebook</p>
            <h2 className="reader-settings-title" id="reader-notebook-title">
              Passage notebook
            </h2>
          </div>
          <button
            aria-label="Close notebook"
            className="reader-settings-close"
            onClick={closeMobileNotebook}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>
        <ReaderNotebookEditor bookSlug={bookSlug} chapterNumber={chapterNumber} />
      </aside>
    </>,
    document.body
  );
}
