import { fireEvent, screen } from "@testing-library/react";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

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

const kjvChapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      { number: 1, text: "Jude, the servant of Jesus Christ..." },
      { number: 2, text: "Mercy unto you, and peace, and love, be multiplied." }
    ]
  }
];

describe("WholeBookContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a continuous book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    expect(screen.getByRole("heading", { name: "Jude" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
    expect(screen.getByText("Mercy to you and peace and love be multiplied.")).toBeInTheDocument();
  });

  it("switches whole-book content between bundled versions", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    expect(screen.getByText("Mercy to you and peace and love be multiplied.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(screen.getByText("Mercy unto you, and peace, and love, be multiplied.")).toBeInTheDocument();
  });
});
