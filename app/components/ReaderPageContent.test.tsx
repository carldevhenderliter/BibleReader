import { fireEvent, screen } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";
import { mockRouter } from "@/test/mocks/next-navigation";

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

describe("ReaderPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders chapter content and navigation", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    expect(screen.getByRole("heading", { name: "Genesis 1" })).toBeInTheDocument();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();
    expect(screen.getAllByText(/^WEB$/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Whole book view/i })).toHaveAttribute(
      "href",
      "/read/genesis?view=book"
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
        chapter={firstChapter}
        esvEnabled={false}
        version="web"
      />
    );

    expect(screen.getByText("Beginning of Genesis")).toBeInTheDocument();

    rerender(
      <ReaderPageContent
        book={lastBook}
        books={[...books, lastBook]}
        chapter={lastChapter}
        esvEnabled={false}
        version="web"
      />
    );

    expect(screen.getByText("End of Revelation")).toBeInTheDocument();
  });

  it("switches versions while preserving the current passage", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    expect(screen.getByRole("option", { name: "ESV (API key required)" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/1?version=kjv");
  });

  it("disables whole-book mode in chapter view for ESV", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={true}
        version="esv"
      />
    );

    expect(screen.getByText("Whole book view is unavailable for ESV")).toBeInTheDocument();
  });
});
