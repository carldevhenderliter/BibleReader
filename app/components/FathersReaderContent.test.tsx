import { jest } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FathersReaderContent } from "@/app/components/FathersReaderContent";
import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";
import { tokenizeFathersEnglishText } from "@/lib/fathers/annotations";
import type { FathersWorkPayload } from "@/lib/fathers/types";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";

const buildGreekUndertextSuggestionsMock = jest.fn();
const resolveCustomGreekUndertextMock = jest.fn();
const saveFathersAnnotationFileMock = jest.fn();

jest.mock("@/lib/fathers/annotations", () => {
  const actual = jest.requireActual("@/lib/fathers/annotations");

  return {
    ...actual,
    buildGreekUndertextSuggestions: (...args: unknown[]) =>
      buildGreekUndertextSuggestionsMock(...args),
    resolveCustomGreekUndertext: (...args: unknown[]) =>
      resolveCustomGreekUndertextMock(...args)
  };
});

jest.mock("@/lib/fathers/annotation-save", () => ({
  saveFathersAnnotationFile: (...args: unknown[]) => saveFathersAnnotationFileMock(...args)
}));

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
                  <SearchCustomizationProvider>
                    <FathersReaderContent payload={currentPayload} works={works} />
                  </SearchCustomizationProvider>
                </ReaderCustomizationProvider>
              </GreekGlossOverridesProvider>
            </VerseTranslationOverridesProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

describe("FathersReaderContent", () => {
  beforeEach(() => {
    buildGreekUndertextSuggestionsMock.mockReset();
    resolveCustomGreekUndertextMock.mockReset();
    saveFathersAnnotationFileMock.mockReset();
    buildGreekUndertextSuggestionsMock.mockResolvedValue([]);
    resolveCustomGreekUndertextMock.mockResolvedValue(null);
    saveFathersAnnotationFileMock.mockResolvedValue("download");
  });

  it("renders Greek study tokens with transliteration and gloss lines", () => {
    renderFathersReader();

    expect(screen.getByText("Ἡ")).toBeInTheDocument();
    expect(screen.getByText("Ē")).toBeInTheDocument();
    expect(screen.getByText("assembly")).toBeInTheDocument();
    expect(screen.getByText("The church.")).toBeInTheDocument();
  });

  it("opens the Greek dictionary when a Fathers token is clicked", async () => {
    renderFathersReader();

    fireEvent.click(screen.getByRole("button", { name: /ἐκκλησία ἐκκλησία G1577/i }));

    await waitFor(() => {
      expect(screen.getByText("Greek dictionary")).toBeInTheDocument();
    });

    expect(screen.getByText("Transliteration: ekklēsia")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Kefa’s" }));
    fireEvent.click(screen.getByRole("button", { name: "Kefa’s" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Κηφᾶς/i }));

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
    fireEvent.click(screen.getByRole("button", { name: "Kefa’s" }));
    fireEvent.click(screen.getByRole("button", { name: "Kefa’s" }));

    await waitFor(() => {
      expect(screen.getByText("Greek undertext")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Κηφᾶς/i }));
    fireEvent.click(screen.getByRole("button", { name: "Done annotating" }));
    fireEvent.click(screen.getByRole("button", { name: /Kefa’s Κηφᾶς/i }));

    await waitFor(() => {
      expect(screen.getByText("Greek dictionary")).toBeInTheDocument();
    });

    expect(document.body.textContent).toContain("kēphas");
  });

  it("uses shared reader controls for work navigation and section selection", () => {
    const scrollIntoView = jest.fn();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = scrollIntoView;

    renderFathersReader();

    fireEvent.change(screen.getByLabelText("Work"), {
      target: {
        value: "preaching-of-peter"
      }
    });

    expect(mockRouter.push).toHaveBeenCalledWith("/fathers/preaching-of-peter");

    fireEvent.change(screen.getByLabelText("Section"), {
      target: {
        value: "1-clement:prologue"
      }
    });

    expect(scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
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
