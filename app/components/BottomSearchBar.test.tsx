import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupPane } from "@/app/components/LookupPane";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider, useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";

function SearchHarness() {
  const { setVersion } = useReaderVersion();

  return (
    <>
      <button onClick={() => setVersion("kjv")} type="button">
        Use KJV
      </button>
      <BottomSearchBar />
    </>
  );
}

const SEARCH_INPUT_LABEL = "Search books, words, phrases, or Strongs numbers, or use Topic:";

function renderSearchUi(ui?: React.ReactNode) {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          {ui ?? (
            <>
              <BottomSearchBar />
              <LookupPane />
            </>
          )}
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

function setNavigatorDevice({
  maxTouchPoints = 0,
  platform = "MacIntel",
  userAgent = "Mozilla/5.0"
}: {
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
} = {}) {
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: platform
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent
  });
}

describe("BottomSearchBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/");
    setDesktopMode(false);
    setNavigatorDevice();
  });

  it("opens and closes the mobile search tray", () => {
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    expect(screen.getByLabelText("Bible search results")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();
  });

  it("renders a match-mode toggle in the mobile search tray", () => {
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));

    expect(screen.getByRole("button", { name: "Partial" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Complete" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Show Strongs" })).toHaveAttribute("aria-pressed", "false");
  });

  it("renders on reader routes too", () => {
    setMockPathname("/read/genesis/1");

    renderSearchUi();

    expect(screen.getByLabelText(SEARCH_INPUT_LABEL)).toBeInTheDocument();
  });

  it("navigates to chapter 1 when a book result is selected", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "gen" }
    });

    const result = await screen.findByRole("button", { name: /Book Genesis/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1");
  });

  it("navigates to a highlighted verse result", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "in the beginning" }
    });

    const result = await screen.findByRole("button", { name: /Verse Genesis 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1?highlight=1");
  });

  it("navigates from direct chapter and verse references", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Chapter John 1/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1");

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Verse John 1:1\b/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
  });

  it("navigates from direct verse range references", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1-12" }
    });

    expect(
      await screen.findByText(
        /In the beginning was the Word, and the Word was with God, and the Word was God\./i
      )
    ).toBeInTheDocument();
    expect(await screen.findByRole("article", { name: /John 1:1-12/i })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /John 1:12/i })).toBeInTheDocument();

    fireEvent.click((await screen.findAllByRole("button", { name: /John 1:/i }))[0]!);
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
  });

  it("updates verse results when the active version changes", async () => {
    renderSearchUi(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "without form and void" }
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Verse Genesis 1:2 KJV/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Verse Genesis 1:2 KJV/i })).toHaveTextContent(
      /without form/
    );
    expect(screen.getByRole("button", { name: /Verse Genesis 1:2 KJV/i })).toHaveTextContent(
      /Spirit/
    );
  });

  it("shows Strongs numbers beside KJV word-search hits only when the search toggle is on", async () => {
    renderSearchUi(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "beginning" }
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Verse Genesis 1:1 KJV/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("H7225")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show Strongs" }));
    expect(screen.getAllByText("H7225").length).toBeGreaterThan(0);
  });

  it("renders grouped results for comma-separated searches on mobile", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Matthew 1:1, repent, forgiveness" }
    });

    expect(await screen.findByRole("heading", { name: "Matthew 1:1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "repent" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "forgiveness" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Verse Matthew 1:1/i })).toBeInTheDocument();
  });

  it("shows starter topic suggestions for a bare Topic query on mobile", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Topic:" }
    });

    expect(await screen.findByRole("button", { name: /Topic End Times/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Topic Faith/i })).toBeInTheDocument();
  });

  it("expands a Topic-prefixed result on mobile and navigates from a topic verse", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Topic: end times" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Topic End Times/i }));
    expect(await screen.findByText("Return of Christ")).toBeInTheDocument();

    const result = await screen.findByRole("button", { name: /Matthew 24:30/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/matthew/24?highlight=30");
  });

  it("renders a persistent lookup pane on desktop and keeps it open after selecting a result", async () => {
    setDesktopMode(true);
    renderSearchUi();

    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1" }
    });

    const result = await screen.findByRole("button", { name: /Verse John 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verse John 1:1/i })).toBeInTheDocument();
  });

  it("renders grouped sections in the desktop lookup pane", async () => {
    setDesktopMode(true);
    const { container } = renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Matthew 1:1, repent" }
    });

    expect(await screen.findByRole("heading", { name: "Matthew 1:1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "repent" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /Verse Matthew 1:1/i })).toBeInTheDocument();
    expect(container.querySelector(".search-result-groups-panes")).toBeTruthy();
    expect(container.querySelectorAll(".search-result-group-pane")).toHaveLength(2);
  });

  it("renders Topic-prefixed suggestions and expanded topic content in the desktop lookup pane", async () => {
    setDesktopMode(true);
    renderSearchUi(
      <>
        <SearchHarness />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Topic: last days" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Topic End Times/i }));
    expect(await screen.findByText("Last Days Signs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show Strongs" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Show Strongs" }));
    expect(screen.getByRole("button", { name: /2 Timothy 3:1/i })).toHaveTextContent(/perilous/);
    expect(screen.getByRole("button", { name: /2 Timothy 3:1/i })).toHaveTextContent(/times/);
    expect(screen.getAllByText(/^G\d+$/).length).toBeGreaterThan(0);
  });

  it("renders a match-mode toggle in the desktop lookup pane", () => {
    setDesktopMode(true);
    renderSearchUi();

    expect(screen.getByRole("button", { name: "Partial" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Complete" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Show Strongs" })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches between partial and complete verse matching", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "begin" }
    });

    expect(await screen.findByRole("button", { name: /Verse Genesis 1:1/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Complete" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Verse Genesis 1:1/i })).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Partial" }));

    expect(await screen.findByRole("button", { name: /Verse Genesis 1:1/i })).toBeInTheDocument();
  });

  it("restores the saved match mode from local storage", async () => {
    window.localStorage.setItem("bible-reader.search-match-mode", "complete");
    renderSearchUi();
    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Complete" })).toHaveAttribute("aria-pressed", "true");
    });
    expect(screen.getByRole("button", { name: "Partial" })).toHaveAttribute("aria-pressed", "false");
  });

  it("restores the saved search Strongs toggle from local storage", async () => {
    window.localStorage.setItem("bible-reader.search-show-strongs", "true");
    renderSearchUi();
    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Show Strongs" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  it("uses the split lookup pane on iPad widths below the desktop breakpoint", () => {
    setDesktopMode(false);
    setNavigatorDevice({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15"
    });
    renderSearchUi();

    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();
  });

  it("keeps the desktop lookup pane focused on search on reader routes", () => {
    setDesktopMode(true);
    setMockPathname("/read/genesis/1");
    renderSearchUi();

    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notebook" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Search for a book, reference, Strongs number/i)).toBeInTheDocument();
  });

  it("renders Strongs search results and matching KJV verses", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "H7225" }
    });

    const verseResult = await screen.findByRole(
      "button",
      { name: /Verse Genesis 1:1/i },
      { timeout: 5000 }
    );

    await waitFor(() => {
      expect(screen.getByText("Hebrew Strongs")).toBeInTheDocument();
    }, { timeout: 5000 });

    const beforeToggleCount = screen.getAllByText("H7225").length;

    fireEvent.click(screen.getByRole("button", { name: "Show Strongs" }));
    expect(screen.getAllByText("H7225").length).toBeGreaterThan(beforeToggleCount);

    fireEvent.click(verseResult);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1?version=kjv&highlight=1");
  });
});
