import { fireEvent, screen, waitFor } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { VERSE_NOTES_STORAGE_KEY } from "@/lib/verse-notes";
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

  it("saves notes inline and restores them when reopening the same passage", () => {
    const { unmount } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Add note" })[0]);
    fireEvent.change(screen.getByLabelText("Note for verse 1"), {
      target: {
        value: "Created light before the sun."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    expect(window.localStorage.getItem(VERSE_NOTES_STORAGE_KEY)).toContain(
      "Created light before the sun."
    );
    expect(screen.getByText("Saved note")).toBeInTheDocument();

    unmount();

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Edit note" })[0]);
    expect(screen.getByLabelText("Note for verse 1")).toHaveValue(
      "Created light before the sun."
    );
  });

  it("deletes saved verse notes", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Add note" })[0]);
    fireEvent.change(screen.getByLabelText("Note for verse 1"), {
      target: {
        value: "A note to remove."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(window.localStorage.getItem(VERSE_NOTES_STORAGE_KEY)).toBe("{}");
    expect(screen.queryByText("Saved note")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add note" })[0]).toBeInTheDocument();
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
