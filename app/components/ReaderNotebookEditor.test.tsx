import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider, useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { NOTEBOOK_CUSTOMIZATION_STORAGE_KEY } from "@/lib/notebook-customization";
import { PASSAGE_NOTEBOOK_STORAGE_KEY } from "@/lib/passage-notebooks";

function NotebookHarness() {
  const { setVersion } = useReaderVersion();
  const [chapterNumber, setChapterNumber] = useState(1);

  return (
    <>
      <button onClick={() => setVersion("web")} type="button">
        Use WEB
      </button>
      <button onClick={() => setVersion("kjv")} type="button">
        Use KJV
      </button>
      <button onClick={() => setChapterNumber(1)} type="button">
        Chapter 1
      </button>
      <button onClick={() => setChapterNumber(2)} type="button">
        Chapter 2
      </button>
      <span>{chapterNumber}</span>
      <ReaderNotebookEditor />
    </>
  );
}

function renderNotebookHarness() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <NotebookHarness />
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

describe("ReaderNotebookEditor", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores notebook library content globally across chapter and translation changes", () => {
    renderNotebookHarness();

    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "Main study" }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: { value: "One main note for the whole Bible." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Chapter 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    fireEvent.click(screen.getByRole("button", { name: "Use WEB" }));

    expect(screen.getByLabelText("Notebook title")).toHaveValue("Main study");
    expect(screen.getByLabelText("Notebook note")).toHaveValue("One main note for the whole Bible.");

    const stored = window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY) ?? "";

    expect(stored).toContain("Main study");
    expect(stored).toContain("One main note for the whole Bible.");
  });

  it("lets users create and switch between notebook documents", () => {
    renderNotebookHarness();

    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "Notebook one" }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: { value: "First note" }
    });

    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "Notebook two" }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: { value: "Second note" }
    });

    fireEvent.click(screen.getByRole("tab", { name: /Notebook one/i }));

    expect(screen.getByLabelText("Notebook title")).toHaveValue("Notebook one");
    expect(screen.getByLabelText("Notebook note")).toHaveValue("First note");
  });

  it("stores notebook style settings separately from notebook content", () => {
    renderNotebookHarness();

    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook font"), {
      target: { value: "mono" }
    });
    fireEvent.change(screen.getByLabelText("Notebook width"), {
      target: { value: "focused" }
    });
    fireEvent.change(screen.getByLabelText("Notebook surface style"), {
      target: { value: "paper" }
    });

    const stored = window.localStorage.getItem(NOTEBOOK_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain("\"bodyFont\":\"mono\"");
    expect(stored).toContain("\"width\":\"focused\"");
    expect(stored).toContain("\"surfaceStyle\":\"paper\"");
  });
});
