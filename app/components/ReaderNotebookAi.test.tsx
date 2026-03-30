import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";
import { SERMON_DOCUMENTS_STORAGE_KEY } from "@/lib/sermon-documents";

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

  it("renders a separate sermon prompt and creates a sermon draft from the preview", async () => {
    mockGenerateLocalBibleAiAnswer.mockResolvedValueOnce(
      "The Word Made Flesh\nJesus is eternal, personal, and present among His people.\n\n1. Christ is eternal.\n2. Christ is revealed.\n3. Christ is received."
    );

    renderNotebookEditor();

    fireEvent.click(screen.getAllByRole("button", { name: "Enable AI" })[0]!);

    expect(screen.getByLabelText("Sermon request")).toBeInTheDocument();
    expect(screen.queryByText("Notebook AI")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Sermon request"), {
      target: {
        value: "Turn these notes into a three-point sermon outline."
      }
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate sermon draft" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate sermon draft" }));

    await waitFor(() => {
      expect(screen.getByText("The Word Made Flesh")).toBeInTheDocument();
      expect(screen.getByText(/Jesus is eternal, personal, and present/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Create new sermon draft" }));

    await waitFor(() => {
      const stored = window.localStorage.getItem(SERMON_DOCUMENTS_STORAGE_KEY) ?? "";

      expect(stored).toContain("The Word Made Flesh");
      expect(stored).toContain("Jesus is eternal, personal, and present among His people.");
      expect(stored).toContain("1. Christ is eternal.");
    });
  });

  it("updates the active sermon draft from the notebook sermon preview", async () => {
    mockGenerateLocalBibleAiAnswer.mockResolvedValueOnce(
      "Word and Witness\nJohn 1 calls the church to bear witness to Jesus with clarity and courage."
    );

    render(
      <ReaderVersionProvider>
        <ReaderWorkspaceProvider>
          <WritingAssistantProvider>
            <>
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
              <ReaderSermonWorkspace
                currentChapter={{
                  bookSlug: "john",
                  chapterNumber: 1,
                  verses: [
                    { number: 1, text: "In the beginning was the Word." },
                    { number: 2, text: "The same was in the beginning with God." }
                  ]
                }}
              />
            </>
          </WritingAssistantProvider>
        </ReaderWorkspaceProvider>
      </ReaderVersionProvider>
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Enable AI" })[0]!);

    fireEvent.click(screen.getByRole("button", { name: "New sermon" }));
    fireEvent.change(screen.getByLabelText("Sermon request"), {
      target: {
        value: "Add a short sermon section about witness from John 1."
      }
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Generate sermon draft" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate sermon draft" }));

    await waitFor(() => {
      expect(screen.getByText("Word and Witness")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Update current sermon draft" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Sermon section title 2")).toHaveValue("Word and Witness");
      expect(screen.getByLabelText("Sermon section 2")).toHaveValue(
        "John 1 calls the church to bear witness to Jesus with clarity and courage."
      );
    });
  });
});
