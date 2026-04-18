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
import { setMockPathname } from "@/test/mocks/next-navigation";

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

function renderFathersReader() {
  setMockPathname("/fathers/1-clement");
  window.history.replaceState({}, "", "/fathers/1-clement");

  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <WritingAssistantProvider>
          <LookupProvider>
            <VerseTranslationOverridesProvider>
              <GreekGlossOverridesProvider>
                <ReaderCustomizationProvider>
                  <SearchCustomizationProvider>
                    <FathersReaderContent payload={payload} />
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
});
