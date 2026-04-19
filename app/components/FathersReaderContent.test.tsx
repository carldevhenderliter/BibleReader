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
import type { FathersWorkPayload } from "@/lib/fathers/types";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";

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
      greekTokens: []
    },
    {
      id: "preaching-of-peter:section-1",
      ref: "chapter-i",
      label: "Chapter I: Doctrine of Reserve",
      greek: "",
      english:
        "Knowing, my brother, your eager desire after that which is for the advantage of us all.",
      greekNormalized: "",
      greekTokens: []
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
    expect(screen.getByText("Kefa’s Letter to Ya’akov")).toBeInTheDocument();
    expect(screen.getAllByText("Chapter I: Doctrine of Reserve").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Knowing, my brother, your eager desire after that which is for the advantage of us all."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /G1577/i })).not.toBeInTheDocument();
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
