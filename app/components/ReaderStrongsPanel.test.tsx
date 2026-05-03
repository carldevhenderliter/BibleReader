import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
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

  it("renders tabbed Greek Strongs study sections", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("tab", { name: "Verses In Bible" })).toBeInTheDocument();
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
    const matthewOccurrence = await within(studyPane).findByText(/Matthew 5:32/);
    const occurrenceCard = matthewOccurrence.closest(".strongs-entry-bible-verse");
    expect(occurrenceCard).not.toBeNull();
    expect(within(studyPane).queryByRole("button", { name: "Show all versions" })).toBeNull();
    expect((occurrenceCard as HTMLElement).textContent).toMatch(/Matthew 5:32/i);

    fireEvent.click(within(studyPane).getByRole("button", { name: "KJV" }));

    await waitFor(() =>
      expect(within(studyPane).getByRole("button", { name: "KJV" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse-text-greek-companion").length).toBeGreaterThan(0)
    );
    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse .strongs-token-lemma").length).toBeGreaterThan(0)
    );

    fireEvent.click(within(studyPane).getByRole("button", { name: "WEB" }));

    await waitFor(() =>
      expect(studyPane.querySelector(".strongs-entry-bible-verse-text-greek-companion")).toBeNull()
    );

    fireEvent.click(within(studyPane).getByRole("tab", { name: "BDAG" }));

    expect(await within(studyPane).findByText("BDAG Summary")).toBeInTheDocument();
    expect(within(studyPane).getByText("Original BDAG")).toBeInTheDocument();
  }, 30000);

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
    expect(studyPane.querySelector(".strongs-entry-bible-verse-text-greek-companion")).toBeNull();
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
    expect(within(studyPane).getAllByText("λόγος")[0]?.tagName).toBe("MARK");
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

  it("renders a lemma-centered Greek dictionary card with the selected form highlighted", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(within(studyPane).getByText("Greek Dictionary")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Transliteration: archē")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Selected Form")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Noun")).toBeInTheDocument();
    expect(within(studyPane).getByText("Genitive")).toBeInTheDocument();
    expect(within(studyPane).getByText("Example: λογου = of the word")).toBeInTheDocument();
    expect((await within(studyPane).findAllByText("ἀρχῆς")).length).toBeGreaterThan(0);

    const selectedFormRow = within(studyPane)
      .getAllByText("ἀρχῆς")
      .find((node) => node.closest(".greek-dictionary-form-row"));

    expect(selectedFormRow?.closest(".greek-dictionary-form-row")).toHaveClass("is-selected");

    fireEvent.click(within(studyPane).getByRole("button", { name: "KJV" }));

    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse-text-greek-companion").length).toBeGreaterThan(0)
    );
    await waitFor(() =>
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse .strongs-token-lemma").length).toBeGreaterThan(0)
    );
  });

  it("opens the Charts tab from a noun dictionary entry and renders the 2nd declension chart", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Masculine" }));

    const studyPane = screen.getByLabelText("Study pane");
    const chartButton = await within(studyPane).findByRole("button", {
      name: "Open 2nd declension chart"
    });

    fireEvent.click(chartButton);

    await waitFor(() =>
      expect(within(studyPane).getByRole("tab", { name: "Charts" })).toHaveAttribute(
        "aria-selected",
        "true"
      )
    );

    expect(within(studyPane).getByRole("heading", { name: "2nd Declension Noun Chart" })).toBeInTheDocument();
    expect(within(studyPane).getByText("Gender: Masculine")).toBeInTheDocument();
    const chartTable = within(studyPane).getByRole("table", { name: "2nd Declension Noun Chart" });
    expect(chartTable).toBeInTheDocument();
    expect(within(chartTable).getByText("Vocative")).toBeInTheDocument();
    expect(chartTable.querySelector("tr.is-active-row")).not.toBeNull();
    expect(chartTable.querySelector("td.is-active-cell")).not.toBeNull();
  });

  it("shows an unsupported note in Charts for nouns outside the 2nd declension chart", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");
    fireEvent.click(
      await within(studyPane).findByRole("button", { name: "Open 2nd declension chart" })
    );

    expect(
      await within(studyPane).findByText("This noun does not use the current 2nd declension chart.")
    ).toBeInTheDocument();
  });

  it("does not show the chart button for non-noun Greek dictionary selections", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary Verb" }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByText("Selected Form")).toBeInTheDocument();
    expect(
      within(studyPane).queryByRole("button", { name: "Open 2nd declension chart" })
    ).toBeNull();
  });

  it("filters Strong's Bible occurrences by testament and book inside the study pane", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Dictionary" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "ἀρχή" })).toBeInTheDocument();
    expect(await within(studyPane).findByText("Genesis 1:1")).toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("button", { name: "New Testament" }));

    await waitFor(() =>
      expect(within(studyPane).queryByText("Genesis 1:1")).not.toBeInTheDocument()
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
  });

  it("does not render Greek learning inside the study pane", () => {
    renderWithReaderCustomization(<StrongsHarness />);

    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
    expect(screen.queryByText("Which meaning matches this word?")).not.toBeInTheDocument();
  });
});
