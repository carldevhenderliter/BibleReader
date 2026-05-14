import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import ReaderPrototypePage from "@/app/prototype/reader/page";
import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import * as bibleData from "@/lib/bible/data";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/bible/data");
jest.mock("@/app/components/ReaderStrongsPanel", () => {
  const { useReaderWorkspace } = jest.requireActual("@/app/components/ReaderWorkspaceProvider");

  return {
    ReaderStrongsPanel: () => {
      const { activeGreekSelection } = useReaderWorkspace();

      return (
        <div data-testid="prototype-strongs-panel">
          {activeGreekSelection
            ? `${activeGreekSelection.selectedForm} ${activeGreekSelection.strongs}`
            : "No word selected"}
        </div>
      );
    }
  };
});

const mockedGetBooks = jest.mocked(bibleData.getBooks);
const mockedGetChapter = jest.mocked(bibleData.getChapter);

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
    slug: "titus",
    name: "Titus",
    abbreviation: "Titus",
    testament: "New",
    chapterCount: 3,
    order: 56
  },
  {
    slug: "john",
    name: "John",
    abbreviation: "John",
    testament: "New",
    chapterCount: 21,
    order: 43
  }
];

const greekTitusChapter: Chapter = {
  bookSlug: "titus",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "Παῦλος δοῦλος θεοῦ λόγον",
      translationText: "Paul, a servant of God, a word.",
      greekTokens: [
        {
          surface: "Παῦλος",
          lemma: "Παῦλος",
          strongs: "G3972",
          entryKey: "G3972",
          morphology: "N-NSM",
          decodedMorphology: "noun nominative singular masculine",
          gloss: "Paul"
        },
        {
          surface: "θεοῦ",
          lemma: "θεός",
          strongs: "G2316",
          entryKey: "G2316",
          morphology: "N-GSM",
          decodedMorphology: "noun genitive singular masculine",
          gloss: "God"
        },
        {
          surface: "λόγον",
          lemma: "λόγος",
          strongs: "G3056",
          entryKey: "G3056",
          morphology: "N-ASM",
          decodedMorphology: "noun accusative singular masculine",
          gloss: "word"
        }
      ]
    }
  ]
};

const webTitusChapter: Chapter = {
  bookSlug: "titus",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "Paul, a servant of God, a word."
    }
  ]
};

function getChapterFixture(bookSlug: string, chapterNumber: number, version: string) {
  if (bookSlug !== "titus" || chapterNumber !== 1) {
    return null;
  }

  return version === "greek" ? greekTitusChapter : webTitusChapter;
}

describe("ReaderPrototypePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockPathname("/prototype/reader");
    window.history.replaceState({}, "", "/prototype/reader");
    mockedGetBooks.mockResolvedValue(books);
    mockedGetChapter.mockImplementation(async (bookSlug, chapterNumber, version) =>
      getChapterFixture(bookSlug, chapterNumber, version)
    );
  });

  it("loads default Titus 1 content and renders the prototype shell", async () => {
    const element = await ReaderPrototypePage();

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "Titus 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prototype reader")).toBeInTheDocument();
    expect(screen.getByLabelText("Prototype word study")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "θεοῦ G2316" })).toBeInTheDocument();
  });

  it("updates the prototype query URL when changing chapter controls", () => {
    renderWithReaderCustomization(
      <ReaderPrototypePageContent
        book={books[1]}
        books={books}
        chapter={greekTitusChapter}
        chaptersByVersion={{
          greek: greekTitusChapter,
          web: webTitusChapter
        }}
        currentChapter={1}
        installedVersions={["web", "greek"]}
        selectedVersion="greek"
      />
    );

    fireEvent.change(screen.getByLabelText("Chapter"), {
      target: { value: "2" }
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/prototype/reader?book=titus&chapter=2&version=greek"
    );
  });

  it("opens the clicked Greek word in the prototype word-study pane", async () => {
    renderWithReaderCustomization(
      <ReaderPrototypePageContent
        book={books[1]}
        books={books}
        chapter={greekTitusChapter}
        chaptersByVersion={{
          greek: greekTitusChapter,
          web: webTitusChapter
        }}
        currentChapter={1}
        installedVersions={["web", "greek"]}
        selectedVersion="greek"
      />
    );

    const reader = screen.getByLabelText("Prototype reader");
    fireEvent.click(within(reader).getByRole("button", { name: "λόγον G3056" }));

    await waitFor(() => {
      expect(screen.getByTestId("prototype-strongs-panel")).toHaveTextContent("λόγον G3056");
    });
  });
});
