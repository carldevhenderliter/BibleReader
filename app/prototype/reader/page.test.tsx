import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import ReaderPrototypePage from "@/app/prototype/reader/page";
import ReaderPrototypeChapterPage from "@/app/prototype/reader/[book]/[chapter]/page";
import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import * as bibleData from "@/lib/bible/data";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";
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
          id: "greek:titus:1:1",
          version: versions[0] ?? "greek",
          bookSlug: "titus",
          chapterNumber: 1,
          verseNumber: 1,
          label: "Titus 1:1",
          description: "Paul, a servant of God.",
          href: "/read/titus/1?version=greek",
          preview: "Παῦλος δοῦλος θεοῦ"
        }
      ],
      emptyMessage: ""
    }
  ])
}));
jest.mock("@/lib/bible/data");
jest.mock("@/lib/bible/esv-interlinear", () => ({
  getEsvInterlinearChapter: jest.fn(async () => null)
}));
jest.mock("@/lib/bible/masoretic", () => ({
  getMasoreticChapter: jest.fn(async () => null)
}));
jest.mock("@/lib/bible/greek", () => ({
  createGreekLearningQuizSelections: jest.fn(() => []),
  getGreekMorphologyDetails: jest.fn(() => null),
  normalizeGreekFormLookupValue: jest.fn((value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  ),
  getGreekTokenOccurrenceKey: jest.fn(
    (bookSlug: string, chapterNumber: number, verseNumber: number, tokenIndex: number) =>
      `greek:${bookSlug}:${chapterNumber}:${verseNumber}:${tokenIndex}`
  ),
  transliterateGreekSurface: jest.fn((surface: string) => surface),
  getGreekLemmaEntry: jest.fn(async (entryKey: string) => {
    const entries = {
      G2316: {
        entryKey: "G2316",
        lemma: "θεός",
        strongs: "G2316",
        transliteration: "theos",
        shortDefinition: "God, Divine Being, Godhead, Deity",
        longDefinition: "God, the one true God.",
        forms: []
      },
      G3056: {
        entryKey: "G3056",
        lemma: "λόγος",
        strongs: "G3056",
        transliteration: "logos",
        shortDefinition: "word, saying, message",
        longDefinition: "A word, speech, or message.",
        forms: []
      }
    } as const;

    return entries[entryKey as keyof typeof entries] ?? null;
  }),
  getGreekVerseOccurrences: jest.fn(async (entryKey: string) => {
    const greekTokens = [
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
    ];
    const occurrences = {
      G2316: [
        {
          version: "greek",
          bookSlug: "titus",
          bookName: "Titus",
          chapterNumber: 1,
          verseNumber: 1,
          text: "Παῦλος δοῦλος θεοῦ λόγον",
          translationText: "Paul, a servant of God, a word.",
          greekTokens
        }
      ],
      G3056: [
        {
          version: "greek",
          bookSlug: "titus",
          bookName: "Titus",
          chapterNumber: 1,
          verseNumber: 1,
          text: "Παῦλος δοῦλος θεοῦ λόγον",
          translationText: "Paul, a servant of God, a word.",
          greekTokens
        }
      ]
    } as const;

    return [...(occurrences[entryKey as keyof typeof occurrences] ?? [])];
  })
}));
jest.mock("@/lib/bible/strongs", () => ({
  getStrongsEntries: jest.fn(async () => []),
  getStrongsEntry: jest.fn(async (entryKey: string) => {
    const entries = {
      G2316: {
        id: "G2316",
        language: "greek",
        lemma: "θεός",
        transliteration: "theos",
        definition: "God",
        partOfSpeech: "Noun",
        rootWord: "G2316|θεός|theos",
        outlineUsage: "God",
        bdagArticles: [
          {
            headword: "θεός",
            transliteration: "theos",
            entry: "God, a divine being.",
            summary: {
              plainMeaning: "God, the one true God",
              commonUse: "god, a divine being or spirit being",
              ntNote: "Used for God and divine beings."
            }
          }
        ]
      },
      G3056: {
        id: "G3056",
        language: "greek",
        lemma: "λόγος",
        transliteration: "logos",
        definition: "word",
        partOfSpeech: "Noun",
        rootWord: "G3056|λόγος|logos",
        outlineUsage: "word"
      }
    } as const;

    return entries[entryKey as keyof typeof entries] ?? null;
  }),
  getStrongsVerseOccurrencesWithTokens: jest.fn(async () => []),
  getVerseEntriesForVersion: jest.fn(async (anchors: Array<{
    bookSlug: string;
    chapterNumber: number;
    verseNumber: number;
  }>, version: string) => {
    const greekTokens = [
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
    ];

    return anchors.map((anchor) => ({
      anchor,
      entry: {
        version,
        bookSlug: anchor.bookSlug,
        chapterNumber: anchor.chapterNumber,
        verseNumber: anchor.verseNumber,
        text: "Παῦλος δοῦλος θεοῦ λόγον",
        translationText: "Paul, a servant of God, a word.",
        greekTokens
      }
    }));
  }),
  normalizeStrongsNumber: jest.fn((value: string) => value.toUpperCase())
}));
jest.mock("@/lib/fathers/search", () => ({
  findFathersSegmentsByGreekLemma: jest.fn(async (lemma: string) =>
    lemma === "θεός"
      ? [
          {
            workSlug: "1-clement",
            workTitle: "1 Clement",
            segmentId: "1-clement:1",
            ref: "1",
            label: "1",
            greek: "θεοῦ χάρις",
            english: "the grace of God",
            greekContext: "θεοῦ χάρις",
            englishContext: "the grace of God"
          }
        ]
      : []
  ),
  normalizeFathersGreekText: jest.fn((value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  )
}));

const mockedGetBooks = jest.mocked(bibleData.getBooks);
const mockedGetBookBySlug = jest.mocked(bibleData.getBookBySlug);
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

const greekJohnChapter: Chapter = {
  bookSlug: "john",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "Ἐν ἀρχῇ ἦν ὁ λόγος",
      translationText: "In the beginning was the Word.",
      greekTokens: [
        {
          surface: "λόγος",
          lemma: "λόγος",
          strongs: "G3056",
          entryKey: "G3056",
          morphology: "N-NSM",
          decodedMorphology: "noun nominative singular masculine",
          gloss: "word"
        }
      ]
    }
  ]
};

const webJohnChapter: Chapter = {
  bookSlug: "john",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "In the beginning was the Word."
    }
  ]
};

function getChapterFixture(bookSlug: string, chapterNumber: number, version: string) {
  if (bookSlug === "titus" && chapterNumber === 1) {
    return version === "greek" ? greekTitusChapter : webTitusChapter;
  }

  if (bookSlug === "john" && chapterNumber === 1) {
    return version === "greek" ? greekJohnChapter : webJohnChapter;
  }

  return null;
}

describe("ReaderPrototypePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockPathname("/prototype/reader");
    window.history.replaceState({}, "", "/prototype/reader");
    mockedGetBooks.mockResolvedValue(books);
    mockedGetBookBySlug.mockImplementation(async (bookSlug) =>
      books.find((book) => book.slug === bookSlug) ?? null
    );
    mockedGetChapter.mockImplementation(async (bookSlug, chapterNumber, version) =>
      getChapterFixture(bookSlug, chapterNumber, version)
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn(async () => undefined)
      }
    });
  });

  it("loads default Titus 1 content and renders the prototype shell", async () => {
    const element = await ReaderPrototypePage();

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "Titus 1" })).toBeInTheDocument();
    expect(screen.getByLabelText("Prototype reader")).toBeInTheDocument();
    expect(screen.getByLabelText("Prototype word study")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "θεοῦ" })).toBeInTheDocument();
    const wordStudy = screen.getByLabelText("Prototype word study");
    expect((await within(wordStudy).findAllByText("θεός")).length).toBeGreaterThan(0);
    expect(await within(wordStudy).findByText("G2316")).toBeInTheDocument();
    expect(within(wordStudy).getByText("Greek Dictionary")).toBeInTheDocument();
    expect(await within(wordStudy).findByRole("tab", { name: /Verses In Bible/i })).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /BDAG/i })).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /Outside Bible/i })).toBeInTheDocument();
    expect(await screen.findByText("Book audio")).toBeInTheDocument();
  });

  it("renders a requested static prototype passage", async () => {
    setMockPathname("/prototype/reader/john/1");
    window.history.replaceState({}, "", "/prototype/reader/john/1?version=greek");
    const element = await ReaderPrototypeChapterPage({
      params: Promise.resolve({ book: "john", chapter: "1" })
    });

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "John 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "λόγος" })).toBeInTheDocument();
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
      "/prototype/reader/titus/2?version=greek"
    );

    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "web" }
    });

    expect(mockRouter.push).toHaveBeenCalledWith(
      "/prototype/reader/titus/1?version=web"
    );
  });

  it("uses prototype URL highlight params in the real verse list", async () => {
    window.history.replaceState({}, "", "/prototype/reader?version=greek&highlight=1");

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

    await waitFor(() => {
      expect(document.querySelector(".verse-row.is-highlighted")).not.toBeNull();
    });
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
    fireEvent.click(within(reader).getByRole("button", { name: "λόγον" }));

    await waitFor(() => {
      const wordStudy = screen.getByLabelText("Prototype word study");
      expect(within(wordStudy).getAllByText("λόγος").length).toBeGreaterThan(0);
      expect(within(wordStudy).getByText("G3056")).toBeInTheDocument();
    });
  });

  it("wires prototype bottom actions and settings to the real reader workspace", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Parallel" }));
    expect(await screen.findByText("Compare Tools")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Read" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Bookmark" }));
    expect(screen.getByRole("button", { name: "Bookmark" })).toHaveClass("is-active");

    fireEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(await screen.findByText(/Choose a notebook for/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reader settings" }));
    expect(await screen.findByText("Reader tools")).toBeInTheDocument();
    expect(screen.getByText("Reading modes")).toBeInTheDocument();
    expect(screen.getByText("Study pane")).toBeInTheDocument();
  });

  it("switches prototype left-rail modes for study, search, notes, and library", async () => {
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

    const nav = screen.getByLabelText("Prototype navigation");

    fireEvent.click(within(nav).getByRole("button", { name: "Study" }));
    expect(screen.getByText("Grammatical Breakdown")).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "Search" }));
    expect(screen.getByLabelText("Search")).toHaveValue("θεός");
    expect((await screen.findAllByText("Titus 1:1")).length).toBeGreaterThan(0);

    fireEvent.click(within(nav).getByRole("button", { name: "Notes" }));
    expect(screen.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New Note" })).toBeInTheDocument();

    fireEvent.click(within(nav).getByRole("button", { name: "Library" }));
    expect(screen.getByDisplayValue("Search your library...")).toBeInTheDocument();
    expect(screen.getByText("Study documents")).toBeInTheDocument();
  });

  it("switches between original Strong's study tabs in the prototype pane", async () => {
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

    const wordStudy = screen.getByLabelText("Prototype word study");
    expect((await within(wordStudy).findAllByText("θεός")).length).toBeGreaterThan(0);

    fireEvent.click(await within(wordStudy).findByRole("tab", { name: /Verses In Bible/i }));
    expect(await within(wordStudy).findByText("Titus 1:1")).toBeInTheDocument();

    fireEvent.click(within(wordStudy).getByRole("tab", { name: /BDAG/i }));
    expect((await within(wordStudy).findAllByText(/God, a divine being/i)).length).toBeGreaterThan(0);

    fireEvent.click(within(wordStudy).getByRole("tab", { name: /Outside Bible/i }));
    expect(await within(wordStudy).findByText("1 Clement")).toBeInTheDocument();
    expect(await within(wordStudy).findByText("the grace of God")).toBeInTheDocument();
  });
});
