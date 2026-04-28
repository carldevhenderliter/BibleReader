import { jest } from "@jest/globals";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FathersReaderContent } from "@/app/components/FathersReaderContent";
import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import {
  ReaderBottomBarProvider,
  useReaderBottomBar
} from "@/app/components/ReaderBottomBarProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";
import { tokenizeFathersEnglishText } from "@/lib/fathers/annotations";
import type { FathersWorkPayload } from "@/lib/fathers/types";
import {
  DEFAULT_READER_CUSTOMIZATION,
  READER_CUSTOMIZATION_STORAGE_KEY
} from "@/lib/reader-customization";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";

const buildGreekUndertextSuggestionsMock = jest.fn();
const searchGreekUndertextSuggestionsMock = jest.fn();
const searchScriptureUndertextPassagesMock = jest.fn();
const resolveCustomGreekUndertextMock = jest.fn();
const saveFathersAnnotationFileMock = jest.fn();
const getStrongsEntryMock = jest.fn();

jest.mock("@/lib/fathers/annotations", () => {
  const actual = jest.requireActual("@/lib/fathers/annotations");

  return {
    ...actual,
    buildGreekUndertextSuggestions: (...args: unknown[]) =>
      buildGreekUndertextSuggestionsMock(...args),
    searchGreekUndertextSuggestions: (...args: unknown[]) =>
      searchGreekUndertextSuggestionsMock(...args),
    searchScriptureUndertextPassages: (...args: unknown[]) =>
      searchScriptureUndertextPassagesMock(...args),
    resolveCustomGreekUndertext: (...args: unknown[]) =>
      resolveCustomGreekUndertextMock(...args)
  };
});

jest.mock("@/lib/fathers/annotation-save", () => ({
  saveFathersAnnotationFile: (...args: unknown[]) => saveFathersAnnotationFileMock(...args)
}));

jest.mock("@/lib/bible/strongs", () => {
  const actual = jest.requireActual("@/lib/bible/strongs");

  return {
    ...actual,
    getStrongsEntry: (...args: unknown[]) => getStrongsEntryMock(...args)
  };
});

const payload: FathersWorkPayload = {
  work: {
    slug: "1-clement",
    title: "1 Clement",
    shortTitle: "1 Clem.",
    author: "Clement of Rome",
    order: 1,
    corpus: "apostolic-fathers",
    sectionCount: 1,
    greekSource: "example-greek",
    englishSource: "example-english"
  },
  segments: [
    {
      id: "1-clement:prologue",
      ref: "prologue",
      label: "Prologue",
      greek: "Ἡ ἐκκλησία.",
      english: "The church.",
      greekNormalized: "η εκκλησια",
      greekTokens: ["η", "εκκλησια"],
      greekLexicalTokens: [
        {
          surface: "Ἡ",
          lemma: "ὁ",
          entryKey: "G3588",
          strongs: "G3588",
          transliteration: "Ē",
          gloss: "this"
        },
        {
          surface: "ἐκκλησία",
          lemma: "ἐκκλησία",
          entryKey: "G1577",
          strongs: "G1577",
          transliteration: "ekklēsia",
          gloss: "assembly",
          trailingPunctuation: "."
        }
      ]
    }
  ]
};

const englishOnlyPayload: FathersWorkPayload = {
  work: {
    slug: "preaching-of-peter",
    title: "The Preaching of Peter",
    shortTitle: "Preaching",
    author: "T. Flavius Clemens / Jackson H. Snyder",
    order: 15,
    corpus: "apostolic-fathers",
    sectionCount: 2,
    greekSource: "",
    englishSource: "PDF/NA1.pdf (Appendix A)"
  },
  segments: [
    {
      id: "preaching-of-peter:introduction",
      ref: "introduction",
      label: "Introduction",
      greek: "",
      english: "Kefa’s Letter to Ya’akov",
      greekNormalized: "",
      greekTokens: [],
      englishTokens: tokenizeFathersEnglishText("Kefa’s Letter to Ya’akov"),
      greekUndertextAnnotations: []
    },
    {
      id: "preaching-of-peter:section-1",
      ref: "chapter-i",
      label: "Chapter I: Doctrine of Reserve",
      greek: "",
      english:
        "Knowing, my brother, your eager desire after that which is for the advantage of us all.",
      greekNormalized: "",
      greekTokens: [],
      englishTokens: tokenizeFathersEnglishText(
        "Knowing, my brother, your eager desire after that which is for the advantage of us all."
      ),
      greekUndertextAnnotations: []
    }
  ]
};

const works = [
  {
    slug: payload.work.slug,
    title: payload.work.title,
    shortTitle: payload.work.shortTitle,
    author: payload.work.author,
    order: payload.work.order,
    corpus: payload.work.corpus,
    sectionCount: payload.work.sectionCount,
    greekSource: payload.work.greekSource,
    englishSource: payload.work.englishSource
  },
  {
    slug: englishOnlyPayload.work.slug,
    title: englishOnlyPayload.work.title,
    shortTitle: englishOnlyPayload.work.shortTitle,
    author: englishOnlyPayload.work.author,
    order: englishOnlyPayload.work.order,
    corpus: englishOnlyPayload.work.corpus,
    sectionCount: englishOnlyPayload.work.sectionCount,
    greekSource: englishOnlyPayload.work.greekSource,
    englishSource: englishOnlyPayload.work.englishSource
  }
];

function installIntersectionObserverMock() {
  const callbacksByElement = new Map<Element, IntersectionObserverCallback[]>();

  class MockIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe = (element: Element) => {
      callbacksByElement.set(element, [
        ...(callbacksByElement.get(element) ?? []),
        this.callback
      ]);
    };

    unobserve = (element: Element) => {
      callbacksByElement.delete(element);
    };

    disconnect = () => {
      callbacksByElement.clear();
    };

    takeRecords = () => [];
  }

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver
  });

  return {
    trigger(element: Element) {
      const callbacks = callbacksByElement.get(element);

      if (!callbacks?.length) {
        return;
      }

      act(() => {
        callbacks.forEach((callback) => {
          callback(
            [
              {
                isIntersecting: true,
                target: element,
                boundingClientRect: {
                  top: 0
                }
              } as IntersectionObserverEntry
            ],
            {} as IntersectionObserver
          );
        });
      });
    }
  };
}

function setCompactReaderMode() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches:
        query === "(max-width: 63.99rem)"
          ? true
          : query === "(min-width: 64rem)"
            ? false
            : false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

function renderFathersReader(currentPayload: FathersWorkPayload = payload) {
  setMockPathname(`/fathers/${currentPayload.work.slug}`);
  window.history.replaceState({}, "", `/fathers/${currentPayload.work.slug}`);
  mockRouter.push.mockClear();

  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <WritingAssistantProvider>
          <LookupProvider>
            <VerseTranslationOverridesProvider>
              <GreekGlossOverridesProvider>
                <ReaderCustomizationProvider>
                  <ReaderBottomBarProvider>
                    <SearchCustomizationProvider>
                      <FathersReaderContent payload={currentPayload} works={works} />
                      <ReaderBottomBarTestHost />
                    </SearchCustomizationProvider>
                  </ReaderBottomBarProvider>
                </ReaderCustomizationProvider>
              </GreekGlossOverridesProvider>
            </VerseTranslationOverridesProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

function ReaderBottomBarTestHost() {
  const { bottomBarPanel } = useReaderBottomBar();

  return bottomBarPanel ? <div data-testid="reader-bottom-bar-test-host">{bottomBarPanel}</div> : null;
}

describe("FathersReaderContent", () => {
  beforeEach(() => {
    window.localStorage.removeItem(READER_CUSTOMIZATION_STORAGE_KEY);
    buildGreekUndertextSuggestionsMock.mockReset();
    searchGreekUndertextSuggestionsMock.mockReset();
    searchScriptureUndertextPassagesMock.mockReset();
    resolveCustomGreekUndertextMock.mockReset();
    saveFathersAnnotationFileMock.mockReset();
    getStrongsEntryMock.mockReset();
    buildGreekUndertextSuggestionsMock.mockResolvedValue([]);
    searchGreekUndertextSuggestionsMock.mockResolvedValue([]);
    searchScriptureUndertextPassagesMock.mockResolvedValue([]);
    resolveCustomGreekUndertextMock.mockResolvedValue(null);
    saveFathersAnnotationFileMock.mockResolvedValue("download");
    getStrongsEntryMock.mockResolvedValue(null);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      writable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
  });

  it("renders Greek study tokens with transliteration and gloss lines", () => {
    renderFathersReader();

    expect(screen.getByText("Ἡ")).toBeInTheDocument();
    expect(screen.getByText("Ē")).toBeInTheDocument();
    expect(screen.getByText("assembly")).toBeInTheDocument();
    expect(screen.getByText("The church.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn Greek" })).toBeInTheDocument();
  });

  it("copies the visible Fathers reading text from the toolbar", async () => {
    renderFathersReader();

    fireEvent.click(screen.getByRole("button", { name: "Copy text" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("Prologue")
      );
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining("The church.")
    );
  });

  it("opens the Greek dictionary when a Fathers token is clicked", async () => {
    renderFathersReader();

    fireEvent.click(screen.getByRole("button", { name: /ἐκκλησία ἐκκλησία G1577/i }));

    await waitFor(() => {
      expect(screen.getByText("Greek dictionary")).toBeInTheDocument();
    });

    expect(screen.getByText("Transliteration: ekklēsia")).toBeInTheDocument();
  });

  it("opens a Greek sentence quiz when Learn Greek is enabled for Fathers text", async () => {
    renderFathersReader();

    fireEvent.click(screen.getByRole("button", { name: "Learn Greek" }));
    fireEvent.click(screen.getByRole("button", { name: /ἐκκλησία ἐκκλησία G1577/i }));

    expect(await screen.findByLabelText("Type meaning for ἐκκλησία")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check sentence" })).toBeInTheDocument();
    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
    expect(screen.queryByText("Which meaning matches this word?")).not.toBeInTheDocument();
  });

  it("renders English-only Fathers works without Greek token stacks", () => {
    renderFathersReader(englishOnlyPayload);

    expect(screen.getByText("Fathers Reader")).toBeInTheDocument();
    expect(screen.queryByText("Apostolic Fathers")).not.toBeInTheDocument();
    expect(screen.getByText("Kefa’s")).toBeInTheDocument();
    expect(screen.getByText("Ya’akov")).toBeInTheDocument();
    expect(screen.getAllByText("Chapter I: Doctrine of Reserve").length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain(
      "Knowing, my brother, your eager desire after that which is for the advantage of us all."
    );
    expect(screen.queryByRole("button", { name: /G1577/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annotate Greek" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Learn Greek" })).not.toBeInTheDocument();
  });

  it("can hide saved Greek undertext in Fathers reading without removing the English text", async () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_READER_CUSTOMIZATION,
        showAnnotatedGreekUndertext: false
      })
    );

    const annotatedPayload: FathersWorkPayload = {
      ...englishOnlyPayload,
      segments: [
        {
          ...englishOnlyPayload.segments[0]!,
          greekUndertextAnnotations: [
            {
              segmentId: "preaching-of-peter:introduction",
              startToken: 0,
              endToken: 0,
              greekText: "Κηφᾶς",
              entryKey: "G2786",
              lemma: "Κηφᾶς",
              strongs: "G2786",
              transliteration: "Kēphas",
              gloss: "Cephas",
              source: "lexicon"
            }
          ]
        },
        englishOnlyPayload.segments[1]!
      ]
    };

    renderFathersReader(annotatedPayload);

    expect(await screen.findByText("Kefa’s")).toBeInTheDocument();
    expect(screen.queryByText("Κηφᾶς")).not.toBeInTheDocument();
  });

  it("can place each Fathers sentence on its own line", async () => {
    const sentencePayload: FathersWorkPayload = {
      ...englishOnlyPayload,
      segments: [
        {
          id: "preaching-of-peter:sentences",
          ref: "sentences",
          label: "Sentences",
          greek: "",
          english: "First sentence. Second sentence? Third sentence!",
          greekNormalized: "",
          greekTokens: [],
          englishTokens: tokenizeFathersEnglishText("First sentence. Second sentence? Third sentence!"),
          greekUndertextAnnotations: []
        }
      ]
    };

    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_READER_CUSTOMIZATION,
        showFathersSentenceLines: true
      })
    );

    renderFathersReader(sentencePayload);

    await waitFor(() => {
      expect(document.querySelectorAll(".fathers-sentence-line")).toHaveLength(3);
    });

    expect(document.body.textContent).toContain("First sentence.");
    expect(document.body.textContent).toContain("Second sentence?");
    expect(document.body.textContent).toContain("Third sentence!");
  });

  it("honors Fathers visibility settings for Greek and English layers", async () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_READER_CUSTOMIZATION,
        showVerseText: false,
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false
      })
    );

    renderFathersReader();

    await waitFor(() => {
      expect(screen.queryByText("The church.")).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Ἡ")).not.toBeInTheDocument();
    expect(screen.queryByText("Ē")).not.toBeInTheDocument();
    expect(screen.queryByText("assembly")).not.toBeInTheDocument();
    expect(screen.getAllByText("Prologue").length).toBeGreaterThan(0);
  });

  it("can hide Fathers section references while keeping the heading above the text", async () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_READER_CUSTOMIZATION,
        showVerseNumbers: false
      })
    );

    const { container } = renderFathersReader();

    await waitFor(() => {
      expect(container.querySelector(".fathers-segment-label")).not.toBeNull();
      expect(container.querySelector(".fathers-segment-ref")).toBeNull();
    });

    expect(screen.getByLabelText("Section")).toBeInTheDocument();
    expect(screen.getByText("The church.")).toBeInTheDocument();
  });

  it("shows only the bottom Fathers navigation selectors on compact layouts", () => {
    setCompactReaderMode();

    renderFathersReader();

    expect(screen.queryByLabelText("Work")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Section")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Bottom Work")).toBeInTheDocument();
    expect(screen.getByLabelText("Bottom Section")).toBeInTheDocument();
  });

  it("adds NA1 Greek undertext annotations and saves them through the local save flow", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole("button", { name: /Κηφᾶς/i }));

    expect(screen.getByText("Κηφᾶς")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Greek" }));

    await waitFor(() => {
      expect(saveFathersAnnotationFileMock).toHaveBeenCalledWith(
        expect.objectContaining({
          workSlug: "preaching-of-peter",
          annotations: expect.objectContaining({
            "preaching-of-peter:introduction": [
              expect.objectContaining({
                greekText: "Κηφᾶς",
                startToken: 0,
                endToken: 0
              })
            ]
          })
        })
      );
    });
  });

  it("opens the Greek dictionary from a saved NA1 undertext line", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole("button", { name: /Κηφᾶς/i }));
    fireEvent.click(screen.getByRole("button", { name: "Done annotating" }));
    fireEvent.click(screen.getByRole("button", { name: /Kefa’s Κηφᾶς/i }));

    await waitFor(() => {
      expect(screen.getByText("Greek dictionary")).toBeInTheDocument();
    });

    expect(document.body.textContent).toContain("kēphas");
  });

  it("lets the first annotation start on any word in the segment", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      },
      {
        greekText: "ἐπιστολή",
        entryKey: "G1992",
        lemma: "ἐπιστολή",
        strongs: "G1992",
        transliteration: "epistolē",
        gloss: "letter"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    expect(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Greek undertext for Letter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Greek undertext for to" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Greek undertext for Ya’akov" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Letter" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Letter", { selector: ".fathers-annotation-editor-meta" })
    ).toBeInTheDocument();
  });

  it("opens the annotation popup under the clicked word and supports Greek keyboard entry", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: "Greek undertext editor" })
      ).toBeInTheDocument();
    });

    const popupLayout = document.querySelector(".fathers-annotation-popup-layout");
    expect(popupLayout?.querySelector(".fathers-annotation-suggestions")).not.toBeNull();
    expect(popupLayout?.querySelector(".fathers-annotation-custom")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "Auto" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "false");

    const customGreekInput = screen.getByLabelText("Custom Greek") as HTMLInputElement;
    fireEvent.click(screen.getByRole("button", { name: "Insert α" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert β" }));

    expect(customGreekInput.value).toBe("αβ");

    fireEvent.click(await screen.findByRole("button", { name: /Κηφᾶς/i }));

    expect(screen.getByRole("dialog", { name: "Greek undertext editor" })).toBeInTheDocument();
    expect((screen.getByLabelText("Custom Greek") as HTMLInputElement).value).toBe("Κηφᾶς");

    fireEvent.click(screen.getByRole("button", { name: "Delete Greek character" }));

    expect((screen.getByLabelText("Custom Greek") as HTMLInputElement).value).toBe("Κηφᾶ");
  });

  it("keeps the popup open until the Close button is clicked", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    const dialog = await screen.findByRole("dialog", { name: "Greek undertext editor" });

    const backdrop = document.querySelector(".fathers-annotation-popup-backdrop");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop as Element);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent(window, new Event("resize"));
    fireEvent.scroll(window);

    expect(dialog).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /Κηφᾶς/i }));
    expect(screen.getByRole("dialog", { name: "Greek undertext editor" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Greek undertext editor" })
      ).not.toBeInTheDocument();
    });
  });

  it("searches the Greek dictionary from the popup as the user types in English", async () => {
    searchGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "ἀρχή",
        entryKey: "G746",
        lemma: "ἀρχή",
        strongs: "G746",
        transliteration: "arche",
        gloss: "beginning"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await screen.findByRole("dialog", { name: "Greek undertext editor" });

    fireEvent.click(screen.getByRole("tab", { name: "Search" }));

    expect(screen.getByRole("tab", { name: "Search" })).toHaveAttribute("aria-selected", "true");

    fireEvent.change(screen.getByLabelText("English search"), {
      target: { value: "beginning" }
    });

    await waitFor(() => {
      expect(searchGreekUndertextSuggestionsMock).toHaveBeenCalledWith("beginning");
    });

    fireEvent.click(await screen.findByRole("button", { name: /ἀρχή/i }));

    expect(screen.getByRole("dialog", { name: "Greek undertext editor" })).toBeInTheDocument();
    expect((screen.getByLabelText("Custom Greek") as HTMLInputElement).value).toBe("ἀρχή");
  });

  it("shows scripture lookup results with Greek words under each verse", async () => {
    searchScriptureUndertextPassagesMock.mockResolvedValue([
      {
        id: "verse:john:1:1:kjv",
        bookSlug: "john",
        chapterNumber: 1,
        verseNumber: 1,
        label: "John 1:1",
        description: "KJV New Testament lookup",
        preview: "In the beginning was the Word.",
        tokens: [
          {
            text: "In",
            strongsNumbers: ["G1722"]
          },
          {
            text: " the beginning",
            strongsNumbers: ["G746"]
          }
        ]
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await screen.findByRole("dialog", { name: "Greek undertext editor" });

    fireEvent.click(screen.getByRole("tab", { name: "Scripture" }));
    fireEvent.change(screen.getByLabelText("Testament"), {
      target: { value: "new-testament" }
    });
    fireEvent.change(screen.getByLabelText("Scripture lookup"), {
      target: { value: "beginning" }
    });

    await waitFor(() => {
      expect(searchScriptureUndertextPassagesMock).toHaveBeenCalledWith("beginning", "new-testament");
    });

    expect(screen.getByText("John 1:1")).toBeInTheDocument();
    expect(screen.getByText("In the beginning was the Word.")).toBeInTheDocument();
    expect(screen.getByText("In")).toBeInTheDocument();
    expect(screen.getByText("the beginning")).toBeInTheDocument();
    expect(screen.getByText("G1722")).toBeInTheDocument();
    expect(screen.getByText("G746")).toBeInTheDocument();
  });

  it("opens a Strong’s definition tab from scripture lookup chips", async () => {
    searchScriptureUndertextPassagesMock.mockResolvedValue([
      {
        id: "verse:john:1:1:kjv",
        bookSlug: "john",
        chapterNumber: 1,
        verseNumber: 1,
        label: "John 1:1",
        description: "KJV New Testament lookup",
        preview: "In the beginning was the Word.",
        tokens: [
          {
            text: " the Word",
            strongsNumbers: ["G3056"]
          }
        ]
      }
    ]);
    getStrongsEntryMock.mockResolvedValue({
      id: "G3056",
      language: "greek",
      lemma: "λόγος",
      transliteration: "logos",
      definition: "word, speech, account",
      partOfSpeech: "noun",
      rootWord: "G3004",
      outlineUsage: "word"
    });

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" }));

    await screen.findByRole("dialog", { name: "Greek undertext editor" });

    fireEvent.click(screen.getByRole("tab", { name: "Scripture" }));
    fireEvent.change(screen.getByLabelText("Testament"), {
      target: { value: "new-testament" }
    });
    fireEvent.change(screen.getByLabelText("Scripture lookup"), {
      target: { value: "word" }
    });

    await screen.findByRole("button", { name: "Show G3056 definition for the Word" });

    fireEvent.click(screen.getByRole("button", { name: "Show G3056 definition for the Word" }));

    await waitFor(() => {
      expect(getStrongsEntryMock).toHaveBeenCalledWith("G3056");
    });

    expect(screen.getByRole("tab", { name: "Definition" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("λόγος")).toBeInTheDocument();
    expect(screen.getByText("Word clicked: the Word")).toBeInTheDocument();
    expect(screen.getByText("Transliteration: logos")).toBeInTheDocument();
    expect(screen.getByText("word, speech, account")).toBeInTheDocument();
  });

  it("keeps distant words addable after the first annotation", async () => {
    buildGreekUndertextSuggestionsMock.mockResolvedValue([
      {
        greekText: "Κηφᾶς",
        entryKey: "G2786",
        lemma: "Κηφᾶς",
        strongs: "G2786",
        transliteration: "Kēphas",
        gloss: "Cephas"
      },
      {
        greekText: "ἐπιστολή",
        entryKey: "G1992",
        lemma: "ἐπιστολή",
        strongs: "G1992",
        transliteration: "epistolē",
        gloss: "letter"
      }
    ]);

    renderFathersReader(englishOnlyPayload);

    fireEvent.click(screen.getByRole("button", { name: "Annotate Greek" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Greek undertext for Letter" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });

    fireEvent.click(await screen.findByRole("button", { name: /Κηφᾶς/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Greek undertext for Kefa’s" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add Greek undertext for to" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add Greek undertext for Ya’akov" })).toBeInTheDocument();
    });
  });

  it("lazy loads distant Fathers sections before rendering their content", async () => {
    const intersectionObserver = installIntersectionObserverMock();
    const largePayload: FathersWorkPayload = {
      ...englishOnlyPayload,
      work: {
        ...englishOnlyPayload.work,
        sectionCount: 10
      },
      segments: Array.from({ length: 10 }, (_, index) => ({
        id: `preaching-of-peter:section-${index + 1}`,
        ref: `section-${index + 1}`,
        label: `Section ${index + 1}`,
        greek: "",
        english: `Large work section ${index + 1}.`,
        greekNormalized: "",
        greekTokens: [],
        englishTokens: tokenizeFathersEnglishText(`Large work section ${index + 1}.`),
        greekUndertextAnnotations: []
      }))
    };

    renderFathersReader(largePayload);

    expect(document.body.textContent).toContain("Large work section 1.");
    expect(screen.queryByText("Large work section 10.")).not.toBeInTheDocument();

    const distantSection = document.getElementById("preaching-of-peter:section-10");
    expect(distantSection).not.toBeNull();

    intersectionObserver.trigger(distantSection as Element);

    await waitFor(() => {
      expect(document.body.textContent).toContain("Large work section 10.");
    });
  });

  it("can disable lazy loading and render the full Fathers work immediately", () => {
    const largePayload: FathersWorkPayload = {
      ...englishOnlyPayload,
      work: {
        ...englishOnlyPayload.work,
        sectionCount: 10
      },
      segments: Array.from({ length: 10 }, (_, index) => ({
        id: `preaching-of-peter:section-${index + 1}`,
        ref: `section-${index + 1}`,
        label: `Section ${index + 1}`,
        greek: "",
        english: `Large work section ${index + 1}.`,
        greekNormalized: "",
        greekTokens: [],
        englishTokens: tokenizeFathersEnglishText(`Large work section ${index + 1}.`),
        greekUndertextAnnotations: []
      }))
    };

    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        disableLazyLoading: true
      })
    );

    renderFathersReader(largePayload);

    expect(document.body.textContent).toContain("Large work section 10.");
  });

  it("uses shared reader controls for work navigation and section selection", () => {
    const scrollIntoView = jest.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    renderFathersReader();

    fireEvent.change(screen.queryByLabelText("Work") ?? screen.getByLabelText("Bottom Work"), {
      target: {
        value: "preaching-of-peter"
      }
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/fathers/preaching-of-peter");

    fireEvent.change(
      screen.queryByLabelText("Section") ?? screen.getByLabelText("Bottom Section"),
      {
        target: {
          value: "1-clement:prologue"
        }
      }
    );

    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/fathers");

    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("opens a Fathers-compatible settings panel without Bible-only controls", () => {
    renderFathersReader();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByRole("dialog", { name: "Reader controls and settings" })).toBeVisible();
    expect(screen.queryByLabelText("Version")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show Strongs/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show Greek interlinear/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Greek lemma/i })).toBeInTheDocument();
  });
});
