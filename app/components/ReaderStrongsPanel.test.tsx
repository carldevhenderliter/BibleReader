import { fireEvent, screen, within } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

function StrongsHarness() {
  const { openGreekDictionary, openGreekLearningQuiz, openStrongs } = useReaderWorkspace();

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
          openGreekLearningQuiz({
            entryKey: "G746",
            strongs: "G746",
            lemma: "ἀρχή",
            label: "ἀρχή",
            selectedForm: "ἀρχῆς",
            selectedFormMorphology: "N-GSF",
            selectedFormDecodedMorphology: "noun genitive singular feminine",
            transliteration: "archēs",
            gloss: "of the beginning"
          })
        }
        type="button"
      >
        Open Greek Quiz
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
    expect(await within(studyPane).findByText(/Matthew 5:32/)).toBeInTheDocument();
    const matchedToken = await within(studyPane).findByText(/for the cause/i);
    expect(matchedToken.closest("button")).toHaveClass("strongs-token-match");

    fireEvent.click(within(studyPane).getByRole("tab", { name: "BDAG" }));

    expect(await within(studyPane).findByText("BDAG Summary")).toBeInTheDocument();
    expect(within(studyPane).getByText("Original BDAG")).toBeInTheDocument();
  }, 15000);

  it("does not render a BDAG section for Hebrew Strongs entries", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Hebrew" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "H7225" })).toBeInTheDocument();
    expect(await within(studyPane).findByRole("tab", { name: "Verses In Bible" })).toBeInTheDocument();
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

  it("renders a Greek learning quiz in the study pane and shows correction feedback", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Quiz" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByText("Greek Learning")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Which meaning matches this word?")).toBeInTheDocument();
    expect(within(studyPane).queryByText("Lemma Definition")).not.toBeInTheDocument();

    const options = await within(studyPane).findAllByRole("button");
    const quizOptions = options.filter((button) =>
      button.className.includes("greek-learning-quiz-option")
    );

    expect(quizOptions).toHaveLength(4);

    const wrongOption =
      quizOptions.find((button) => !button.textContent?.includes("beginning")) ?? null;

    expect(wrongOption).not.toBeNull();

    fireEvent.click(wrongOption!);

    expect(await within(studyPane).findByText("Correct Answer")).toBeInTheDocument();
    expect(within(studyPane).getByText(/means beginning/i)).toBeInTheDocument();
    expect(within(studyPane).getByText("Lemma Definition")).toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("button", { name: "Try Again" }));

    expect(await within(studyPane).findByText("Which meaning matches this word?")).toBeInTheDocument();
    expect(within(studyPane).queryByText("Correct Answer")).not.toBeInTheDocument();

    fireEvent.click(within(studyPane).getByRole("button", { name: "Type answer" }));
    fireEvent.change(within(studyPane).getByLabelText("Type the meaning"), {
      target: {
        value: "beginning"
      }
    });
    fireEvent.click(within(studyPane).getByRole("button", { name: "Check" }));

    expect(await within(studyPane).findByText("Correct")).toBeInTheDocument();

    fireEvent.click(await within(studyPane).findByRole("button", { name: "Open Dictionary" }));

    expect(await within(studyPane).findByText("Greek Dictionary")).toBeInTheDocument();
    expect(await within(studyPane).findByText("Selected Form")).toBeInTheDocument();
  });
});
