"use client";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function ReaderContentTabs() {
  const { activeReaderPane, setActiveReaderPane } = useReaderWorkspace();

  return (
    <div className="reader-content-tabs" role="tablist" aria-label="Reader content">
      <button
        aria-selected={activeReaderPane === "reading"}
        className={`reader-content-tab${activeReaderPane === "reading" ? " is-active" : ""}`}
        onClick={() => setActiveReaderPane("reading")}
        role="tab"
        type="button"
      >
        Scripture
      </button>
      <button
        aria-selected={activeReaderPane === "notebook"}
        className={`reader-content-tab${activeReaderPane === "notebook" ? " is-active" : ""}`}
        onClick={() => setActiveReaderPane("notebook")}
        role="tab"
        type="button"
      >
        Notebook
      </button>
    </div>
  );
}
