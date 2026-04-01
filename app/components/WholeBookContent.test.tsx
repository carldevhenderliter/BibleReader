import { fireEvent, screen } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { SearchPane } from "@/app/components/SearchPane";
import { WholeBookContent } from "@/app/components/WholeBookContent";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const mockKokoroGenerate = jest.fn();
const mockKokoroFromPretrained = jest.fn();

jest.mock("kokoro-js", () => ({
  KokoroTTS: {
    from_pretrained: mockKokoroFromPretrained
  }
}));

const books: BookMeta[] = [
  {
    slug: "jude",
    name: "Jude",
    abbreviation: "Jude",
    testament: "New",
    chapterCount: 2,
    order: 65
  }
];

const chapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      { number: 1, text: "Jude, a servant of Jesus Christ..." },
      { number: 2, text: "Mercy to you and peace and love be multiplied." }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Beloved, while I was very eager to write to you..." }]
  }
];

const kjvChapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      { number: 1, text: "Jude, the servant of Jesus Christ..." },
      { number: 2, text: "Mercy unto you, and peace, and love, be multiplied." }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Beloved, when I gave all diligence to write unto you..." }]
  }
];

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
  const utterances: SpeechSynthesisUtterance[] = [];
  const speechSynthesis = {
    getVoices: jest.fn(() => [
      {
        voiceURI: "test-voice",
        name: "Test Voice",
        lang: "en-US",
        default: true
      } as SpeechSynthesisVoice
    ]),
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

  return { utterances };
}

function installKokoroSupport() {
  const sourceNodes: Array<{
    onended: ((event: Event) => void) | null;
    buffer: AudioBuffer | null;
    connect: jest.Mock;
    disconnect: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
  }> = [];

  class MockAudioContext {
    currentTime = 0;
    destination = {} as AudioDestinationNode;
    state: AudioContextState = "running";
    resume = jest.fn(async () => {});
    decodeAudioData = jest.fn(async () => ({}) as AudioBuffer);
    createBufferSource = jest.fn(() => {
      const sourceNode = {
        buffer: null,
        onended: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
      };
      sourceNodes.push(sourceNode);
      return sourceNode as unknown as AudioBufferSourceNode;
    });
  }

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    writable: true,
    value: MockAudioContext
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"
  });

  mockKokoroGenerate.mockResolvedValue({
    toWav: () => new ArrayBuffer(8)
  });
  mockKokoroFromPretrained.mockResolvedValue({
    voices: {
      af_heart: {
        name: "Heart",
        language: "en-us",
        gender: "female"
      }
    },
    generate: mockKokoroGenerate
  });

  return { sourceNodes };
}

describe("WholeBookContent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    setMockPathname("/read/jude");
    window.history.replaceState({}, "", "/read/jude");
    setSplitViewActive(false);
    installSpeechSynthesisMock();
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      writable: true,
      value: undefined
    });
  });

  it("renders a continuous book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    expect(screen.getByText("World English")).toBeInTheDocument();
    expect(screen.getAllByText(/^Jude$/).length).toBeGreaterThan(0);
    expect(document.querySelector(".reader-toolbar-meta")).toHaveTextContent("2 chapters");
    expect(document.querySelector(".reader-toolbar-meta")).toHaveTextContent("Continuous reading");
    expect(screen.queryByRole("heading", { name: "Jude" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 2" })).toBeInTheDocument();
    expect(screen.getByText("Mercy to you and peace and love be multiplied.")).toBeInTheDocument();
  });

  it("switches whole-book content between bundled versions", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    expect(screen.getByText("Mercy to you and peace and love be multiplied.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });

    expect(screen.getByText("King James")).toBeInTheDocument();
    expect(screen.getByText("Mercy unto you, and peace, and love, be multiplied.")).toBeInTheDocument();
  });

  it("continues read-aloud through later chapters in whole-book view", () => {
    const { utterances } = installSpeechSynthesisMock();
    const scrollIntoView = jest.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
        focusedChapterNumber={1}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Play read aloud" }));

    expect(utterances[0]?.text).toContain("Jude chapter 1.");
    utterances[0]?.onend?.(new Event("end"));

    expect(utterances[1]?.text).toContain("Jude chapter 2.");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("continues whole-book playback with kokoro audio when browser speech is unavailable", async () => {
    const { sourceNodes } = installKokoroSupport();
    const scrollIntoView = jest.fn();

    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });
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
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
        focusedChapterNumber={1}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Play read aloud" }));

    await screen.findByText("HD voice");
    expect(sourceNodes).toHaveLength(1);

    sourceNodes[0]?.onended?.(new Event("ended"));

    await screen.findByText("HD voice");
    expect(sourceNodes).toHaveLength(2);
    expect(mockKokoroGenerate).toHaveBeenCalledWith(
      expect.stringContaining("Jude chapter 2."),
      expect.objectContaining({ voice: "af_heart", speed: 1 })
    );
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("opens the notebook from whole-book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));

    expect(screen.getByRole("button", { name: "New notebook" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Chapter 1" })).not.toBeInTheDocument();
  });

  it("opens the notebook under the right-side search pane in split whole-book view", () => {
    setSplitViewActive(true);

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
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
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
  });

  it("highlights and scrolls to the requested verse in whole-book view", () => {
    const scrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView
    });

    const { container } = renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
        focusedChapterNumber={2}
        highlightedChapterNumber={2}
        highlightedVerseNumber={1}
      />
    );

    const highlightedRows = Array.from(container.querySelectorAll(".verse-row.is-highlighted"));
    expect(highlightedRows).toHaveLength(1);
    expect(highlightedRows[0]).toHaveAttribute("id", "verse-jude-2-1");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("restores the whole-book reader topline when scrolling back up", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0
    });

    const { container } = renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    const topline = container.querySelector(".reader-topline");

    window.scrollY = 180;
    fireEvent.scroll(window);
    expect(topline).toHaveClass("is-hidden");

    window.scrollY = 36;
    fireEvent.scroll(window);
    expect(topline).not.toHaveClass("is-hidden");
  });

  it("hides the whole-book reader topline after slow downward scrolling", () => {
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      writable: true,
      value: 0
    });

    const { container } = renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
      />
    );

    const topline = container.querySelector(".reader-topline");

    window.scrollY = 42;
    fireEvent.scroll(window);
    expect(topline).not.toHaveClass("is-hidden");

    window.scrollY = 60;
    fireEvent.scroll(window);
    expect(topline).not.toHaveClass("is-hidden");

    window.scrollY = 78;
    fireEvent.scroll(window);
    expect(topline).toHaveClass("is-hidden");
  });
});
