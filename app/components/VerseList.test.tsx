import { BIBLE_GREEK_UNDERTEXT_STORAGE_KEY } from "@/app/components/BibleGreekUndertextProvider";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

jest.mock("@/lib/bible/greek", () => {
  const actual = jest.requireActual("@/lib/bible/greek");

  const greekEntries = {
    G746: {
      entryKey: "G746",
      lemma: "ἀρχή",
      strongs: "G746",
      transliteration: "archē",
      shortDefinition: "beginning",
      forms: [
        {
          form: "ἀρχή",
          morphology: "N-NSF",
          decodedMorphology: "noun nominative singular feminine"
        },
        {
          form: "ἀρχῆς",
          morphology: "N-GSF",
          decodedMorphology: "noun genitive singular feminine"
        },
        {
          form: "ἀρχῇ",
          morphology: "N-DSF",
          decodedMorphology: "noun dative singular feminine"
        }
      ]
    },
    G1096: {
      entryKey: "G1096",
      lemma: "γίνομαι",
      strongs: "G1096",
      transliteration: "ginomai",
      shortDefinition: "become",
      forms: [
        {
          form: "ἐγένετο",
          morphology: "V-2ADI-3S",
          decodedMorphology: "verb aorist middle indicative third person singular"
        }
      ]
    },
    G3056: {
      entryKey: "G3056",
      lemma: "λόγος",
      strongs: "G3056",
      transliteration: "logos",
      shortDefinition: "word",
      forms: [
        {
          form: "λόγον",
          morphology: "N-ASM",
          decodedMorphology: "noun accusative singular masculine"
        }
      ]
    },
    G3588: {
      entryKey: "G3588",
      lemma: "ὁ",
      strongs: "G3588",
      transliteration: "ho",
      shortDefinition: "the",
      forms: [
        {
          form: "τόν",
          morphology: "T-ASM",
          decodedMorphology: "article accusative singular masculine"
        }
      ]
    }
  } as const;

  const greekOccurrences = {
    G746: [
      {
        version: "greek",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "ἀρχῆς",
        greekTokens: [
          {
            surface: "ἀρχῆς",
            lemma: "ἀρχή",
            entryKey: "G746",
            strongs: "G746",
            morphology: "N-GSF",
            decodedMorphology: "noun genitive singular feminine",
            gloss: "beginning",
            transliteration: "archēs"
          }
        ]
      }
    ],
    G1096: [
      {
        version: "greek",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 2,
        text: "ἐγένετο",
        greekTokens: [
          {
            surface: "ἐγένετο",
            lemma: "γίνομαι",
            entryKey: "G1096",
            strongs: "G1096",
            morphology: "V-2ADI-3S",
            decodedMorphology: "verb aorist middle indicative third person singular",
            gloss: "became",
            transliteration: "egeneto"
          }
        ]
      }
    ],
    G3056: [
      {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 1,
        verseNumber: 1,
        text: "λόγον",
        greekTokens: [
          {
            surface: "λόγον",
            lemma: "λόγος",
            entryKey: "G3056",
            strongs: "G3056",
            morphology: "N-ASM",
            decodedMorphology: "noun accusative singular masculine",
            gloss: "word",
            transliteration: "logon"
          }
        ]
      }
    ],
    G3588: [
      {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 1,
        verseNumber: 1,
        text: "τόν",
        greekTokens: [
          {
            surface: "τόν",
            lemma: "ὁ",
            entryKey: "G3588",
            strongs: "G3588",
            morphology: "T-ASM",
            decodedMorphology: "article accusative singular masculine",
            gloss: "the",
            transliteration: "ton"
          }
        ]
      }
    ]
  } as const;

  return {
    ...actual,
    getGreekLemmaEntry: jest.fn(async (entryKey: string) => greekEntries[entryKey as keyof typeof greekEntries] ?? null),
    getGreekVerseOccurrences: jest.fn(async (entryKey: string, selectedFormValue?: string | null) => {
      const matches = [...(greekOccurrences[entryKey as keyof typeof greekOccurrences] ?? [])];

      if (!selectedFormValue) {
        return matches;
      }

      const normalizedSelectedForm = actual.normalizeGreekFormLookupValue(selectedFormValue);

      return matches.filter((entry) =>
        entry.greekTokens?.some((token) =>
          (token.entryKey ?? token.strongs ?? null) === entryKey &&
          actual.normalizeGreekFormLookupValue(token.surface) === normalizedSelectedForm
        )
      );
    })
  };
});

jest.mock("@/lib/fathers/search", () => {
  const normalizeFathersGreekText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{M}+/gu, "")
      .replace(/ς/g, "σ")
      .toLowerCase()
      .replace(/[^\p{Script=Greek}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();

  return {
    normalizeFathersGreekText,
    findFathersSegmentsByGreekLemma: jest.fn(async (lemma: string) =>
      normalizeFathersGreekText(lemma) === normalizeFathersGreekText("ὁ")
        ? [
            {
              workSlug: "1-clement",
              workTitle: "1 Clement",
              segmentId: "1-clement:1",
              ref: "1",
              label: "1",
              greek: "τόν λόγον",
              english: "the word",
              greekContext: "τόν λόγον",
              englishContext: "the word",
              greekLexicalTokens: [
                {
                  surface: "τόν",
                  lemma: "ὁ",
                  entryKey: "G3588",
                  strongs: "G3588",
                  morphology: "T-ASM",
                  decodedMorphology: "article accusative singular masculine",
                  gloss: "the",
                  transliteration: "ton"
                }
              ]
            }
          ]
        : []
    )
  };
});

jest.mock("@/lib/bible/strongs", () => {
  const actual = jest.requireActual("@/lib/bible/strongs");
  const normalize = (value: string) => actual.normalizeStrongsNumber(value);

  const strongsEntries = {
    G746: {
      id: "G746",
      language: "greek",
      lemma: "ἀρχή",
      transliteration: "archē",
      definition: "beginning",
      partOfSpeech: "noun",
      rootWord: "G746|ἀρχή|beginning",
      outlineUsage: "beginning, first cause, ruler"
    },
    G1096: {
      id: "G1096",
      language: "greek",
      lemma: "γίνομαι",
      transliteration: "ginomai",
      definition: "become",
      partOfSpeech: "verb",
      rootWord: "G1096|γίνομαι|become",
      outlineUsage: "become, happen, be made"
    },
    G3056: {
      id: "G3056",
      language: "greek",
      lemma: "λόγος",
      transliteration: "logos",
      definition: "word",
      partOfSpeech: "noun",
      rootWord: "G3004|λέγω|say, speak, call, tell, misc",
      outlineUsage: "of speech, a word, say, speak, call, tell, misc",
      bdagArticles: [
        {
          headword: "λόγος",
          transliteration: "logos",
          entry: "A word, message, or speaking.",
          summary: {
            plainMeaning: "A spoken or written word.",
            commonUse: "Usually means message, statement, or speech.",
            ntNote: "In the New Testament, it can also refer to the Word."
          }
        }
      ]
    },
    G3588: {
      id: "G3588",
      language: "greek",
      lemma: "ὁ",
      transliteration: "ho",
      definition: "the",
      partOfSpeech: "article",
      rootWord: "G3588|ὁ|the",
      outlineUsage: "the"
    },
    G976: {
      id: "G976",
      language: "greek",
      lemma: "βίβλος",
      transliteration: "biblos",
      definition: "book",
      partOfSpeech: "noun",
      rootWord: "G976|βίβλος|book",
      outlineUsage: "a written book, a roll, a scroll"
    },
    G1078: {
      id: "G1078",
      language: "greek",
      lemma: "γένεσις",
      transliteration: "genesis",
      definition: "origin",
      partOfSpeech: "noun",
      rootWord: "G1078|γένεσις|origin",
      outlineUsage: "source, origin, a book of one's lineage"
    },
    H7225: {
      id: "H7225",
      language: "hebrew",
      lemma: "רֵאשִׁית",
      transliteration: "rē'šîṯ",
      definition: "beginning",
      partOfSpeech: "noun",
      rootWord: "H7225|רֵאשִׁית|beginning",
      outlineUsage: "first, beginning"
    }
  } as const;

  const strongsOccurrences = {
    H7225: [
      {
        version: "kjv",
        bookSlug: "genesis",
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "In the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["H7225"] }]
      }
    ]
  } as const;

  const verseEntriesByVersion = {
    web: {
      "matthew:1:1": {
        version: "web",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 1,
        verseNumber: 1,
        text: "the word"
      }
    },
    kjv: {
      "genesis:1:1": {
        version: "kjv",
        bookSlug: "genesis",
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "In the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["H7225"] }]
      },
      "john:1:1": {
        version: "kjv",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["G746"] }]
      },
      "john:1:2": {
        version: "kjv",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 2,
        text: "became",
        tokens: [{ text: "became", strongsNumbers: ["G1096"] }]
      },
      "matthew:1:1": {
        version: "kjv",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 1,
        verseNumber: 1,
        text: "the word",
        tokens: [
          { text: "the", strongsNumbers: ["G3588"] },
          { text: "word", strongsNumbers: ["G3056"] }
        ]
      }
    },
    greek: {
      "john:1:1": {
        version: "greek",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "ἀρχῆς",
        greekTokens: [
          {
            surface: "ἀρχῆς",
            lemma: "ἀρχή",
            entryKey: "G746",
            strongs: "G746",
            morphology: "N-GSF",
            decodedMorphology: "noun genitive singular feminine",
            gloss: "beginning",
            transliteration: "archēs"
          }
        ]
      },
      "john:1:2": {
        version: "greek",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 2,
        text: "ἐγένετο",
        greekTokens: [
          {
            surface: "ἐγένετο",
            lemma: "γίνομαι",
            entryKey: "G1096",
            strongs: "G1096",
            morphology: "V-2ADI-3S",
            decodedMorphology: "verb aorist middle indicative third person singular",
            gloss: "became",
            transliteration: "egeneto"
          }
        ]
      },
      "matthew:1:1": {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 1,
        verseNumber: 1,
        text: "τόν λόγον",
        greekTokens: [
          {
            surface: "τόν",
            lemma: "ὁ",
            entryKey: "G3588",
            strongs: "G3588",
            morphology: "T-ASM",
            decodedMorphology: "article accusative singular masculine",
            gloss: "the",
            transliteration: "ton"
          },
          {
            surface: "λόγον",
            lemma: "λόγος",
            entryKey: "G3056",
            strongs: "G3056",
            morphology: "N-ASM",
            decodedMorphology: "noun accusative singular masculine",
            gloss: "word",
            transliteration: "logon"
          }
        ]
      }
    },
    mt: {
      "genesis:1:1": {
        version: "mt",
        bookSlug: "genesis",
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "בראשית ברא אלהים",
        hebrewTokens: [
          {
            surface: "בראשית",
            lemma: "רֵאשִׁית",
            strongs: "H7225",
            morphology: "Ncfsa",
            decodedMorphology: "feminine noun",
            transliteration: "rē'šîṯ",
            gloss: "beginning"
          }
        ]
      }
    }
  } as const;

  const makeKey = (anchor: { bookSlug: string; chapterNumber: number; verseNumber: number }) =>
    `${anchor.bookSlug}:${anchor.chapterNumber}:${anchor.verseNumber}`;

  return {
    ...actual,
    getStrongsEntries: jest.fn(async (entryIds: string[]) =>
      entryIds
        .map((entryId) => strongsEntries[normalize(entryId) as keyof typeof strongsEntries] ?? null)
        .filter(Boolean)
    ),
    getStrongsEntry: jest.fn(async (entryId: string) =>
      strongsEntries[normalize(entryId) as keyof typeof strongsEntries] ?? null
    ),
    getStrongsVerseOccurrencesWithTokens: jest.fn(async (entryId: string) =>
      [...(strongsOccurrences[normalize(entryId) as keyof typeof strongsOccurrences] ?? [])]
    ),
    getVerseEntriesForVersion: jest.fn(async (anchors, version) =>
      anchors.map((anchor) => ({
        version,
        entry:
          verseEntriesByVersion[version as keyof typeof verseEntriesByVersion]?.[
            makeKey(anchor) as keyof (typeof verseEntriesByVersion)[keyof typeof verseEntriesByVersion]
          ] ?? null,
        href: `/${version}/${makeKey(anchor)}`
      }))
    )
  };
});

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { LookupPane } from "@/app/components/LookupPane";
import { VerseList } from "@/app/components/VerseList";
import { READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import type { EsvInterlinearDisplayVerse, Verse } from "@/lib/bible/types";
import { READER_CUSTOMIZATION_STORAGE_KEY } from "@/lib/reader-customization";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const verses: Verse[] = [
  {
    number: 1,
    text: "In the beginning God created the heaven and the earth.",
    tokens: [
      {
        text: "In the beginning",
        strongsNumbers: ["H7225"]
      },
      {
        text: " God created the heaven and the earth."
      }
    ]
  },
  {
    number: 2,
    text: "And the earth was without form, and void."
  }
];

const interlinearVerseMap: Record<number, EsvInterlinearDisplayVerse> = {
  1: {
    number: 1,
    baseGreek: "ἀρχῆς",
    greek: "ἀρχῆς",
    tokens: [
      {
        surface: "ἀρχῆς",
        lemma: "ἀρχή",
        strongs: "G746",
        morphology: "N-GSF",
        decodedMorphology: "noun genitive singular feminine",
        gloss: "of the beginning"
      }
    ]
  },
  2: {
    number: 2,
    baseGreek: "ἐγένετο",
    greek: "ἐγένετο",
    tokens: [
      {
        surface: "ἐγένετο",
        lemma: "γίνομαι",
        strongs: "G1096",
        morphology: "V-3AAI-S",
        decodedMorphology: "verb aorist active indicative third person singular",
        gloss: "became"
      }
    ]
  }
};

const repeatedLemmaInterlinearVerseMap: Record<number, EsvInterlinearDisplayVerse> = {
  1: {
    number: 1,
    baseGreek: "ἀρχῆς",
    greek: "ἀρχῆς",
    tokens: [
      {
        surface: "ἀρχῆς",
        lemma: "ἀρχή",
        strongs: "G746",
        morphology: "N-GSF",
        decodedMorphology: "noun genitive singular feminine",
        gloss: "beginning"
      }
    ]
  },
  2: {
    number: 2,
    baseGreek: "ἀρχῇ",
    greek: "ἀρχῇ",
    tokens: [
      {
        surface: "ἀρχῇ",
        lemma: "ἀρχή",
        strongs: "G746",
        morphology: "N-DSF",
        decodedMorphology: "noun dative singular feminine",
        gloss: "beginning"
      }
    ]
  }
};

const translationAssemblyVerses: Verse[] = [
  {
    number: 1,
    text: "The book became."
  }
];

const translationAssemblyInterlinearVerseMap: Record<number, EsvInterlinearDisplayVerse> = {
  1: {
    number: 1,
    baseGreek: "βίβλος ἐγένετο.",
    greek: "βίβλος ἐγένετο.",
    tokens: [
      {
        surface: "βίβλος",
        lemma: "βίβλος",
        strongs: "G976",
        gloss: "book"
      },
      {
        surface: "ἐγένετο",
        lemma: "γίνομαι",
        strongs: "G1096",
        gloss: "became",
        trailingPunctuation: "."
      }
    ]
  }
};

const grammarPhraseVerses: Verse[] = [
  {
    number: 1,
    text: "the word"
  }
];

const grammarPhraseInterlinearVerseMap: Record<number, EsvInterlinearDisplayVerse> = {
  1: {
    number: 1,
    baseGreek: "τόν λόγον",
    greek: "τόν λόγον",
    tokens: [
      {
        surface: "τόν",
        lemma: "ὁ",
        strongs: "G3588",
        morphology: "T-ASM",
        decodedMorphology: "article accusative singular masculine",
        gloss: "the"
      },
      {
        surface: "λόγον",
        lemma: "λόγος",
        strongs: "G3056",
        morphology: "N-ASM",
        decodedMorphology: "noun accusative singular masculine",
        gloss: "word"
      }
    ]
  }
};

describe("VerseList", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "http://localhost/read/genesis/1");
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: true,
        media: "(min-width: 64rem)",
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  it("renders plain text when Strongs is disabled", () => {
    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    expect(screen.getByText("In the beginning God created the heaven and the earth.")).toBeInTheDocument();
    expect(screen.queryByText("H7225")).not.toBeInTheDocument();
  });

  it("can hide verse numbers", () => {
    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        showVerseNumbers={false}
        verses={verses}
      />
    );

    expect(container.querySelector(".verse-number")).toBeNull();
    expect(
      screen.getByText("In the beginning God created the heaven and the earth.")
    ).toBeInTheDocument();
  });

  it("does not render a custom translation line before any glosses are typed", () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    expect(screen.queryByText("Your translation")).not.toBeInTheDocument();
  });

  it("builds my translation from grammar-aware Greek form glosses", async () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={{
          1: {
            number: 1,
            baseGreek: "ἀρχῆς.",
            greek: "ἀρχῆς.",
            tokens: [
              {
                surface: "ἀρχῆς",
                lemma: "ἀρχή",
                strongs: "G746",
                morphology: "N-GSF",
                decodedMorphology: "noun genitive singular feminine",
                gloss: "beginning",
                trailingPunctuation: "."
              }
            ]
          }
        }}
        verses={[
          {
            number: 1,
            text: "Of beginning."
          }
        ]}
      />
    );

    expect(await screen.findByText("Your translation")).toBeInTheDocument();
    expect(await screen.findByText("of beginning.", {}, { timeout: 10000 })).toBeInTheDocument();
    expect(await screen.findByLabelText("English gloss for ἀρχῆς", {}, { timeout: 10000 })).toHaveAttribute(
      "placeholder",
      "of beginning"
    );
  }, 15000);

  it("can hide verse text, custom verse translation, and selected Greek sub-lines independently", async () => {
    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        showCustomVerseTranslation={false}
        showGreekGloss={false}
        showGreekLemma={false}
        showGreekTransliteration={false}
        showVerseText={false}
        verses={verses}
      />
    );

    expect(screen.queryByText("In the beginning God created the heaven and the earth.")).not.toBeInTheDocument();
    expect(screen.queryByText("Your translation")).not.toBeInTheDocument();
    expect(await screen.findByText("ἀρχῆς")).toBeInTheDocument();
    expect(screen.queryByText("ἀρχή")).not.toBeInTheDocument();
    expect(screen.queryByText("archēs")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("English gloss for ἀρχῆς")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Explain morphology for ἀρχῆς: Noun · Genitive Singular Feminine"
      })
    ).not.toBeInTheDocument();
  });

  it("shows Greek Strong's numbers beside matched ESV English words in interlinear mode", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "esv");
    window.history.replaceState({}, "", "http://localhost/read/john/1?version=esv");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(await screen.findByRole("button", { name: "beginning G746" })).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("God"))).toBeInTheDocument();
  });

  it("shows the part of speech under ESV interlinear Greek words", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "esv");
    window.history.replaceState({}, "", "http://localhost/read/john/1?version=esv");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(await screen.findByText("Noun")).toBeInTheDocument();
    expect(await screen.findByText("Verb")).toBeInTheDocument();
  });

  it("opens Greek grammar details in the study pane and lets the lemma hand off to Strongs", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "esv");
    window.history.replaceState({}, "", "http://localhost/read/matthew/1?version=esv");

    renderWithReaderCustomization(
      <AppSplitLayout>
        <VerseList
          bookSlug="matthew"
          chapterNumber={1}
          interlinearVerseMap={grammarPhraseInterlinearVerseMap}
          showExpandedGreekGrammarCards={false}
          showGreekGrammarCards
          verses={grammarPhraseVerses}
        />
      </AppSplitLayout>
    );

    expect((await screen.findAllByText("Lemma")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("Accusative Singular Masculine")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /τόν ὁ G3588/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Grammar" })).toHaveAttribute("aria-selected", "true");
    });

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByText("Full morphology")).toBeInTheDocument();
    expect(within(studyPane).getByText("Linked phrase")).toBeInTheDocument();
    expect((await within(studyPane).findAllByText("τόν λόγον")).length).toBeGreaterThan(0);
    expect(within(studyPane).getByRole("tab", { name: "Details" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(studyPane).getByRole("tab", { name: "Verses" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    const sectionLabels = Array.from(
      studyPane.querySelectorAll(".strongs-entry-section-label")
    ).map((label) => label.textContent);
    expect(sectionLabels.indexOf("Grammar")).toBeLessThan(sectionLabels.indexOf("Selected Form"));
    expect(within(studyPane).queryByText("Bible Verses With This Form")).not.toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("tab", { name: "Verses" }));
    expect(within(studyPane).getByRole("tab", { name: "Verses" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    const exactFormSection = (await within(studyPane).findByText("Bible Verses With This Form")).closest(
      ".greek-grammar-panel-section"
    );
    expect(exactFormSection).not.toBeNull();
    expect(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "New Testament" })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "Old Testament" })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "Early Fathers" })
    ).toHaveAttribute("aria-pressed", "false");
    expect(within(exactFormSection as HTMLElement).getByRole("button", { name: "Greek" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(exactFormSection as HTMLElement).getByRole("button", { name: "KJV" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(await within(exactFormSection as HTMLElement).findByText("Matthew 1:1")).toBeInTheDocument();
    expect(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "τόν" })
    ).toBeInTheDocument();
    const occurrenceCard = within(exactFormSection as HTMLElement)
      .getByText("Matthew 1:1")
      .closest(".strongs-entry-bible-verse");
    expect(occurrenceCard).not.toBeNull();
    expect(within(occurrenceCard as HTMLElement).getByText("Greek")).toBeInTheDocument();

    fireEvent.click(within(exactFormSection as HTMLElement).getByRole("button", { name: "KJV" }));

    await waitFor(() =>
      expect(within(exactFormSection as HTMLElement).getByRole("button", { name: "KJV" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(within(occurrenceCard as HTMLElement).getByText("KJV")).toBeInTheDocument();
    expect(
      await within(occurrenceCard as HTMLElement).findByRole("button", { name: /the G3588/i })
    ).toBeInTheDocument();

    fireEvent.click(within(exactFormSection as HTMLElement).getByRole("button", { name: "WEB" }));

    await waitFor(() =>
      expect(within(exactFormSection as HTMLElement).getByRole("button", { name: "WEB" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    const webRow = within(occurrenceCard as HTMLElement)
      .getByText("WEB")
      .closest(".strongs-entry-bible-version-row");
    expect(webRow).not.toBeNull();
    expect((webRow as HTMLElement).querySelector(".strongs-inline-match")).not.toBeNull();
    expect(within(studyPane).queryByText("Inflected Forms")).not.toBeInTheDocument();

    fireEvent.click(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "Old Testament" })
    );

    await waitFor(() =>
      expect(
        within(exactFormSection as HTMLElement).getByRole("button", { name: "Old Testament" })
      ).toHaveAttribute("aria-pressed", "true")
    );
    expect(
      within(exactFormSection as HTMLElement).getByText(
        "No Old Testament Bible verses found with this exact form."
      )
    ).toBeInTheDocument();

    fireEvent.click(
      within(exactFormSection as HTMLElement).getByRole("button", { name: "Early Fathers" })
    );

    await waitFor(() =>
      expect(
        within(exactFormSection as HTMLElement).getByRole("button", { name: "Early Fathers" })
      ).toHaveAttribute("aria-pressed", "true")
    );
    expect(
      within(exactFormSection as HTMLElement).queryByRole("button", { name: "KJV" })
    ).not.toBeInTheDocument();
    expect(await within(exactFormSection as HTMLElement).findByText("1 Clement · 1")).toBeInTheDocument();
    expect(within(exactFormSection as HTMLElement).getByText("the word")).toBeInTheDocument();
    const fathersGreekLine = within(exactFormSection as HTMLElement)
      .getByText("τόν")
      .closest(".strongs-entry-fathers-greek");
    expect(fathersGreekLine).not.toBeNull();
    expect((fathersGreekLine as HTMLElement).querySelector(".strongs-inline-match")).not.toBeNull();

    fireEvent.click(within(studyPane).getByRole("button", { name: "ὁ" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Strongs" })).toHaveAttribute("aria-selected", "true");
    });
  });

  it("opens Strongs details in the study pane from a tagged token", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="genesis"
          chapterNumber={1}
          showStrongs
          verses={verses}
        />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: /In the beginning H7225/i }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Strongs" })).toHaveAttribute("aria-selected", "true");
    });
    const studyPane = screen.getByLabelText("Study pane");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(within(studyPane).getByRole("heading", { name: "H7225" })).toBeInTheDocument();
    expect(await within(studyPane).findByText(/Transliteration:/i)).toBeInTheDocument();
  });

  it("shows the lemma under tagged words in reader view", async () => {
    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs
        verses={verses}
      />
    );

    expect(await screen.findByText(/רֵאשִׁית/)).toBeInTheDocument();
  });

  it("lets KJV Strongs undertext follow the reader transliteration and gloss toggles", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showStrongs: true,
        showGreekLemma: false,
        showGreekTransliteration: true,
        showGreekGloss: true
      })
    );

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showGreekGloss
        showGreekLemma={false}
        showGreekTransliteration
        showStrongs
        verses={verses}
      />
    );

    expect(await screen.findByText(/rē'šîṯ/i)).toBeInTheDocument();
    expect(screen.getByText(/first, beginning/i)).toBeInTheDocument();
    expect(screen.queryByText("רֵאשִׁית")).not.toBeInTheDocument();
  });

  it("renders standalone Hebrew tokens and opens Strongs from the Masoretic reader", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "mt");
    window.history.replaceState({}, "", "http://localhost/read/genesis/1?version=mt");

    const { container } = renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="genesis"
          chapterNumber={1}
          showGreekGloss
          showGreekLemma
          showGreekTransliteration
          showVerseStrongs
          verses={[
            {
              number: 1,
              text: "בראשית ברא אלהים",
              hebrewTokens: [
                {
                  surface: "בראשית",
                  lemma: "רֵאשִׁית",
                  strongs: "H7225",
                  morphology: "Ncfsa",
                  decodedMorphology: "feminine noun",
                  transliteration: "rē'šîṯ",
                  gloss: "beginning"
                },
                {
                  surface: "ברא",
                  lemma: "בָּרָא",
                  strongs: "H1254",
                  morphology: "Vqp3ms",
                  decodedMorphology: "verb",
                  transliteration: "bārā'",
                  gloss: "create"
                }
              ]
            }
          ]}
        />
        <LookupPane />
      </>
    );

    const hebrewToken = await screen.findByRole("button", { name: /בראשית.*H7225/i });

    expect(hebrewToken).toBeInTheDocument();
    expect(screen.getByText(/rē'šîṯ/)).toBeInTheDocument();
    expect(screen.getByText(/beginning/)).toBeInTheDocument();
    expect(hebrewToken).toHaveTextContent("feminine noun");
    expect(container.querySelector(".hebrew-verse-reading-aids")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".verse-hebrew-token-wrap")).toHaveLength(2);

    fireEvent.click(hebrewToken);

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Strongs" })).toHaveAttribute("aria-selected", "true");
    });

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByText("H7225")).toBeInTheDocument();
  });

  it("opens Hebrew grammar details and exact-form verses from a Masoretic token", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "mt");
    window.history.replaceState({}, "", "http://localhost/read/genesis/1?version=mt");

    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="genesis"
          chapterNumber={1}
          showGreekGloss
          showGreekGrammarCards
          showGreekLemma
          showGreekTransliteration
          showVerseStrongs
          verses={[
            {
              number: 1,
              text: "בראשית ברא אלהים",
              hebrewTokens: [
                {
                  surface: "בראשית",
                  lemma: "רֵאשִׁית",
                  strongs: "H7225",
                  morphology: "Ncfsa",
                  decodedMorphology: "feminine noun",
                  transliteration: "rē'šîṯ",
                  gloss: "beginning"
                }
              ]
            }
          ]}
        />
        <LookupPane />
      </>
    );

    fireEvent.click(await screen.findByRole("button", { name: /בראשית.*H7225/i }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Grammar" })).toHaveAttribute("aria-selected", "true");
    });

    const studyPane = screen.getByLabelText("Study pane");
    expect(within(studyPane).getByText("Hebrew grammar")).toBeInTheDocument();
    expect(within(studyPane).getByText("Full morphology")).toBeInTheDocument();
    expect(within(studyPane).getAllByText("feminine noun").length).toBeGreaterThan(0);
    expect(within(studyPane).getByText("Selected Form")).toBeInTheDocument();
    expect(within(studyPane).getByText("בראשית")).toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("tab", { name: "Verses" }));

    expect(await within(studyPane).findByText("Bible Verses With This Form")).toBeInTheDocument();
    expect(within(studyPane).getByRole("button", { name: "Old Testament" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(await within(studyPane).findByText("Genesis 1:1")).toBeInTheDocument();
  });

  it("renders Greek interlinear tokens and opens the Greek dictionary from a clicked form", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="john"
          chapterNumber={1}
          interlinearVerseMap={interlinearVerseMap}
          verses={verses}
        />
        <LookupPane />
      </>
    );

    expect(await screen.findByLabelText("English gloss for ἀρχῆς")).toBeInTheDocument();
    expect(screen.getByText("ἀρχῆς")).toBeInTheDocument();
    expect(screen.getAllByText("ἀρχή").length).toBeGreaterThan(0);
    expect(await screen.findByText("archēs")).toBeInTheDocument();
    expect(screen.getByLabelText("English gloss for ἀρχῆς")).toHaveValue("");
    expect(
      screen.queryByRole("button", {
        name: "Explain morphology for ἀρχῆς: Noun · Genitive Singular Feminine"
      })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();
    expect(await within(studyPane).findByRole("button", { name: "Open charts" })).toBeInTheDocument();
  });

  it("opens the grammar pane from Greek word clicks when grammar cards are enabled", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="john"
          chapterNumber={1}
          interlinearVerseMap={interlinearVerseMap}
          showGreekGrammarCards
          verses={verses}
        />
        <LookupPane />
      </>
    );

    fireEvent.click(await screen.findByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("tab", { name: "Grammar" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(await within(studyPane).findByRole("button", { name: "ἀρχή" })).toBeInTheDocument();
  });

  it("shows transliteration and gloss lines for the standalone Greek version", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        verses={[
          {
            number: 1,
            text: "ἐν ἀρχῇ",
            translationText: "In the beginning",
            greekTokens: [
              {
                surface: "ἀρχῇ",
                lemma: "ἀρχή",
                entryKey: "G746",
                strongs: "G746",
                morphology: "N-DSF",
                decodedMorphology: "noun dative singular feminine",
                gloss: "beginning"
              }
            ]
          }
        ]}
      />
    );

    expect((await screen.findAllByText("ἀρχῇ")).length).toBeGreaterThan(0);
    expect(screen.getByText("In the beginning")).toBeInTheDocument();
    expect(await screen.findByText("archē")).toBeInTheDocument();
    expect((await screen.findAllByText("Noun")).length).toBeGreaterThan(0);
    expect(await screen.findByLabelText("English gloss for ἀρχῇ")).toBeInTheDocument();
    expect(screen.getByLabelText("English gloss for ἀρχῇ")).toHaveValue("");
  });

  it("does not render a More button for standalone Greek grammar cards", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showGreekGrammarCards
        verses={[
          {
            number: 1,
            text: "ἐγένετο",
            translationText: "became",
            greekTokens: [
              {
                surface: "ἐγένετο",
                lemma: "γίνομαι",
                entryKey: "G1096",
                strongs: "G1096",
                morphology: "V-3AAI-S",
                decodedMorphology: "verb aorist active indicative third person singular",
                gloss: "became"
              }
            ]
          }
        ]}
      />
    );

    expect((await screen.findAllByText("Gloss")).length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", { name: /open grammar details for ἐγένετο/i })
    ).not.toBeInTheDocument();
  });

  it("shows only the selected grammar quick fields under Greek words", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        showGreekGrammarCards: true,
        showGreekGrammarPartOfSpeech: false,
        showGreekGrammarLemma: false,
        showGreekGrammarGloss: true,
        showGreekGrammarForm: false
      })
    );

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showGreekGrammarCards
        verses={[
          {
            number: 1,
            text: "became",
            greekTokens: [
              {
                surface: "ἐγένετο",
                lemma: "γίνομαι",
                entryKey: "G1096",
                strongs: "G1096",
                morphology: "V-3AAI-S",
                decodedMorphology: "verb aorist active indicative third person singular",
                gloss: "became"
              }
            ]
          }
        ]}
      />
    );

    expect((await screen.findAllByText("Gloss")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("became").length).toBeGreaterThan(0);
    expect(screen.queryByText("Lemma")).not.toBeInTheDocument();
    expect(screen.queryByText("Form")).not.toBeInTheDocument();
  });

  it("shows Strong's numbers beside each word in the Textus Receptus reader", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "tr");
    window.history.replaceState({}, "", "http://localhost/read/matthew/1?version=tr");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="matthew"
        chapterNumber={1}
        verses={[
          {
            number: 1,
            text: "βίβλος γενέσεως",
            translationText: "The book of the generation",
            greekTokens: [
              {
                surface: "βίβλος",
                lemma: "βίβλος",
                entryKey: "G976",
                strongs: "G976",
                morphology: "N-NSF",
                decodedMorphology: "noun nominative singular feminine",
                gloss: "book"
              },
              {
                surface: "γενέσεως",
                lemma: "γένεσις",
                entryKey: "G1078",
                strongs: "G1078",
                morphology: "N-GSF",
                decodedMorphology: "noun genitive singular feminine",
                gloss: "generation"
              }
            ]
          }
        ]}
      />
    );

    expect((await screen.findAllByText("βίβλος")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("G976").length).toBeGreaterThan(0);
    expect(screen.getAllByText("G1078").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Noun").length).toBeGreaterThan(0);
  });

  it("shows a Strong's-linked English gloss line for the Textus Receptus reader", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "tr");
    window.history.replaceState({}, "", "http://localhost/read/matthew/1?version=tr");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="matthew"
        chapterNumber={1}
        verses={[
          {
            number: 1,
            text: "βίβλος γενέσεως",
            translationText: "The book of the genealogy",
            greekTokens: [
              {
                surface: "βίβλος",
                lemma: "βίβλος",
                entryKey: "G976",
                strongs: "G976",
                gloss: "a written book, a roll, a scroll"
              },
              {
                surface: "γενέσεως",
                lemma: "γένεσις",
                entryKey: "G1078",
                strongs: "G1078",
                gloss: "source, origin, a book of one's lineage"
              }
            ]
          }
        ]}
      />
    );

    expect(await screen.findByRole("button", { name: "a written book G976" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "source G1078" })).toBeInTheDocument();
    expect(screen.getByText("The book of the genealogy")).toBeInTheDocument();
  });

  it("adds Bible Greek undertext by clicking the English word in the standalone Greek version", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");

    renderWithReaderCustomization(
      <VerseList
        annotationMode
        bookSlug="genesis"
        chapterNumber={1}
        verses={[
          {
            number: 1,
            text: "ἐν ἀρχῇ",
            translationText: "In the beginning",
            greekTokens: [
              {
                surface: "ἀρχῇ",
                lemma: "ἀρχή",
                entryKey: "G746",
                strongs: "G746",
                gloss: "beginning",
                transliteration: "archē"
              }
            ]
          }
        ]}
      />
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Show Greek undertext for beginning" })
    );

    await waitFor(() => {
      expect(screen.getAllByText("ἀρχῇ").length).toBeGreaterThan(1);
    });
    await waitFor(() => {
      expect(window.localStorage.getItem(BIBLE_GREEK_UNDERTEXT_STORAGE_KEY)).toContain(
        "\"source\":\"verse-token\""
      );
    });
  }, 15000);

  it("can hide saved Bible Greek undertext without removing the verse text", async () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");
    window.localStorage.setItem(
      BIBLE_GREEK_UNDERTEXT_STORAGE_KEY,
      JSON.stringify({
        "genesis:1:1": [
          {
            verseKey: "genesis:1:1",
            startToken: 2,
            endToken: 2,
            greekText: "ἀρχῇ",
            entryKey: "G746",
            lemma: "ἀρχή",
            strongs: "G746",
            transliteration: "archē",
            gloss: "beginning",
            source: "verse-token"
          }
        ]
      })
    );

    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showAnnotatedGreekUndertext={false}
        verses={[
          {
            number: 1,
            text: "ἐν ἀρχῇ",
            translationText: "In the beginning",
            greekTokens: [
              {
                surface: "ἀρχῇ",
                lemma: "ἀρχή",
                entryKey: "G746",
                strongs: "G746",
                gloss: "beginning",
                transliteration: "archē"
              }
            ]
          }
        ]}
      />
    );

    expect(await screen.findByText("In the beginning")).toBeInTheDocument();
    expect(container.querySelector(".fathers-annotation-undertext")).toBeNull();
  });

  it("can hide the standalone Greek English companion line independently", () => {
    window.localStorage.setItem(READER_VERSION_STORAGE_KEY, "greek");

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showCompanionVerseTranslation={false}
        verses={[
          {
            number: 1,
            text: "ἐν ἀρχῇ",
            translationText: "In the beginning",
            greekTokens: [
              {
                surface: "ἀρχῇ",
                lemma: "ἀρχή",
                entryKey: "G746",
                strongs: "G746",
                gloss: "beginning"
              }
            ]
          }
        ]}
      />
    );

    expect(screen.getAllByText("ἀρχῇ").length).toBeGreaterThan(0);
    expect(screen.queryByText("In the beginning")).not.toBeInTheDocument();
  });

  it("lets me type an English gloss for one Greek word without changing another", async () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    const firstGloss = await screen.findByLabelText("English gloss for ἀρχῆς");
    const secondGloss = screen.getByLabelText("English gloss for ἐγένετο");

    fireEvent.change(firstGloss, { target: { value: "origin" } });

    expect(firstGloss).toHaveValue("origin");
    expect(secondGloss).toHaveValue("");
  });

  it("starts each Greek gloss line empty until I type something", async () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(await screen.findByLabelText("English gloss for ἀρχῆς")).toHaveValue("");
    expect(screen.getByLabelText("English gloss for ἐγένετο")).toHaveValue("");
  });

  it("shows noun morphology in the Greek dictionary panel instead of inline in the reader", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="john"
          chapterNumber={1}
          interlinearVerseMap={interlinearVerseMap}
          verses={verses}
        />
        <LookupPane />
      </>
    );

    expect(
      screen.queryByRole("button", {
        name: "Explain morphology for ἀρχῆς: Noun · Genitive Singular Feminine"
      })
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();
    expect(within(studyPane).queryByText("Inflected Forms")).not.toBeInTheDocument();
    expect(within(studyPane).getByRole("button", { name: "Open charts" })).toBeInTheDocument();
  });

  it("opens the Charts study tab from a clicked Greek noun", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="john"
          chapterNumber={1}
          interlinearVerseMap={interlinearVerseMap}
          verses={verses}
        />
        <LookupPane />
      </>
    );

    fireEvent.click(await screen.findByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(
      await within(studyPane).findByRole("button", { name: "Open charts" })
    );

    await waitFor(() =>
      expect(within(studyPane).getByRole("tab", { name: "Charts" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    );
    expect(within(studyPane).getByRole("heading", { name: "Greek Charts" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Nouns" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      within(studyPane).getByRole("table", { name: "Masculine 2nd Declension Noun Chart" })
    ).toBeInTheDocument();
  });

  it("shows verb morphology in the Greek dictionary panel", async () => {
    renderWithReaderCustomization(
      <>
        <VerseList
          bookSlug="john"
          chapterNumber={1}
          interlinearVerseMap={interlinearVerseMap}
          verses={verses}
        />
        <LookupPane />
      </>
    );

    expect(
      screen.queryByRole("button", {
        name: "Explain morphology for ἐγένετο: Verb · Aorist Active Indicative"
      })
    ).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /ἐγένετο γίνομαι G1096/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "γίνομαι" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();
    expect(within(studyPane).queryByText("Inflected Forms")).not.toBeInTheDocument();
    expect(within(studyPane).getByRole("button", { name: "Open charts" })).toBeInTheDocument();
  });

  it("persists a custom gloss for a single occurrence across reloads", async () => {
    const { unmount } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    const firstGloss = await screen.findByLabelText("English gloss for ἀρχῆς");
    fireEvent.change(firstGloss, {
      target: {
        value: "first cause"
      }
    });

    expect(firstGloss).toHaveValue("first cause");

    unmount();

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(screen.getByLabelText("English gloss for ἀρχῆς")).toHaveValue("first cause");
    expect(screen.getByLabelText("English gloss for ἐγένετο")).toHaveValue("");
  });

  it("keeps a typed gloss visible after gloss editing is turned off", async () => {
    const { rerender } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        showGreekGloss
        verses={verses}
      />
    );

    fireEvent.change(await screen.findByLabelText("English gloss for ἀρχῆς"), {
      target: {
        value: "origin"
      }
    });

    rerender(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        showGreekGloss={false}
        verses={verses}
      />
    );

    expect(screen.queryByLabelText("English gloss for ἀρχῆς")).not.toBeInTheDocument();
    expect(screen.getAllByText("origin").length).toBeGreaterThan(0);
  });

  it("keeps repeated lemma occurrences independent unless I type each gloss", async () => {
    const { unmount } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={repeatedLemmaInterlinearVerseMap}
        verses={verses}
      />
    );

    const firstGloss = await screen.findByLabelText("English gloss for ἀρχῆς");
    const secondGloss = screen.getByLabelText("English gloss for ἀρχῇ");

    fireEvent.change(firstGloss, { target: { value: "origin" } });

    expect(firstGloss).toHaveValue("origin");
    expect(secondGloss).toHaveValue("");

    fireEvent.change(secondGloss, { target: { value: "beginning" } });

    expect(firstGloss).toHaveValue("origin");
    expect(secondGloss).toHaveValue("beginning");

    unmount();

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={repeatedLemmaInterlinearVerseMap}
        verses={verses}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("English gloss for ἀρχῆς")).toHaveValue("origin");
      expect(screen.getByLabelText("English gloss for ἀρχῇ")).toHaveValue("beginning");
    });
  });

  it("builds and reloads my translation from the typed glosses", async () => {
    const { unmount } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={translationAssemblyInterlinearVerseMap}
        verses={translationAssemblyVerses}
      />
    );

    fireEvent.change(await screen.findByLabelText("English gloss for βίβλος"), {
      target: {
        value: "book"
      }
    });
    fireEvent.change(screen.getByLabelText("English gloss for ἐγένετο"), {
      target: {
        value: "became"
      }
    });

    expect(screen.getByText("Your translation")).toBeInTheDocument();
    expect(screen.getByText("book became.")).toBeInTheDocument();

    unmount();

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={translationAssemblyInterlinearVerseMap}
        verses={translationAssemblyVerses}
      />
    );

    expect(screen.getByText("Your translation")).toBeInTheDocument();
    expect(screen.getByText("book became.")).toBeInTheDocument();
  });

  it("hides the my translation heading when chapter headings are turned off", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showChapterHeadings: false
      })
    );

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={translationAssemblyInterlinearVerseMap}
        verses={translationAssemblyVerses}
      />
    );

    fireEvent.change(await screen.findByLabelText("English gloss for βίβλος"), {
      target: {
        value: "book"
      }
    });
    fireEvent.change(screen.getByLabelText("English gloss for ἐγένετο"), {
      target: {
        value: "became"
      }
    });

    expect(screen.queryByText("Your translation")).not.toBeInTheDocument();
    expect(screen.getByText("book became.")).toBeInTheDocument();
  });
});
