import { BIBLE_GREEK_UNDERTEXT_STORAGE_KEY } from "@/app/components/BibleGreekUndertextProvider";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { GREEK_GLOSS_DEFAULTS_STORAGE_KEY } from "@/app/components/GreekGlossOverridesProvider";
import { VerseList } from "@/app/components/VerseList";
import { VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY } from "@/app/components/VerseTranslationOverridesProvider";
import { READER_VERSION_STORAGE_KEY } from "@/lib/bible/constants";
import type { EsvInterlinearDisplayVerse, Verse } from "@/lib/bible/types";
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

  it("renders a custom translation editor under each verse", () => {
    const { container } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    expect(
      screen.getByLabelText("Custom translation for genesis 1:1")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Custom translation for genesis 1:2")
    ).toBeInTheDocument();
  });

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
    expect(screen.queryByLabelText("Custom translation for john 1:1")).not.toBeInTheDocument();
    expect(await screen.findByText("ἀρχῆς")).toBeInTheDocument();
    expect(screen.queryByText("ἀρχή")).not.toBeInTheDocument();
    expect(screen.queryByText("archēs")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Choose English gloss for ἀρχῆς" })
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

    expect(
      await screen.findByRole("button", { name: "Choose English gloss for ἀρχῆς" })
    ).toBeInTheDocument();
    expect(screen.getByText("ἀρχῆς")).toBeInTheDocument();
    expect(screen.getAllByText("ἀρχή").length).toBeGreaterThan(0);
    expect(await screen.findByText("archēs")).toBeInTheDocument();
    expect(screen.getAllByText("beginning").length).toBeGreaterThan(0);
    expect(
      screen.queryByRole("button", {
        name: "Explain morphology for ἀρχῆς: Noun · Genitive Singular Feminine"
      })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(await within(studyPane).findByText("Selected Form")).toBeInTheDocument();
    expect(
      await within(studyPane).findByText(/noun genitive singular feminine \(N-GSF\)/i)
    ).toBeInTheDocument();
    expect(within(studyPane).getByText("Genitive")).toBeInTheDocument();
    expect(within(studyPane).getByText("Example: λογου = of the word")).toBeInTheDocument();
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
    expect(
      await screen.findByRole("button", { name: "Choose English gloss for ἀρχῇ" })
    ).toBeInTheDocument();
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

  it("opens a gloss picker from the English line and updates only that occurrence", async () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(
      await screen.findByRole("button", { name: "Choose English gloss for ἀρχῆς" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" }));

    expect(await screen.findByRole("dialog", { name: "English gloss choices for ἀρχῆς" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "origin" }));

    const glossButtons = screen.getAllByRole("button", { name: /Choose English gloss for ἀρχ/i });
    expect(glossButtons[0]).toHaveTextContent("origin");
    expect(screen.getByRole("button", { name: "Choose English gloss for ἐγένετο" })).toHaveTextContent(
      "became"
    );
  });

  it("shows a single-word default gloss until a different gloss is selected", async () => {
    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(
      await screen.findByRole("button", { name: "Choose English gloss for ἀρχῆς" })
    ).toHaveTextContent("beginning");
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
    expect(await within(studyPane).findByText("Noun")).toBeInTheDocument();
    expect(within(studyPane).getByText("Genitive")).toBeInTheDocument();
    expect(within(studyPane).getByText("Example: λογου = of the word")).toBeInTheDocument();
    expect(within(studyPane).getByText(/noun genitive singular feminine \(N-GSF\)/i)).toBeInTheDocument();
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
    expect(
      within(studyPane).getByText("This noun does not use the current 2nd declension chart.")
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
    expect(await within(studyPane).findByText("Aorist")).toBeInTheDocument();
    expect(within(studyPane).getByText("Middle")).toBeInTheDocument();
    expect(within(studyPane).getByText("Indicative")).toBeInTheDocument();
    expect(within(studyPane).getByText("Example: ειπεν = he said")).toBeInTheDocument();
    expect(within(studyPane).getByText("Example: λυεται = he loosens for himself")).toBeInTheDocument();
    expect(within(studyPane).getAllByText("Example: λεγει = he says").length).toBeGreaterThan(0);
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

    expect(
      await screen.findByRole("button", { name: "Choose English gloss for ἀρχῆς" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" }));
    fireEvent.click(await screen.findByRole("button", { name: "Custom…" }));
    fireEvent.change(screen.getByLabelText("Custom gloss"), {
      target: {
        value: "first cause"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Save gloss" }));

    expect(screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" })).toHaveTextContent(
      "first cause"
    );

    unmount();

    renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={interlinearVerseMap}
        verses={verses}
      />
    );

    expect(screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" })).toHaveTextContent(
      "first cause"
    );
    expect(screen.getByRole("button", { name: "Choose English gloss for ἐγένετο" })).toHaveTextContent(
      "became"
    );
  });

  it("lets a lemma default apply across occurrences while preserving one-off token changes", async () => {
    const { unmount } = renderWithReaderCustomization(
      <VerseList
        bookSlug="john"
        chapterNumber={1}
        interlinearVerseMap={repeatedLemmaInterlinearVerseMap}
        verses={verses}
      />
    );

    fireEvent.click(await screen.findByRole("button", { name: "Choose English gloss for ἀρχῆς" }));

    const picker = await screen.findByRole("dialog", { name: "English gloss choices for ἀρχῆς" });
    const originButton = within(picker).getByRole("button", { name: "origin" });
    const originRow = originButton.closest(".verse-greek-gloss-option-row") as HTMLElement;
    fireEvent.click(within(originRow).getByRole("button", { name: "Make default" }));

    expect(window.localStorage.getItem(GREEK_GLOSS_DEFAULTS_STORAGE_KEY)).toContain("origin");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" })
      ).toHaveTextContent("origin");
      expect(
        screen.getByRole("button", { name: "Choose English gloss for ἀρχῇ" })
      ).toHaveTextContent("origin");
    });

    fireEvent.click(screen.getByRole("button", { name: "Choose English gloss for ἀρχῇ" }));
    fireEvent.click(await screen.findByRole("button", { name: "beginning" }));

    expect(screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" })).toHaveTextContent(
      "origin"
    );
    expect(screen.getByRole("button", { name: "Choose English gloss for ἀρχῇ" })).toHaveTextContent(
      "beginning"
    );

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
      expect(
        screen.getByRole("button", { name: "Choose English gloss for ἀρχῆς" })
      ).toHaveTextContent("origin");
      expect(
        screen.getByRole("button", { name: "Choose English gloss for ἀρχῇ" })
      ).toHaveTextContent("beginning");
    });
  });

  it("saves and reloads a custom verse translation for the matching verse only", () => {
    const { unmount } = renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    fireEvent.change(screen.getByLabelText("Custom translation for genesis 1:1"), {
      target: {
        value: "At the first, God made the heavens and the earth."
      }
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Save translation" })[0]);

    expect(screen.getByText("Saved in this app")).toBeInTheDocument();
    expect(screen.queryByLabelText("Custom translation for genesis 1:1")).not.toBeInTheDocument();
    expect(
      screen.getByText("At the first, God made the heavens and the earth.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Custom translation for genesis 1:2")).toHaveValue("");
    expect(window.localStorage.getItem(VERSE_TRANSLATION_OVERRIDES_STORAGE_KEY)).toContain(
      "At the first, God made the heavens and the earth."
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit translation" }));
    expect(screen.getByLabelText("Custom translation for genesis 1:1")).toHaveValue(
      "At the first, God made the heavens and the earth."
    );

    unmount();

    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    expect(screen.queryByLabelText("Custom translation for genesis 1:1")).not.toBeInTheDocument();
    expect(
      screen.getByText("At the first, God made the heavens and the earth.")
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Custom translation for genesis 1:2")).toHaveValue("");
  });
});
