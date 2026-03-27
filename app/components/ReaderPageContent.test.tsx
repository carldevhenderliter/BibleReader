import { fireEvent, screen } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
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

  it("opens and closes the compact reader controls menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    const toggle = screen.getByRole("button", { name: "Reader controls" });
    const controlsPanel = screen.getByRole("region", { name: "Reader controls" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(controlsPanel).not.toHaveClass("is-mobile-open");

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "Close controls" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(controlsPanel).toHaveClass("is-mobile-open");
  });
});
