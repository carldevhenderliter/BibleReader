import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BottomSearchBar } from "@/app/components/BottomSearchBar";
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

describe("BottomSearchBar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/");
  });

  it("opens and closes the search tray", () => {
    render(
      <ReaderVersionProvider>
        <BottomSearchBar />
      </ReaderVersionProvider>
    );

    fireEvent.focus(screen.getByLabelText("Search books, words, or phrases"));
    expect(screen.getByLabelText("Bible search results")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Bible search results")).not.toBeInTheDocument();
  });

  it("renders on reader routes too", () => {
    setMockPathname("/read/genesis/1");

    render(
      <ReaderVersionProvider>
        <BottomSearchBar />
      </ReaderVersionProvider>
    );

    expect(screen.getByLabelText("Search books, words, or phrases")).toBeInTheDocument();
  });

  it("navigates to chapter 1 when a book result is selected", async () => {
    render(
      <ReaderVersionProvider>
        <BottomSearchBar />
      </ReaderVersionProvider>
    );

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "gen" }
    });

    const result = await screen.findByRole("button", { name: /Book Genesis/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1");
  });

  it("navigates to a highlighted verse result", async () => {
    render(
      <ReaderVersionProvider>
        <BottomSearchBar />
      </ReaderVersionProvider>
    );

    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "in the beginning" }
    });

    const result = await screen.findByRole("button", { name: /Verse Genesis 1:1/i });
    fireEvent.click(result);

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1?highlight=1");
  });

  it("updates verse results when the active version changes", async () => {
    render(
      <ReaderVersionProvider>
        <SearchHarness />
      </ReaderVersionProvider>
    );

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
});
