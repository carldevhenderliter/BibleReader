import { fireEvent, screen, waitFor, within } from "@testing-library/react";

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
          id: `${versions[0] ?? "web"}:titus:1:1`,
          version: versions[0] ?? "web",
          bookSlug: "titus",
          chapterNumber: 1,
          verseNumber: 1,
          label: "Titus 1:1",
          description: "Paul, a servant of God.",
          href: "/read/titus/1",
          preview: "Paul, a servant of God, and an apostle."
        }
      ],
      emptyMessage: ""
    }
  ])
}));

jest.mock("@/lib/bible/greek", () => {
  const actual = jest.requireActual("@/lib/bible/greek");

  const greekEntries = {
    G1: {
      entryKey: "G1",
      lemma: "ἀ",
      strongs: "G1",
      transliteration: "a",
      shortDefinition: "alpha",
      forms: []
    },
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
          form: "λόγος",
          morphology: "N-NSM",
          decodedMorphology: "noun nominative singular masculine"
        },
        {
          form: "λόγου",
          morphology: "N-GSM",
          decodedMorphology: "noun genitive singular masculine"
        }
      ]
    }
  } as const;

  const greekOccurrences = {
    G746: [
      {
        version: "greek",
        bookSlug: "1-chronicles",
        bookName: "1 Chronicles",
        chapterNumber: 17,
        verseNumber: 9,
        text: "ἀπ᾿ ἀρχῆς",
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
      {
        version: "greek",
        bookSlug: "1-john",
        bookName: "1 John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "ἀπ᾿ ἀρχῆς",
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
      {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 19,
        verseNumber: 4,
        text: "ἀπ᾿ ἀρχῆς",
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
        bookSlug: "ruth",
        bookName: "Ruth",
        chapterNumber: 1,
        verseNumber: 1,
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
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "λόγου",
        greekTokens: [
          {
            surface: "λόγου",
            lemma: "λόγος",
            entryKey: "G3056",
            strongs: "G3056",
            morphology: "N-GSM",
            decodedMorphology: "noun genitive singular masculine",
            gloss: "word",
            transliteration: "logou"
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
        entry.greekTokens?.some(
          (token) =>
            (token.entryKey ?? token.strongs ?? null) === entryKey &&
            actual.normalizeGreekFormLookupValue(token.surface) === normalizedSelectedForm
        )
      );
    })
  };
});

jest.mock("@/lib/bible/strongs", () => {
  const actual = jest.requireActual("@/lib/bible/strongs");
  const normalize = (value: string) => actual.normalizeStrongsNumber(value);

  const strongsEntries = {
    G1: {
      id: "G1",
      language: "greek",
      lemma: "ἀ",
      transliteration: "a",
      definition: "alpha",
      partOfSpeech: "particle",
      rootWord: "",
      outlineUsage: ""
    },
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
    H7225: {
      id: "H7225",
      language: "hebrew",
      lemma: "רֵאשִׁית",
      transliteration: "reshith",
      definition: "beginning",
      partOfSpeech: "noun",
      rootWord: "",
      outlineUsage: "beginning, first"
    }
  } as const;

  const occurrencesByEntry = {
    G1: [],
    G3056: [
      {
        version: "kjv",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 5,
        verseNumber: 32,
        text: "word",
        tokens: [{ text: "word", strongsNumbers: ["G3056"] }]
      }
    ],
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
    greek: {
      "1-chronicles:17:9": {
        version: "greek",
        bookSlug: "1-chronicles",
        bookName: "1 Chronicles",
        chapterNumber: 17,
        verseNumber: 9,
        text: "ἀπ᾿ ἀρχῆς",
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
      "1-john:1:1": {
        version: "greek",
        bookSlug: "1-john",
        bookName: "1 John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "ἀπ᾿ ἀρχῆς",
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
      "john:1:1": {
        version: "greek",
        bookSlug: "john",
        bookName: "John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "λόγου",
        greekTokens: [
          {
            surface: "λόγου",
            lemma: "λόγος",
            entryKey: "G3056",
            strongs: "G3056",
            morphology: "N-GSM",
            decodedMorphology: "noun genitive singular masculine",
            gloss: "word",
            transliteration: "logou"
          }
        ]
      },
      "matthew:5:32": {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 5,
        verseNumber: 32,
        text: "λόγος"
      },
      "matthew:19:4": {
        version: "greek",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 19,
        verseNumber: 4,
        text: "ἀπ᾿ ἀρχῆς",
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
    },
    kjv: {
      "1-chronicles:17:9": {
        version: "kjv",
        bookSlug: "1-chronicles",
        bookName: "1 Chronicles",
        chapterNumber: 17,
        verseNumber: 9,
        text: "as at the first",
        tokens: [{ text: "first", strongsNumbers: ["G746"] }]
      },
      "1-john:1:1": {
        version: "kjv",
        bookSlug: "1-john",
        bookName: "1 John",
        chapterNumber: 1,
        verseNumber: 1,
        text: "That which was from the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["G746"] }]
      },
      "genesis:1:1": {
        version: "kjv",
        bookSlug: "genesis",
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "In the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["H7225"] }]
      },
      "matthew:5:32": {
        version: "kjv",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 5,
        verseNumber: 32,
        text: "word",
        tokens: [{ text: "word", strongsNumbers: ["G3056"] }]
      },
      "matthew:19:4": {
        version: "kjv",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 19,
        verseNumber: 4,
        text: "from the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["G746"] }]
      }
    },
    web: {
      "genesis:1:1": {
        version: "web",
        bookSlug: "genesis",
        bookName: "Genesis",
        chapterNumber: 1,
        verseNumber: 1,
        text: "In the beginning",
        tokens: [{ text: "beginning", strongsNumbers: ["H7225"] }]
      },
      "matthew:5:32": {
        version: "web",
        bookSlug: "matthew",
        bookName: "Matthew",
        chapterNumber: 5,
        verseNumber: 32,
        text: "The word remains.",
        tokens: [{ text: "word", strongsNumbers: ["G3056"] }]
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
      [...(occurrencesByEntry[normalize(entryId) as keyof typeof occurrencesByEntry] ?? [])]
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

jest.mock("@/lib/fathers/search", () => {
  const actual = jest.requireActual("@/lib/fathers/search");

  return {
    ...actual,
    findFathersSegmentsByGreekLemma: jest.fn(async (lemma: string) =>
      lemma === "λόγος"
        ? [
            {
              workSlug: "1-clement",
              workTitle: "1 Clement",
              segmentId: "1-clement:13",
              ref: "13",
              label: "13",
              greek: "ὁ λόγος",
              english: "the holy word saith",
              greekContext: "ὁ λόγος",
              englishContext: "the holy word saith"
            }
          ]
        : []
    )
  };
});

import { LookupPane } from "@/app/components/LookupPane";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { READER_CUSTOMIZATION_STORAGE_KEY } from "@/lib/reader-customization";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

function StrongsHarness() {
  const { openGreekDictionary, openStrongs } = useReaderWorkspace();

  return (
    <>
      <button onClick={() => openStrongs("G3056", "G3056")} type="button">
        Open Greek
      </button>
      <button onClick={() => openStrongs("G1", "G1")} type="button">
        Open Greek Empty
      </button>
      <button onClick={() => openStrongs("H7225", "H7225")} type="button">
        Open Hebrew
      </button>
      <button
        onClick={() =>
          openGreekDictionary({
            entryKey: "G3056",
            strongs: "G3056",
            lemma: "λόγος",
            label: "λόγος",
            selectedForm: "λόγου",
            selectedFormMorphology: "N-GSM",
            selectedFormDecodedMorphology: "noun genitive singular masculine",
            matchedQuery: "λόγου"
          })
        }
        type="button"
      >
        Open Greek Dictionary Masculine
      </button>
      <button
        onClick={() =>
          openGreekDictionary({
            entryKey: "G746",
            strongs: "G746",
            lemma: "ἀρχή",
            label: "ἀρχή",
            selectedForm: "ἀρχῆς",
            selectedFormMorphology: "N-GSF",
            matchedQuery: "ἀρχῆς"
          })
        }
        type="button"
      >
        Open Greek Dictionary
      </button>
      <button
        onClick={() =>
          openGreekDictionary({
            entryKey: "G1096",
            strongs: "G1096",
            lemma: "γίνομαι",
            label: "γίνομαι",
            selectedForm: "ἐγένετο",
            selectedFormMorphology: "V-2ADI-3S",
            selectedFormDecodedMorphology: "verb aorist middle indicative third person singular",
            matchedQuery: "ἐγένετο"
          })
        }
        type="button"
      >
        Open Greek Dictionary Verb
      </button>
      <LookupPane />
    </>
  );
}

describe("ReaderStrongsPanel", () => {
  beforeEach(() => {
    setMockPathname("/read/genesis/1");
    window.localStorage.clear();
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

  it("applies the dedicated Strong's verse text size setting to the study pane", async () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        strongsVerseTextSize: 1.44
      })
    );

    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    await within(studyPane).findByRole("heading", { name: "G3056" });

    expect(studyPane).toHaveStyle("--reader-strongs-verse-text-size: 1.44rem");
  });

  it("applies the dedicated Thayer text size setting to the Thayer section", async () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        thayerTextSize: 1.26
      })
    );

    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Thayer" }));

    expect(await within(studyPane).findByText("Root Word")).toBeInTheDocument();

    expect(studyPane).toHaveStyle("--reader-thayer-text-size: 1.26rem");
  });

  it("renders tabbed Greek Strongs study sections", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("tab", { name: "Verses In Bible" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Thayer" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "BDAG" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Outside Bible" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("heading", { name: "G3056" })).toBeInTheDocument();
    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "Greek" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    await waitFor(() =>
      expect(studyPane.querySelector(".verse-text-greek .strongs-inline-match")).not.toBeNull()
    );
    expect(studyPane.querySelectorAll(".strongs-entry-bible-verse-text").length).toBeGreaterThan(0);
    fireEvent.click(within(studyPane).getByRole("button", { name: "WEB" }));
    expect(within(studyPane).getByRole("button", { name: "WEB" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(studyPane).getByRole("button", { name: "Greek" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const matthewOccurrence = await within(studyPane).findByText(/Matthew 5:32/);
    const occurrenceCard = matthewOccurrence.closest(".strongs-entry-bible-verse");
    expect(occurrenceCard).not.toBeNull();
    expect(within(studyPane).queryByRole("button", { name: "Show all versions" })).toBeNull();
    expect((occurrenceCard as HTMLElement).textContent).toMatch(/Matthew 5:32/i);
    expect(within(occurrenceCard as HTMLElement).getByText("WEB")).toBeInTheDocument();
    expect(within(occurrenceCard as HTMLElement).getByText("Greek")).toBeInTheDocument();
    const webRow = within(occurrenceCard as HTMLElement)
      .getByText("WEB")
      .closest(".strongs-entry-bible-version-row");
    expect(webRow).not.toBeNull();
    expect((webRow as HTMLElement).querySelector(".strongs-inline-match")).not.toBeNull();

    fireEvent.click(within(studyPane).getByRole("button", { name: "KJV" }));

    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "KJV" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(within(occurrenceCard as HTMLElement).getByText("KJV")).toBeInTheDocument();
    expect(within(occurrenceCard as HTMLElement).getByText("Greek")).toBeInTheDocument();
    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse .strongs-token-lemma").length).toBeGreaterThan(0)
    );
    const greekRow = within(occurrenceCard as HTMLElement)
      .getByText("Greek")
      .closest(".strongs-entry-bible-version-row");
    expect(greekRow).not.toBeNull();
    expect((greekRow as HTMLElement).querySelector(".strongs-token-match, .strongs-inline-match")).not.toBeNull();

    fireEvent.click(within(studyPane).getByRole("button", { name: "WEB" }));

    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "WEB" })).toHaveAttribute(
        "aria-pressed",
        "false"
      )
    );

    fireEvent.click(within(studyPane).getByRole("tab", { name: "BDAG" }));

    expect(await within(studyPane).findByText("Plain Meaning")).toBeInTheDocument();
    expect(within(studyPane).getByText("Common Use")).toBeInTheDocument();
    expect(within(studyPane).getByText("New Testament Use")).toBeInTheDocument();
    expect(within(studyPane).getByText("Key Terms")).toBeInTheDocument();
    expect(within(studyPane).getByText("Full BDAG")).toBeInTheDocument();
  }, 30000);

  it("renders Bible search inside the Strong's panel", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Search" }));

    const searchInput = within(studyPane).getByLabelText(/Search from the Strong's panel/i);
    fireEvent.change(searchInput, { target: { value: "faith" } });

    expect(searchInput).toHaveValue("faith");
    expect((await within(studyPane).findAllByText("Titus 1:1")).length).toBeGreaterThan(0);

    fireEvent.click(within(studyPane).getByRole("tab", { name: "Word Study" }));
    expect(await within(studyPane).findByRole("tab", { name: "Verses In Bible" })).toBeInTheDocument();
  });

  it("renders a separate Thayer tab for Greek Strongs entries", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Thayer" }));

    expect(within(studyPane).getByRole("tab", { name: "Thayer" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(studyPane).getByText("Root Word")).toBeInTheDocument();
    expect(within(studyPane).getByText("Closest Definition to the Origin")).toBeInTheDocument();
    expect(within(studyPane).getByText("Core Meanings")).toBeInTheDocument();
    expect(within(studyPane).getByText("Extended Meanings")).toBeInTheDocument();
    expect(within(studyPane).getByText("Full Thayer")).toBeInTheDocument();
    expect(within(studyPane).getByText(/G3004 · λέγω/i)).toBeInTheDocument();
    expect(within(studyPane).getAllByText(/say, speak, call, tell, misc/i).length).toBeGreaterThan(0);
    expect(within(studyPane).getByText("of speech")).toBeInTheDocument();
    expect(within(studyPane).getByText("a word")).toBeInTheDocument();
    expect(within(studyPane).queryByText("Plain Meaning")).not.toBeInTheDocument();
  });

  it("does not render a BDAG section for Hebrew Strongs entries", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Hebrew" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "H7225" })).toBeInTheDocument();
    expect(await within(studyPane).findByRole("tab", { name: "Verses In Bible" })).toBeInTheDocument();
    expect(within(studyPane).queryByRole("button", { name: "Greek" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "KJV" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    const occurrenceCard = (await within(studyPane).findByText(/Genesis 1:1/)).closest(
      ".strongs-entry-bible-verse"
    );
    expect(occurrenceCard).not.toBeNull();
    fireEvent.click(within(studyPane).getByRole("button", { name: "WEB" }));
    const webRow = within(occurrenceCard as HTMLElement)
      .getByText("WEB")
      .closest(".strongs-entry-bible-version-row");
    expect(webRow).not.toBeNull();
    expect(studyPane.querySelector(".strongs-entry-bible-verse-text-greek-companion")).toBeNull();
    expect(within(studyPane).queryByRole("tab", { name: "Thayer" })).not.toBeInTheDocument();
    expect(within(studyPane).queryByRole("tab", { name: "BDAG" })).not.toBeInTheDocument();
    expect(within(studyPane).queryByRole("tab", { name: "Outside Bible" })).not.toBeInTheDocument();
  });

  it("renders Apostolic Fathers matches inline for Greek lemmas", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Outside Bible" }));

    expect(await within(studyPane).findByText("Verses Found Outside Bible")).toBeInTheDocument();
    expect(await within(studyPane).findByRole("heading", { name: "1 Clement" })).toBeInTheDocument();
    expect(within(studyPane).getByText("13")).toBeInTheDocument();
    const highlightedLemma = within(studyPane)
      .getAllByText("λόγος")
      .find((node) => node.tagName === "MARK");
    expect(highlightedLemma?.tagName).toBe("MARK");
    expect(within(studyPane).getAllByText(/the holy word saith/i).length).toBeGreaterThan(0);
  });

  it("renders an empty state when no Apostolic Fathers matches exist", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Empty" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Outside Bible" }));

    expect(
      await within(studyPane).findByText("No Apostolic Fathers matches found for this lemma.")
    ).toBeInTheDocument();
  });

  it("renders a lemma-centered Greek dictionary card without the selected-form summary", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(within(studyPane).getByText("Greek Dictionary")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Transliteration: archē")).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();
    expect(within(studyPane).queryByText("Inflected Forms")).not.toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Thayer" })).toBeInTheDocument();

    const oldTestamentButton = await within(studyPane).findByRole(
      "button",
      {
        name: "Old Testament"
      },
      {
        timeout: 5000
      }
    );

    fireEvent.click(oldTestamentButton);

    await waitFor(() =>
      expect(oldTestamentButton).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(
      await within(studyPane).findByText("1 Chronicles 17:9", undefined, {
        timeout: 5000
      })
    ).toBeInTheDocument();
    expect(within(studyPane).queryByText("Genesis 1:1")).not.toBeInTheDocument();

    const newTestamentButton = within(studyPane).getByRole("button", {
      name: "New Testament"
    });

    fireEvent.click(newTestamentButton);

    await waitFor(() =>
      expect(newTestamentButton).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );

    fireEvent.click(within(studyPane).getByRole("button", { name: "KJV" }));

    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "KJV" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    const occurrenceCard = (
      await within(studyPane).findByText("1 John 1:1", undefined, {
        timeout: 5000
      })
    ).closest(".strongs-entry-bible-verse");
    expect(occurrenceCard).not.toBeNull();
    expect(within(occurrenceCard as HTMLElement).getByText("KJV")).toBeInTheDocument();
    expect(within(occurrenceCard as HTMLElement).getByText("Greek")).toBeInTheDocument();
    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse .strongs-token-lemma").length).toBeGreaterThan(0)
    );
  });

  it("renders the Thayer tab from the Greek dictionary flow", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Masculine" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(await within(studyPane).findByRole("tab", { name: "Thayer" }));

    expect(within(studyPane).getByRole("tab", { name: "Thayer" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(within(studyPane).getByText(/of speech, a word/i)).toBeInTheDocument();
  });

  it("opens the Charts tab from a noun dictionary entry and renders the 2nd declension chart", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Masculine" }));

    const studyPane = screen.getByLabelText("Study pane");
    const chartButton = await within(studyPane).findByRole("button", {
      name: "Open charts"
    });

    fireEvent.click(chartButton);

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
    expect(within(studyPane).getByRole("tab", { name: "Articles" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Verbs" })).toBeInTheDocument();
    expect(within(studyPane).getByText("Gender: Masculine")).toBeInTheDocument();
    expect(within(studyPane).getByText("Gender: Neuter")).toBeInTheDocument();
    const chartTable = within(studyPane).getByRole("table", {
      name: "Masculine 2nd Declension Noun Chart"
    });
    expect(chartTable).toBeInTheDocument();
    expect(within(chartTable).getByText("Vocative")).toBeInTheDocument();
    expect(chartTable.querySelector("tr.is-active-row")).not.toBeNull();
    expect(chartTable.querySelector("td.is-active-cell")).not.toBeNull();
    expect(within(studyPane).getByRole("table", { name: "Neuter 2nd Declension Noun Chart" })).toBeInTheDocument();
  });

  it("renders charts when the Charts tab is opened directly from an active Greek dictionary selection", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Masculine" }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("button", { name: "Open charts" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("tab", { name: "Charts" }));

    expect(
      await within(studyPane).findByRole("heading", { name: "Greek Charts" })
    ).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Nouns" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("still shows the noun chart tab for nouns outside the current 2nd declension family", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(
      await within(studyPane).findByRole("button", { name: "Open charts" })
    );

    expect(await within(studyPane).findByRole("heading", { name: "Greek Charts" })).toBeInTheDocument();
    expect(
      within(studyPane).getByRole("table", { name: "Masculine 2nd Declension Noun Chart" })
    ).toBeInTheDocument();
  });

  it("defaults to the verb charts for verb Greek dictionary selections", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Verb" }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("button", { name: "Open charts" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("Selected Form")).not.toBeInTheDocument();
    fireEvent.click(await within(studyPane).findByRole("button", { name: "Open charts" }));
    expect(await within(studyPane).findByRole("heading", { name: "Greek Charts" })).toBeInTheDocument();
    expect(within(studyPane).getByRole("tab", { name: "Verbs" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      within(studyPane).getByRole("table", { name: "Aorist Middle Indicative Verb Chart" })
    ).toBeInTheDocument();
    fireEvent.click(within(studyPane).getByRole("tab", { name: "Articles" }));
    expect(
      within(studyPane).getByRole("table", { name: "Masculine Definite Articles Chart" })
    ).toBeInTheDocument();
  }, 15000);

  it("filters Strong's Bible occurrences by testament and book inside the study pane", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(
      await within(studyPane).findByText("1 Chronicles 17:9", undefined, {
        timeout: 15000
      })
    ).toBeInTheDocument();
    expect(within(studyPane).queryByText("Genesis 1:1")).not.toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("button", { name: "New Testament" }));

    await waitFor(() =>
      expect(within(studyPane).queryByText("1 Chronicles 17:9")).not.toBeInTheDocument()
    );
    expect(await within(studyPane).findByText("Matthew 19:4")).toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("button", { name: /NT Matthew/i }));

    await waitFor(() =>
      expect(within(studyPane).queryByText("Matthew 19:4")).not.toBeInTheDocument()
    );
    expect(within(studyPane).getByRole("button", { name: /NT Matthew/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  }, 15000);

  it("does not render Greek learning inside the study pane", () => {
    renderWithReaderCustomization(<StrongsHarness />);

    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
    expect(screen.queryByText("Which meaning matches this word?")).not.toBeInTheDocument();
  });
});
