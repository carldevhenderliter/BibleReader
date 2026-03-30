import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const LOOKUP_STUDY_HEIGHT_STORAGE_KEY = "bible-reader.lookup-study-height-px";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  }
];

const chapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning, God created the heavens and the earth." },
    { number: 2, text: "The earth was formless and empty." }
  ]
};

function setSplitViewActive(isActive: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: isActive,
      media: "(min-width: 64rem)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

function setLookupBodyClientHeight(height: number) {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return this.classList?.contains("lookup-pane-body") ? height : 0;
    }
  });
}

function renderLookupPane() {
  return renderWithReaderCustomization(
    <>
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: chapter }}
      />
      <LookupPane />
    </>
  );
}

describe("LookupPane", () => {
  beforeEach(() => {
    if (!("PointerEvent" in window)) {
      Object.defineProperty(window, "PointerEvent", {
        configurable: true,
        writable: true,
        value: MouseEvent
      });
    }

    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "/read/genesis/1");
    setSplitViewActive(true);
    setLookupBodyClientHeight(720);
  });

  it("renders a draggable divider between search and the lower study pane in split view", () => {
    renderLookupPane();

    expect(screen.getByRole("button", { name: "Resize study pane" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WEB search" })).toBeInTheDocument();
  });

  it("updates and persists the lower study height when dragged", () => {
    const { container } = renderLookupPane();
    const divider = screen.getByRole("button", { name: "Resize study pane" });
    const body = container.querySelector(".lookup-pane-body");

    fireEvent.pointerDown(divider, { clientY: 500 });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientY: 420 }));
      window.dispatchEvent(new PointerEvent("pointerup", { clientY: 420 }));
    });

    expect(body).toHaveStyle("--lookup-study-height: 400px");
    expect(window.localStorage.getItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY)).toBe("400");
  });

  it("restores a saved study height and clamps it to the current pane height", async () => {
    setLookupBodyClientHeight(500);
    window.localStorage.setItem(LOOKUP_STUDY_HEIGHT_STORAGE_KEY, "900");
    const { container } = renderLookupPane();

    await waitFor(() => {
      expect(container.querySelector(".lookup-pane-body")).toHaveStyle(
        "--lookup-study-height: 206px"
      );
    });
  });

  it("does not render the study divider when split view is inactive", () => {
    setSplitViewActive(false);

    renderLookupPane();

    expect(screen.queryByRole("button", { name: "Resize study pane" })).not.toBeInTheDocument();
  });
});
