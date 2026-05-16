import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import ReaderPrototypePage from "@/app/prototype/reader/page";
import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import * as bibleData from "@/lib/bible/data";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/bible/data");
jest.mock("@/lib/bible/greek", () => ({
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
  })
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
  )
}));

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
    const wordStudy = screen.getByLabelText("Prototype word study");
    expect((await within(wordStudy).findAllByText("θεοῦ")).length).toBeGreaterThan(0);
    expect(within(wordStudy).getByText("G2316")).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /Dictionary/i })).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /NT Usage/i })).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /LXX Usage/i })).toBeInTheDocument();
    expect(within(wordStudy).getByRole("tab", { name: /Early Church/i })).toBeInTheDocument();
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
      const wordStudy = screen.getByLabelText("Prototype word study");
      expect(within(wordStudy).getAllByText("λόγον").length).toBeGreaterThan(0);
      expect(within(wordStudy).getByText("G3056")).toBeInTheDocument();
    });
  });

  it("switches between prototype word-study usage tabs", async () => {
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
    expect((await within(wordStudy).findAllByText("θεοῦ")).length).toBeGreaterThan(0);

    fireEvent.click(within(wordStudy).getByRole("tab", { name: /NT Usage/i }));
    expect(await within(wordStudy).findByText("Titus 1:1")).toBeInTheDocument();

    fireEvent.click(within(wordStudy).getByRole("tab", { name: /LXX Usage/i }));
    expect(await within(wordStudy).findByText("No LXX usage found for this lemma.")).toBeInTheDocument();

    fireEvent.click(within(wordStudy).getByRole("tab", { name: /Early Church/i }));
    expect(await within(wordStudy).findByText("1 Clement · 1")).toBeInTheDocument();
  });
});
