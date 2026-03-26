import { fireEvent, screen } from "@testing-library/react";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";
import { mockRouter } from "@/test/mocks/next-navigation";

const books: BookMeta[] = [
  {
    slug: "jude",
    name: "Jude",
    abbreviation: "Jude",
    testament: "New",
    chapterCount: 1,
    order: 65
  }
];

const chapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      { number: 1, text: "Jude, a servant of Jesus Christ..." },
      { number: 2, text: "Mercy to you and peace and love be multiplied." }
    ]
  }
];

describe("WholeBookContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a continuous book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chapters={chapters}
        esvEnabled={false}
        version="web"
      />
    );

    expect(screen.getByRole("heading", { name: "Jude" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
    expect(screen.getByText("Mercy to you and peace and love be multiplied.")).toBeInTheDocument();
  });

  it("switches ESV whole-book attempts back to chapter mode", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chapters={chapters}
        esvEnabled={true}
        version="web"
      />
    );

    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/read/jude/1?version=esv");
  });
});
