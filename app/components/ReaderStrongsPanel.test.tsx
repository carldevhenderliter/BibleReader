import { fireEvent, screen, within } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

function StrongsHarness() {
  const { openStrongs } = useReaderWorkspace();

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

  it("renders BDAG underneath Greek Strongs entries", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByText("BDAG")).toBeInTheDocument();
    expect(within(studyPane).getByText("BDAG Summary")).toBeInTheDocument();
    expect(within(studyPane).getByText("Original BDAG")).toBeInTheDocument();
    expect(within(studyPane).getByRole("heading", { name: "G3056" })).toBeInTheDocument();
    expect(
      within(studyPane).getByRole("button", { name: "Find this word outside scripture" })
    ).toBeInTheDocument();
  });

  it("does not render a BDAG section for Hebrew Strongs entries", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Hebrew" }));

    const studyPane = screen.getByLabelText("Study pane");

    expect(await within(studyPane).findByRole("heading", { name: "H7225" })).toBeInTheDocument();
    expect(within(studyPane).queryByText("BDAG")).not.toBeInTheDocument();
    expect(
      within(studyPane).queryByRole("button", { name: "Find this word outside scripture" })
    ).not.toBeInTheDocument();
  });

  it("renders Apostolic Fathers matches inline for Greek lemmas", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek" }));

    const studyPane = screen.getByLabelText("Study pane");
    const lookupButton = await within(studyPane).findByRole("button", {
      name: "Find this word outside scripture"
    });

    fireEvent.click(lookupButton);

    expect(await within(studyPane).findByText("Outside Scripture")).toBeInTheDocument();
    expect(await within(studyPane).findByRole("heading", { name: "1 Clement" })).toBeInTheDocument();
    expect(within(studyPane).getByText("13")).toBeInTheDocument();
    expect(within(studyPane).getByText(/Ταπεινοφρονήσωμεν/)).toBeInTheDocument();
    expect(within(studyPane).getByText(/Let us therefore be lowly minded/i)).toBeInTheDocument();
  });

  it("renders an empty state when no Apostolic Fathers matches exist", async () => {
    renderWithReaderCustomization(<StrongsHarness />);

    fireEvent.click(screen.getByRole("button", { name: "Open Greek Empty" }));

    const studyPane = screen.getByLabelText("Study pane");
    const lookupButton = await within(studyPane).findByRole("button", {
      name: "Find this word outside scripture"
    });

    fireEvent.click(lookupButton);

    expect(
      await within(studyPane).findByText("No Apostolic Fathers matches found for this lemma.")
    ).toBeInTheDocument();
  });
});
