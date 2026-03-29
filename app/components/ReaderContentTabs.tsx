"use client";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";

export function ReaderContentTabs() {
  const { activeReaderPane, activeUtilityPane, closeNotebookWorkspace, setActiveReaderPane } =
    useReaderWorkspace();

  const handlePaneChange = (nextPane: "reading" | "study-sets") => {
    if (activeUtilityPane === "notebook") {
      closeNotebookWorkspace();
    }

    setActiveReaderPane(nextPane);
  };

  return (
    <div className="reader-content-tabs" role="tablist" aria-label="Reader content">
      <button
        aria-selected={activeReaderPane === "reading"}
        className={`reader-content-tab${activeReaderPane === "reading" ? " is-active" : ""}`}
        onClick={() => handlePaneChange("reading")}
        role="tab"
        type="button"
      >
        Scripture
      </button>
      <button
        aria-selected={activeReaderPane === "study-sets"}
        className={`reader-content-tab${activeReaderPane === "study-sets" ? " is-active" : ""}`}
        onClick={() => handlePaneChange("study-sets")}
        role="tab"
        type="button"
      >
        Study Sets
      </button>
    </div>
  );
}
