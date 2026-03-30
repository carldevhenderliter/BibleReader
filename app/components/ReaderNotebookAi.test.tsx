import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";

const mockGenerateLocalBibleAiAnswer = jest.fn();
const mockLoadLocalBibleAi = jest.fn();
const mockGetLocalBibleAiAvailability = jest.fn();

jest.mock("@/lib/ai/browser-llm", () => ({
  generateLocalBibleAiAnswer: (...args: unknown[]) => mockGenerateLocalBibleAiAnswer(...args),
  getLocalBibleAiAvailability: (...args: unknown[]) => mockGetLocalBibleAiAvailability(...args),
  loadLocalBibleAi: (...args: unknown[]) => mockLoadLocalBibleAi(...args),
  normalizeLocalBibleAiProgress: (report: { progress: number; text: string } | null) =>
    report
      ? {
          progress: report.progress,
          label: report.text
        }
      : {
          progress: 0,
          label: ""
        }
}));

function renderNotebookEditor() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <WritingAssistantProvider>
          <ReaderNotebookEditor
            bookSlug="john"
            chapterNumber={1}
            currentChapter={{
              bookSlug: "john",
              chapterNumber: 1,
              verses: [
                { number: 1, text: "In the beginning was the Word." },
                { number: 2, text: "The same was in the beginning with God." }
              ]
            }}
          />
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

describe("ReaderNotebookEditor AI", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    mockGetLocalBibleAiAvailability.mockReturnValue({
      isSupported: true,
      reason: ""
    });
    mockLoadLocalBibleAi.mockResolvedValue({});
    mockGenerateLocalBibleAiAnswer.mockResolvedValue(
      "John 1 shows the eternal Word and invites worshipful reflection."
    );
  });

  it("previews and inserts AI-generated notebook content", async () => {
    renderNotebookEditor();

    fireEvent.click(screen.getByRole("button", { name: "Enable AI" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Summarize passage" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Summarize passage" }));

    await waitFor(() => {
      expect(
        screen.getByText("John 1 shows the eternal Word and invites worshipful reflection.")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Insert as new block" }));

    expect(screen.getByLabelText("Notebook block 1")).toHaveValue(
      "John 1 shows the eternal Word and invites worshipful reflection."
    );
  });
});
