import { fireEvent, screen } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { SearchPane } from "@/app/components/SearchPane";
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

describe("WholeBookContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/jude");
    window.history.replaceState({}, "", "/read/jude");
    setSplitViewActive(false);
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

    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chapter 1" })).not.toBeInTheDocument();
  });

  it("opens the notebook under the right-side search pane in split whole-book view", () => {
    setSplitViewActive(true);

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("tab", { name: "Notebook" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WEB search" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
  });
});
