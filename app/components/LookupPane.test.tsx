import { fireEvent, screen, waitFor } from "@testing-library/react";
import { within } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/bible/search", () => ({
  parseBibleSearchQueries: jest.fn((rawQuery: string) =>
    rawQuery
      .split(",")
      .map((query) => query.trim())
      .filter(Boolean)
  ),
  searchBibleGroups: jest.fn(async (rawQuery: string, versions: string[]) => [
    {
      id: `group:${rawQuery}`,
      query: rawQuery,
      results: [
        {
          type: "verse",
          id: `${versions[0] ?? "web"}:titus:1:1`,
          version: versions[0] ?? "web",
          bookSlug: "titus",
          chapterNumber: 1,
          verseNumber: 1,
          label: "Titus 1:1",
          description: "Paul, a servant of God.",
          href: "/read/titus/1",
          preview: "Paul, a servant of God, and an apostle."
        }
      ]
    }
  ])
}));

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

function StrongsOpenHarness() {
  const { openStrongs } = useReaderWorkspace();

  return (
    <button onClick={() => openStrongs("G746", "G746")} type="button">
      Open Strongs
    </button>
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
    expect(within(studyPane).getByRole("tab", { name: "Search" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(studyPane).getByRole("tab", { name: "Notes" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Grammar" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Charts" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Strongs" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Sermons" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Harmony" })).toBeInTheDocument();
  });

  it("renders search as a study tools tab without opening the separate search pane", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: false, search: true, study: false })
    );

    renderStudyPane();

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(within(studyPane).getByRole("tab", { name: "Search" }));

    const searchInput = within(studyPane).getByLabelText(/Search from the study tools panel/i);
    fireEvent.change(searchInput, { target: { value: "faith" } });

    expect(searchInput).toHaveValue("faith");
    expect((await within(studyPane).findAllByText("Titus 1:1")).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("Search pane")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show search pane" })).toBeInTheDocument();
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

  it("reopens the study pane when notebook is opened from the reader menu", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: false, search: false, study: true })
    );

    renderStudyPane();

    expect(await screen.findByRole("button", { name: "Show study pane" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    });
    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show study pane" })).not.toBeInTheDocument();
  });

  it("keeps the study pane closed after hide is clicked", async () => {
    renderStudyPane();

    fireEvent.click(screen.getByRole("button", { name: "Hide study pane" }));

    expect(await screen.findByRole("button", { name: "Show study pane" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Study pane")).not.toBeInTheDocument();
  });

  it("reopens the study pane when strongs is opened while collapsed", async () => {
    renderWithReaderCustomization(
      <AppSplitLayout>
        <StrongsOpenHarness />
      </AppSplitLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide study pane" }));
    expect(await screen.findByRole("button", { name: "Show study pane" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open Strongs" }));

    expect(await screen.findByLabelText("Study pane")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show study pane" })).not.toBeInTheDocument();
  });

  it("does not render the study pane in mobile mode", () => {
    setSplitViewActive(false);

    renderStudyPane();

    expect(screen.queryByLabelText("Study pane")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show study pane" })).not.toBeInTheDocument();
  });
});
