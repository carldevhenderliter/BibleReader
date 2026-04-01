import { fireEvent, screen, waitFor } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { LookupPane } from "@/app/components/LookupPane";
import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { SearchPane } from "@/app/components/SearchPane";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { PASSAGE_NOTEBOOK_STORAGE_KEY } from "@/lib/passage-notebooks";
import { mockRouter, setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  },
  {
    slug: "exodus",
    name: "Exodus",
    abbreviation: "Exod",
    testament: "Old",
    chapterCount: 40,
    order: 2
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

const kjvChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning God created the heaven and the earth." },
    { number: 2, text: "And the earth was without form, and void." }
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

function installSpeechSynthesisMock() {
  const voices = [
    {
      voiceURI: "test-voice",
      name: "Test Voice",
      lang: "en-US",
      default: true
    } as SpeechSynthesisVoice
  ];
  const utterances: SpeechSynthesisUtterance[] = [];
  const speechSynthesis = {
    getVoices: jest.fn(() => voices),
    speak: jest.fn((utterance: SpeechSynthesisUtterance) => {
      utterances.push(utterance);
    }),
    pause: jest.fn(),
    resume: jest.fn(),
    cancel: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };

  class MockSpeechSynthesisUtterance {
    text: string;
    rate = 1;
    pitch = 1;
    voice: SpeechSynthesisVoice | null = null;
    onend: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;

    constructor(text: string) {
      this.text = text;
    }
  }

  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    writable: true,
    value: speechSynthesis
  });
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    writable: true,
    value: MockSpeechSynthesisUtterance
  });

  return { speechSynthesis, utterances };
}

describe("ReaderPageContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "/read/genesis/1");
    setSplitViewActive(false);
    installSpeechSynthesisMock();
  });

  it("renders chapter content and navigation", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    expect(screen.getByText("World English")).toBeInTheDocument();
    expect(screen.getAllByText("Genesis 1").length).toBeGreaterThan(0);
    expect(document.querySelector(".reader-toolbar-meta")).toHaveTextContent("2 verses");
    expect(document.querySelector(".reader-toolbar-meta")).toHaveTextContent("Chapter view");
    expect(screen.queryByText(/^CONTINUOUS READING$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Genesis 1" })).not.toBeInTheDocument();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();
    expect(screen.getAllByText("World English").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("link", { name: /Whole book view/i })).toHaveAttribute(
      "href",
      "/read/genesis"
    );
  });

  it("switches versions while preserving the current passage", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("option", { name: "ESV" })).toBeEnabled();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(screen.getByText("King James")).toBeInTheDocument();
    expect(screen.getByText("In the beginning God created the heaven and the earth.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Whole book view/i })).toHaveAttribute(
      "href",
      "/read/genesis?version=kjv"
    );
  });

  it("renders read-aloud controls in the reader toolbar and settings menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    expect(screen.getByRole("button", { name: "Play read aloud" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pause read aloud" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop read aloud" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByLabelText("Read aloud voice")).toBeInTheDocument();
    expect(screen.getByLabelText("Read aloud speed")).toBeInTheDocument();
    expect(screen.getByLabelText("Read aloud pitch")).toBeInTheDocument();
  });

  it("starts chapter read-aloud and advances to the next chapter route", () => {
    const { utterances } = installSpeechSynthesisMock();

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Play read aloud" }));

    expect(utterances[0]?.text).toContain("Genesis chapter 1.");
    expect(utterances[0]?.text).toContain("The earth was formless and empty.");

    utterances[0]?.onend?.(new Event("end"));

    expect(mockRouter.push).toHaveBeenCalledWith("/read/genesis/2");
  });

  it("shows an unavailable message for read-aloud when browser speech is missing", () => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      writable: true,
      value: undefined
    });

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    expect(screen.getByRole("button", { name: "Play read aloud" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Read aloud is unavailable in this browser.")).toBeInTheDocument();
  });

  it("opens the passage notebook from the reader menu and restores saved content", () => {
    const { unmount } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: {
        value: "Genesis opening"
      }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: {
        value: "Created light before the sun."
      }
    });

    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toContain(
      "Genesis opening"
    );
    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toContain(
      "Created light before the sun."
    );
    fireEvent.click(screen.getByRole("tab", { name: "Scripture" }));

    unmount();

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    expect(screen.getByLabelText("Notebook title")).toHaveValue("Genesis opening");
    expect(screen.getByLabelText("Notebook note")).toHaveValue("Created light before the sun.");
  });

  it("deletes notebook documents from the library", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: {
        value: "Disposable notebook"
      }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: {
        value: "A note to remove."
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Delete notebook" }));

    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toBe("{}");
    expect(screen.queryByDisplayValue("Disposable notebook")).not.toBeInTheDocument();
    expect(
      screen.getByText("Create a notebook to start keeping Bible-wide study notes.")
    ).toBeInTheDocument();
  });

  it("highlights the verse opened from search", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        highlightedVerseNumber={2}
      />
    );

    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });

  it("applies a manual study highlight to the verse row", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Highlight" })[0]!);

    expect(
      screen
        .getByText("In the beginning, God created the heavens and the earth.")
        .closest(".verse-row")
    ).toHaveClass("has-study-highlight", "has-study-highlight-gold");
  });

  it("renders the notebook inline in the reader column", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(
      screen.queryByText("In the beginning, God created the heavens and the earth.")
    ).not.toBeInTheDocument();
  });

  it("creates a sermon draft from the current notebook", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "Genesis opener" }
    });
    fireEvent.change(screen.getByLabelText("Notebook note"), {
      target: { value: "God creates with intention and order." }
    });

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Sermons" }));
    fireEvent.click(screen.getByRole("button", { name: "From notebook" }));

    expect(screen.getByLabelText("Sermon title")).toHaveValue("Genesis opener");
    expect(screen.getByLabelText("Sermon summary")).toHaveValue(
      "God creates with intention and order."
    );
    expect(screen.getByLabelText("Sermon section 1")).toHaveValue(
      "God creates with intention and order."
    );
  });

  it("adds a verse to a selected notebook through the picker flow", () => {
    setSplitViewActive(true);

    renderWithReaderCustomization(
      <>
        <ReaderPageContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.click(screen.getByRole("button", { name: "New notebook" }));
    fireEvent.change(screen.getByLabelText("Notebook title"), {
      target: { value: "Current study" }
    });

    fireEvent.click(screen.getAllByRole("button", { name: "To notebook" })[0]!);

    expect(screen.getByRole("status")).toHaveTextContent(/Choose a notebook for Genesis 1:1/i);

    fireEvent.click(screen.getByRole("button", { name: /Current study/i }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY)).toContain("web:genesis:1:1");
  });

  it("opens the notebook under the right-side search pane in split view", async () => {
    setSplitViewActive(true);

    renderWithReaderCustomization(
      <>
        <ReaderPageContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("tab", { name: "Notebook" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WEB search" })).toBeInTheDocument();
    expect(screen.getByText("In the beginning, God created the heavens and the earth.")).toBeInTheDocument();
  });

  it("renders the reader hide button inside the reader toolbar in split view", () => {
    setSplitViewActive(true);

    const { container } = renderWithReaderCustomization(
      <AppSplitLayout>
        <ReaderPageContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        />
      </AppSplitLayout>
    );

    const toolbar = container.querySelector(".reader-toolbar");

    expect(toolbar).toContainElement(screen.getByRole("button", { name: "Hide reader pane" }));
    expect(container.querySelector(".app-layout-reader-pane-actions")).toBeNull();
  });

  it("hides the reader topline when scrolling down and shows it again when scrolling up", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0
    });

    const { container } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    const topline = container.querySelector(".reader-topline");

    expect(topline).not.toHaveClass("is-hidden");

    window.scrollY = 160;
    fireEvent.scroll(window);

    expect(topline).toHaveClass("is-hidden");

    window.scrollY = 48;
    fireEvent.scroll(window);

    expect(topline).not.toHaveClass("is-hidden");
  });

  it("hides the reader topline after slow downward scrolling", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0
    });

    const { container } = renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    const topline = container.querySelector(".reader-topline");

    window.scrollY = 40;
    fireEvent.scroll(window);
    expect(topline).not.toHaveClass("is-hidden");

    window.scrollY = 58;
    fireEvent.scroll(window);
    expect(topline).not.toHaveClass("is-hidden");

    window.scrollY = 76;
    fireEvent.scroll(window);
    expect(topline).toHaveClass("is-hidden");
  });

  it("highlights a verse range opened from search", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        highlightedVerseRange={{ start: 1, end: 2 }}
      />
    );

    expect(
      screen
        .getByText("In the beginning, God created the heavens and the earth.")
        .closest(".verse-row")
    ).toHaveClass("is-highlighted");
    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });

  it("reads verse range highlights from the search URL params", async () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
        highlightedVerseRange={{ start: 1, end: 2 }}
      />
    );

    await waitFor(() => {
      expect(
        screen
          .getByText("In the beginning, God created the heavens and the earth.")
          .closest(".verse-row")
      ).toHaveClass("is-highlighted");
    });
    expect(screen.getByText("The earth was formless and empty.").closest(".verse-row")).toHaveClass(
      "is-highlighted"
    );
  });
});
