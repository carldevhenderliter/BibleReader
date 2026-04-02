import { fireEvent, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const SPLIT_COLLAPSED_PANES_STORAGE_KEY = "bible-reader.split-collapsed-panes";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  }
];

const chapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning, God created the heavens and the earth." },
    { number: 2, text: "The earth was formless and empty." }
  ]
};

function setSplitViewActive(isActive: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: isActive,
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

function renderStudyPane() {
  return renderWithReaderCustomization(
    <AppSplitLayout>
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: chapter }}
      />
    </AppSplitLayout>
  );
}

describe("LookupPane", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "/read/genesis/1");
    setSplitViewActive(true);
  });

  it("renders the study pane tabs in split view", () => {
    renderStudyPane();

    const studyPane = screen.getByLabelText("Study pane");

    expect(studyPane).toBeInTheDocument();
    expect(within(studyPane).queryByRole("tab", { name: "Compare" })).not.toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Notebook" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Sermons" })).toBeInTheDocument();
  });

  it("restores a collapsed study rail from local storage and reopens it", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: false, search: false, study: true })
    );

    renderStudyPane();

    const railButton = await screen.findByRole("button", { name: "Show study pane" });
    fireEvent.click(railButton);

    expect(await screen.findByLabelText("Study pane")).toBeInTheDocument();
  });

  it("reopens the study pane automatically when notebook is opened from the reader menu", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: false, search: false, study: true })
    );

    renderStudyPane();

    expect(await screen.findByRole("button", { name: "Show study pane" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Notebook" })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
  });

  it("does not render the study pane in mobile mode", () => {
    setSplitViewActive(false);

    renderStudyPane();

    expect(screen.queryByLabelText("Study pane")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show study pane" })).not.toBeInTheDocument();
  });
});
