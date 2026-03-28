import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupPane } from "@/app/components/LookupPane";
import { LookupProvider } from "@/app/components/LookupProvider";
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

function renderSearchUi(ui?: React.ReactNode) {
  return render(
    <ReaderVersionProvider>
      <LookupProvider>
        {ui ?? (
          <>
            <BottomSearchBar />
            <LookupPane />
          </>
        )}
      </LookupProvider>
    </ReaderVersionProvider>
  );
}

function setDesktopMode(isDesktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: isDesktop,
      media: "(min-width: 80rem)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

describe("BottomSearchBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/");
    setDesktopMode(false);
  });

  it("opens and closes the mobile search tray", () => {
    renderSearchUi();

    fireEvent.focus(screen.getByLabelText("Search books, words, or phrases"));
    expect(screen.getByLabelText("Bible search results")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();
  });

  it("renders on reader routes too", () => {
    setMockPathname("/read/genesis/1");

    renderSearchUi();

    expect(screen.getByLabelText("Search books, words, or phrases")).toBeInTheDocument();
  });

  it("navigates to chapter 1 when a book result is selected", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "gen" }
    });

    const result = await screen.findByRole("button", { name: /Book Genesis/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1");
  });

  it("navigates to a highlighted verse result", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "in the beginning" }
    });

    const result = await screen.findByRole("button", { name: /Verse Genesis 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1?highlight=1");
  });

  it("navigates from direct chapter and verse references", async () => {
    renderSearchUi();

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "John 1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Chapter John 1/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1");

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "John 1:1" }
    });

    fireEvent.click(await screen.findByRole("button", { name: /Verse John 1:1/i }));
    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
  });

  it("updates verse results when the active version changes", async () => {
    renderSearchUi(<SearchHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Use KJV" }));
    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "without form and void" }
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Verse Genesis 1:2 KJV/i })
      ).toBeInTheDocument();
    });
  });

  it("renders a persistent lookup pane on desktop and keeps it open after selecting a result", async () => {
    setDesktopMode(true);
    renderSearchUi();

    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();

    fireEvent.focus(screen.getByLabelText("Search books, words, or phrases"));
    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "John 1:1" }
    });

    const result = await screen.findByRole("button", { name: /Verse John 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/john/1?highlight=1");
    expect(screen.getByLabelText("Lookup pane")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verse John 1:1/i })).toBeInTheDocument();
  });
});
