import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";

import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupPane } from "@/app/components/LookupPane";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider, useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { SearchPane } from "@/app/components/SearchPane";
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

const SEARCH_INPUT_LABEL =
  "Search books, references, Strong’s numbers, Greek lemmas, inflected forms, glosses, phrases, or use Topic: or Greek:";

function renderSearchUi(ui?: React.ReactNode) {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <ReaderCustomizationProvider>
            <SearchCustomizationProvider>
              {ui ?? (
                <>
                  <BottomSearchBar />
                  <SearchPane />
                  <LookupPane />
                </>
              )}
            </SearchCustomizationProvider>
          </ReaderCustomizationProvider>
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
    expect(screen.getByRole("button", { name: "Search settings" })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    fireEvent.click(screen.getByRole("button", { name: "Search settings" }));
    expect(screen.getByRole("dialog", { name: "Search settings menu" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search scope" })).toHaveValue("all");
    expect(screen.getByRole("button", { name: "Increase search text size" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search line height" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search body font" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search UI font" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Comfortable" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Compact" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Ask AI" })).not.toBeInTheDocument();
  });

  it("renders on reader routes too", () => {
    setMockPathname("/read/genesis/1");

    renderSearchUi();

    expect(screen.getByLabelText(SEARCH_INPUT_LABEL)).toBeInTheDocument();
  });

  it("applies search-only font-size settings to the search shell", () => {
    window.localStorage.setItem(
      "bible-reader:search-customization",
      JSON.stringify({
        textSize: 2.04,
        lineHeight: 2.1
      })
    );

    const { container } = renderSearchUi();

    expect(container.querySelector(".search-shell")).toHaveStyle("--search-text-size: 2.04rem");
    expect(container.querySelector(".search-shell")).toHaveStyle("--search-line-height: 2.1");
  });

  it("keeps reader and search customization settings independent", () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        textSize: 1.8
      })
    );
    window.localStorage.setItem(
      "bible-reader:search-customization",
      JSON.stringify({
        textSize: 1.22
      })
    );

    const { container } = renderSearchUi();

    expect(container.querySelector(".search-shell")).toHaveStyle("--search-text-size: 1.22rem");
    expect(container.querySelector(".search-shell")).not.toHaveStyle("--search-text-size: 1.8rem");
  });

  it("navigates to chapter 1 when a book result is selected", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "gen" }
    });

    await waitForElementToBeRemoved(() => screen.queryByText("Searching scripture…"), {
      timeout: 10000
    });

    const result = await screen.findByRole("button", { name: /Book Genesis/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis");
  }, 15000);

  it("navigates to a highlighted verse result", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "in the beginning" }
    });

    const result = await screen.findByRole("button", { name: /Verse Genesis 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis?highlightChapter=1&highlight=1");
  });

  it("navigates from direct chapter and verse references", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Chapter John 1/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john?chapter=1");

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Verse John 1:1\b/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john?highlightChapter=1&highlight=1");
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
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john?highlightChapter=1&highlight=1");
  });

  it("updates verse results when the active version changes", async () => {
    renderSearchUi(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));

    await waitFor(() => {
      expect(screen.getByText(/^KJV$/)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "without form and void" }
    });

    await waitForElementToBeRemoved(
      () => screen.queryByText("Searching scripture…"),
      { timeout: 10000 }
    );

    const resultButton = screen.getByRole("button", { name: /Genesis 1:2/i });

    expect(resultButton).toHaveTextContent(/without form/i);
    expect(resultButton).toHaveTextContent(/Spirit/i);
  });

  it("opens a Greek word lookup from search results", async () => {
    setDesktopMode(true);

    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "Greek: logos" }
    });

    await waitForElementToBeRemoved(() => screen.queryByText("Searching scripture…"), {
      timeout: 10000
    });

    fireEvent.click(await screen.findByRole("button", { name: /G3056/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: /λ.γος/ })).toBeInTheDocument();
    expect(await within(studyPane).findByText("G3056")).toBeInTheDocument();
  });

  it("shows Strongs numbers beside KJV word-search hits only when the search toggle is on", async () => {
    renderSearchUi(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));

    await waitFor(() => {
      expect(screen.getByText(/^KJV$/)).toBeInTheDocument();
    });

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

  it("filters search results by the selected testament scope", async () => {
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.click(screen.getByRole("button", { name: "Search settings" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Search scope" }), {
      target: { value: "new-testament" }
    });

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "light" }
    });

    await waitForElementToBeRemoved(
      () => screen.queryByText("Searching scripture…"),
      { timeout: 10000 }
    );

    expect(screen.getByRole("button", { name: /Verse Matthew 4:16/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Verse Genesis 1:3/i })).not.toBeInTheDocument();
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

    expect(mockRouter.push).toHaveBeenCalledWith("/read/matthew?highlightChapter=24&highlight=30");
  });

  it("renders a persistent lookup pane on desktop and keeps it open after selecting a result", async () => {
    setDesktopMode(true);
    renderSearchUi();

    expect(screen.getByLabelText("Search pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1" }
    });

    const result = await screen.findByRole("button", { name: /Verse John 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/john?highlightChapter=1&highlight=1");
    expect(screen.getByLabelText("Search pane")).toBeInTheDocument();
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
        <SearchPane />
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

    expect(screen.getByLabelText("Search pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();
  });

  it("keeps the desktop lookup pane focused on search on reader routes", () => {
    setDesktopMode(true);
    setMockPathname("/read/genesis/1");
    renderSearchUi();

    expect(screen.getByLabelText("Search pane")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WEB search" })).toBeInTheDocument();
    expect(
      screen.getByText(/Open notes, Strongs, sermons, or cross references/i)
    ).toBeInTheDocument();
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

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/read/genesis?version=kjv&highlightChapter=1&highlight=1"
    );
  });

  it("opens Strongs definitions in the study pane instead of inside search", async () => {
    setDesktopMode(true);
    setMockPathname("/read/genesis/1");
    renderSearchUi();

    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "H7225" }
    });

    const strongsDescriptions = await screen.findAllByText("Hebrew Strongs");
    const strongsResult = strongsDescriptions
      .map((description) =>
        description.closest(".search-result")?.querySelector<HTMLButtonElement>("button.search-result-main")
      )
      .find(Boolean);

    expect(strongsResult).not.toBeNull();
    fireEvent.click(strongsResult!);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Strongs" })).toHaveAttribute("aria-selected", "true");
    });
    const studyPane = screen.getByLabelText("Study pane");

    expect(within(studyPane).getByRole("heading", { name: "H7225" })).toBeInTheDocument();
    expect(await within(studyPane).findByText("Hebrew")).toBeInTheDocument();
  });
});
