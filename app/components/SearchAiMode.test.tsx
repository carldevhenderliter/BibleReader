import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupPane } from "@/app/components/LookupPane";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";

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

jest.mock("@/lib/ai/bible-assistant", () => ({
  buildBibleAiPrompt: jest.fn(async ({ query }) => ({
    systemPrompt: "Bible-only",
    userPrompt: `Question: ${query}`,
    sources: [
      {
        id: "john-1-1",
        label: "John 1:1",
        href: "/read/john/1?highlight=1",
        preview: "In the beginning was the Word.",
        bookSlug: "john",
        chapterNumber: 1,
        verseNumber: 1
      }
    ]
  }))
}));

const SEARCH_INPUT_LABEL = "Search books, words, phrases, or Strongs numbers, or use Topic:";

function renderSearchUi() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <BottomSearchBar />
          <LookupPane />
        </LookupProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

function setDesktopMode(isDesktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: isDesktop,
      media: "(min-width: 64rem)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

describe("Search AI mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/");
    setDesktopMode(false);
    mockGetLocalBibleAiAvailability.mockReturnValue({
      isSupported: true,
      reason: ""
    });
    mockLoadLocalBibleAi.mockResolvedValue({});
    mockGenerateLocalBibleAiAnswer.mockResolvedValue(
      "John 1:1 presents the Word as eternal and fully divine (John 1:1)."
    );
  });

  it("restores the saved AI search mode from local storage", async () => {
    window.localStorage.setItem("bible-reader.search-mode", "ai");
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ask AI" })).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("supports enabling local AI and showing cited source passages", async () => {
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "What does John 1:1 teach about Jesus?" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));

    expect(screen.getByRole("button", { name: "Enable AI" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enable AI" }));
    const askAiState = await screen.findByText(
      "AI is ready. Ask a Bible study question using the current search input."
    );
    fireEvent.click(askAiState.parentElement?.querySelector("button") as HTMLButtonElement);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Ask Again" })).toBeInTheDocument();
    });

    expect(screen.getByText(/John 1:1 presents the Word as eternal/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "John 1:1 In the beginning was the Word." }));

    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
  });

  it("shows an unsupported-device message in split view", async () => {
    setDesktopMode(true);
    setMockPathname("/read/john/1");
    mockGetLocalBibleAiAvailability.mockReturnValue({
      isSupported: false,
      reason: "WebGPU is not available in this browser."
    });

    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Explain John 1:1" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask AI" }));

    await waitFor(() => {
      expect(screen.getByText("WebGPU is not available in this browser.")).toBeInTheDocument();
    });
  });
});
