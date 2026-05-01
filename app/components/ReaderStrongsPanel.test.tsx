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
      expect(studyPane.querySelectorAll(".strongs-entry-bible-verse-text").length).toBeGreaterThan(0)
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
  });

  it("does not render Greek learning inside the study pane", () => {
    renderWithReaderCustomization(<StrongsHarness />);

    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
    expect(screen.queryByText("Which meaning matches this word?")).not.toBeInTheDocument();
  });
});
