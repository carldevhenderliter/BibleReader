import { fireEvent, screen, waitFor } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { PASSAGE_NOTEBOOK_STORAGE_KEY } from "@/lib/passage-notebooks";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  },
  {
    slug: "exodus",
    name: "Exodus",
    abbreviation: "Exod",
    testament: "Old",
    chapterCount: 40,
    order: 2
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

const kjvChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning God created the heaven and the earth." },
    { number: 2, text: "And the earth was without form, and void." }
  ]
};

describe("ReaderPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "/read/genesis/1");
  });

  it("renders chapter content and navigation", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    expect(screen.getByRole("heading", { name: "Genesis 1" })).toBeInTheDocument();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();
    expect(screen.getAllByText(/^WEB$/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("link", { name: /Whole book view/i })).toHaveAttribute(
      "href",
      "/read/genesis"
    );
    expect(screen.getByRole("link", { name: "Next chapter: Genesis 2" })).toHaveAttribute(
      "href",
      "/read/genesis/2"
    );
  });

  it("shows empty state navigation at the beginning and end", () => {
    const firstChapter = {
      ...chapter,
      chapterNumber: 1
    };
    const lastBook: BookMeta = {
      slug: "revelation",
      name: "Revelation",
      abbreviation: "Rev",
      testament: "New",
      chapterCount: 22,
      order: 66
    };
    const lastChapter: Chapter = {
      bookSlug: "revelation",
      chapterNumber: 22,
      verses: [{ number: 1, text: "The river of the water of life..." }]
    };

    const { rerender } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: firstChapter, kjv: { ...kjvChapter, chapterNumber: 1 } }}
      />
    );

    expect(screen.getByText("Beginning of Genesis")).toBeInTheDocument();

    rerender(
      <ReaderPageContent
        book={lastBook}
        books={[...books, lastBook]}
        chaptersByVersion={{ web: lastChapter, kjv: lastChapter }}
      />
    );

    expect(screen.getByText("End of Revelation")).toBeInTheDocument();
  });

  it("switches versions while preserving the current passage", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("option", { name: "ESV (API key required)" })).toBeDisabled();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(screen.getByText("In the beginning God created the heaven and the earth.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Whole book view/i })).toHaveAttribute(
      "href",
      "/read/genesis?version=kjv"
    );
  });

  it("opens the passage notebook from the reader menu and restores saved content", () => {
    const { unmount } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: {
        value: "Genesis opening"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add paragraph" }));
    fireEvent.change(screen.getByLabelText("Notebook block 1"), {
      target: {
        value: "Created light before the sun."
      }
    });

    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toContain(
      "Genesis opening"
    );
    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toContain(
      "Created light before the sun."
    );
    fireEvent.click(screen.getByRole("tab", { name: "Scripture" }));

    unmount();

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("Genesis opening");
    expect(screen.getByLabelText("Notebook block 1")).toHaveValue("Created light before the sun.");
  });

  it("clears saved passage notebooks", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: {
        value: "Disposable notebook"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add paragraph" }));
    fireEvent.change(screen.getByLabelText("Notebook block 1"), {
      target: {
        value: "A note to remove."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Clear notebook" }));

    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toBe("{}");
    expect(screen.queryByDisplayValue("Disposable notebook")).not.toBeInTheDocument();
    expect(
      screen.getByText("Add paragraphs or list blocks to build a notebook for this passage.")
    ).toBeInTheDocument();
  });

  it("highlights the verse opened from search", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        highlightedVerseNumber={2}
      />
    );

    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });

  it("renders the notebook inline in the reader column", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("tab", { name: "Notebook" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Notebook title")).toBeInTheDocument();
    expect(
      screen.queryByText("In the beginning, God created the heavens and the earth.")
    ).not.toBeInTheDocument();
  });

  it("highlights a verse range opened from search", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        highlightedVerseRange={{ start: 1, end: 2 }}
      />
    );

    expect(
      screen
        .getByText("In the beginning, God created the heavens and the earth.")
        .closest(".verse-row")
    ).toHaveClass("is-highlighted");
    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });

  it("reads verse range highlights from the search URL params", async () => {
    window.history.replaceState({}, "", "/read/genesis/1?highlightStart=1&highlightEnd=2");

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    await waitFor(() => {
      expect(
        screen
          .getByText("In the beginning, God created the heavens and the earth.")
          .closest(".verse-row")
      ).toHaveClass("is-highlighted");
    });

    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });
});
