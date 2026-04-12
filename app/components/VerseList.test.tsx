import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { VerseList } from "@/app/components/VerseList";
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
        gloss: "beginning"
      }
    ]
  },
  2: {
    number: 2,
    baseGreek: "ἀρχή",
    greek: "ἀρχή",
    tokens: [
      {
        surface: "ἀρχή",
        lemma: "ἀρχή",
        strongs: "G746",
        morphology: "N-NSF",
        decodedMorphology: "noun nominative singular feminine",
        gloss: "beginning"
      }
    ]
  }
};

describe("VerseList", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/genesis/1");
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
    renderWithReaderCustomization(
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
    renderWithReaderCustomization(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs
        verses={verses}
      />
    );

    expect(await screen.findByText("רֵאשִׁית")).toBeInTheDocument();
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
    expect(screen.getAllByText("beginning").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /ἀρχῆς ἀρχή G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(await within(studyPane).findByText("Selected Form")).toBeInTheDocument();
    expect(
      await within(studyPane).findByText(/noun genitive singular feminine \(N-GSF\)/i)
    ).toBeInTheDocument();
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
    expect(glossButtons[1]).toHaveTextContent("beginning");
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
    expect(screen.getByRole("button", { name: "Choose English gloss for ἀρχή" })).toHaveTextContent(
      "beginning"
    );
  });
});
