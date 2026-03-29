import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider, useReaderVersion } from "@/app/components/ReaderVersionProvider";
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
      <ReaderNotebookEditor bookSlug="john" chapterNumber={chapterNumber} />
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

  it("stores notebooks separately by chapter and translation", () => {
    renderNotebookHarness();

    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "WEB John 1" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add paragraph" }));
    fireEvent.change(screen.getByLabelText("Notebook block 1"), {
      target: { value: "Opening notes for John 1." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Chapter 2" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "WEB John 2" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "KJV John 2" }
    });

    fireEvent.click(screen.getByRole("button", { name: "Use WEB" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("WEB John 2");

    fireEvent.click(screen.getByRole("button", { name: "Chapter 1" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("WEB John 1");
    expect(screen.getByLabelText("Notebook block 1")).toHaveValue("Opening notes for John 1.");

    const stored = window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY) ?? "";

    expect(stored).toContain("web:john:1");
    expect(stored).toContain("web:john:2");
    expect(stored).toContain("kjv:john:2");
  });
});
