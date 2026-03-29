import { fireEvent, screen } from "@testing-library/react";

import { WholeBookContent } from "@/app/components/WholeBookContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const books: BookMeta[] = [
  {
    slug: "jude",
    name: "Jude",
    abbreviation: "Jude",
    testament: "New",
    chapterCount: 2,
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
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Beloved, while I was very eager to write to you..." }]
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
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Beloved, when I gave all diligence to write unto you..." }]
  }
];

describe("WholeBookContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/jude");
    window.history.replaceState({}, "", "/read/jude");
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
    expect(screen.getByRole("heading", { name: "Chapter 2" })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(screen.getByText("Mercy unto you, and peace, and love, be multiplied.")).toBeInTheDocument();
  });

  it("opens the notebook from whole-book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("tab", { name: "Notebook" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Notebook title")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chapter 1" })).not.toBeInTheDocument();
  });
});
