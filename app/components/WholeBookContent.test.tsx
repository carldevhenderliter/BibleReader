import { fireEvent, screen, waitFor } from "@testing-library/react";

import { LookupPane } from "@/app/components/LookupPane";
import { SearchPane } from "@/app/components/SearchPane";
import { WholeBookContent } from "@/app/components/WholeBookContent";
import type { BookMeta, Chapter, EsvInterlinearDisplayChapter } from "@/lib/bible/types";
import { setMockPathname } from "@/test/mocks/next-navigation";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

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

const manyChapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [{ number: 1, text: "Chapter one opening." }]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Chapter two opening." }]
  },
  {
    bookSlug: "jude",
    chapterNumber: 3,
    verses: [{ number: 1, text: "Chapter three opening." }]
  },
  {
    bookSlug: "jude",
    chapterNumber: 4,
    verses: [{ number: 1, text: "Chapter four opening." }]
  }
];

const kjvChapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      {
        number: 1,
        text: "Jude, the servant of Jesus Christ...",
        tokens: [
          { text: "Jude, the servant of ", strongsNumbers: [] },
          { text: "Jesus", strongsNumbers: ["G2424"] },
          { text: " Christ...", strongsNumbers: [] }
        ]
      },
      { number: 2, text: "Mercy unto you, and peace, and love, be multiplied." }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Beloved, when I gave all diligence to write unto you..." }]
  }
];

const nltChapters: Chapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      { number: 1, text: "This letter is from Jude, a slave of Jesus Christ..." },
      { number: 2, text: "May God give you more and more mercy, peace, and love." }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [{ number: 1, text: "Dear friends, I had been eagerly planning to write to you..." }]
  }
];

const otBooks: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 2,
    order: 1
  }
];

const greekOtChapters: Chapter[] = [
  {
    bookSlug: "genesis",
    chapterNumber: 1,
    verses: [
      {
        number: 1,
        text: "ἐν ἀρχῇ ἐποίησεν ὁ θεὸς",
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
    ]
  },
  {
    bookSlug: "genesis",
    chapterNumber: 2,
    verses: [
      {
        number: 1,
        text: "καὶ συνετελέσθησαν ὁ οὐρανὸς καὶ ἡ γῆ",
        greekTokens: [
          {
            surface: "συνετελέσθησαν",
            lemma: "συντελέω",
            entryKey: "lemma:συντελεω",
            gloss: "finish",
            transliteration: "synetelesthēsan"
          }
        ]
      }
    ]
  }
];

const masoreticOtChapters: Chapter[] = [
  {
    bookSlug: "genesis",
    chapterNumber: 1,
    verses: [
      {
        number: 1,
        text: "בראשית ברא אלהים",
        hebrewTokens: [
          {
            surface: "בראשית",
            lemma: "רֵאשִׁית",
            strongs: "H7225",
            transliteration: "re'shiyth",
            gloss: "beginning"
          }
        ]
      }
    ]
  },
  {
    bookSlug: "genesis",
    chapterNumber: 2,
    verses: [
      {
        number: 1,
        text: "ויכלו השמים והארץ",
        hebrewTokens: [
          {
            surface: "ויכלו",
            lemma: "כָּלָה",
            strongs: "H3615",
            transliteration: "kalah",
            gloss: "finish"
          }
        ]
      }
    ]
  }
];

const ntInterlinearBook: EsvInterlinearDisplayChapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      {
        number: 1,
        baseGreek: "Ἰούδας Ἰησοῦ χριστοῦ δοῦλος ἀδελφὸς δὲ Ἰακώβου.",
        greek: "Ἰούδας Ἰησοῦ χριστοῦ δοῦλος ἀδελφὸς δὲ Ἰακώβου."
      }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [
      {
        number: 1,
        baseGreek: "Ἀγαπητοί πᾶσαν σπουδὴν ποιούμενος γράφειν ὑμῖν.",
        greek: "Ἀγαπητοί πᾶσαν σπουδὴν ποιούμενος γράφειν ὑμῖν."
      }
    ]
  }
];

const ntInterlinearBookWithTokenGlosses: EsvInterlinearDisplayChapter[] = [
  {
    bookSlug: "jude",
    chapterNumber: 1,
    verses: [
      {
        number: 1,
        baseGreek: "Ἰούδας",
        greek: "Ἰούδας",
        tokens: [
          {
            surface: "Ἰούδας",
            lemma: "Ἰούδας",
            strongs: "G2455",
            occurrenceKey: "jude:1:1:0",
            gloss: "Jude"
          }
        ]
      }
    ]
  },
  {
    bookSlug: "jude",
    chapterNumber: 2,
    verses: [
      {
        number: 1,
        baseGreek: "Ἀγαπητοί",
        greek: "Ἀγαπητοί",
        tokens: [
          {
            surface: "Ἀγαπητοί",
            lemma: "ἀγαπητός",
            strongs: "G27",
            occurrenceKey: "jude:2:1:0",
            gloss: "beloved"
          }
        ]
      }
    ]
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

function installIntersectionObserverMock() {
  const callbackByElement = new Map<Element, IntersectionObserverCallback>();

  class MockIntersectionObserver {
    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe = (element: Element) => {
      callbackByElement.set(element, this.callback);
    };

    unobserve = (element: Element) => {
      callbackByElement.delete(element);
    };

    disconnect = () => {
      callbackByElement.clear();
    };

    takeRecords = () => [];
  }

  Object.defineProperty(window, "IntersectionObserver", {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver
  });

  return {
    trigger(element: Element) {
      const callback = callbackByElement.get(element);

      if (!callback) {
        return;
      }

      callback(
        [
          {
            isIntersecting: true,
            target: element
          } as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      );
    }
  };
}

describe("WholeBookContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/jude");
    window.history.replaceState({}, "", "/read/jude");
    setSplitViewActive(false);
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

  it("lazy loads distant chapter verse content in whole-book view", async () => {
    const intersectionObserver = installIntersectionObserverMock();
    const largerBook: BookMeta = {
      ...books[0],
      chapterCount: 4
    };

    renderWithReaderCustomization(
      <WholeBookContent
        book={largerBook}
        books={[largerBook]}
        chaptersByVersion={{ web: manyChapters }}
        focusedChapterNumber={1}
      />
    );

    expect(screen.getByRole("heading", { name: "Chapter 4" })).toBeInTheDocument();
    expect(screen.queryByText("Chapter four opening.")).not.toBeInTheDocument();

    const chapterFourSection = document.getElementById("chapter-jude-4");
    expect(chapterFourSection).not.toBeNull();

    intersectionObserver.trigger(chapterFourSection!);

    await waitFor(() => {
      expect(screen.getByText("Chapter four opening.")).toBeInTheDocument();
    });
  });

  it("can disable lazy loading and render the full whole-book view immediately", () => {
    const largerBook: BookMeta = {
      ...books[0],
      chapterCount: 4
    };

    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        disableLazyLoading: true
      })
    );

    renderWithReaderCustomization(
      <WholeBookContent
        book={largerBook}
        books={[largerBook]}
        chaptersByVersion={{ web: manyChapters }}
        focusedChapterNumber={1}
      />
    );

    expect(screen.getByText("Chapter four opening.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Loading chapter 4")).not.toBeInTheDocument();
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

  it("renders three versions in whole-book compare with chapter sections", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters, nlt: nltChapters }}
        focusedChapterNumber={2}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "Compare" }));

    expect(screen.getAllByText("WEB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KJV").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NLT").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: /Chapter /i }).length).toBeGreaterThan(1);
    expect(screen.getByText("Dear friends, I had been eagerly planning to write to you...")).toBeInTheDocument();
  });

  it("renders OT compare sections in whole-book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={otBooks[0]}
        books={otBooks}
        chaptersByVersion={{ web: greekOtChapters, greek: greekOtChapters }}
        focusedChapterNumber={2}
        masoreticBookChapters={masoreticOtChapters}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "OT Compare" }));

    expect(screen.getByText("OT Textual Compare")).toBeInTheDocument();
    expect(screen.getAllByLabelText("LXX Greek compare pane").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Masoretic Hebrew compare pane").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("LXX Greek compare scroller").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Masoretic Hebrew compare scroller").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("heading", { name: /Chapter /i }).length).toBeGreaterThan(1);
    expect(screen.getByText("archē")).toBeInTheDocument();
    expect(screen.getByText("ἀρχή")).toBeInTheDocument();
    expect(screen.getByText("בראשית")).toBeInTheDocument();
  });

  it("shows Greek interlinear lines under ESV New Testament verses in whole-book view", () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ esv: chapters, web: chapters }}
          esvInterlinearBook={ntInterlinearBook}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(
      screen.getByText("Ἰούδας Ἰησοῦ χριστοῦ δοῦλος ἀδελφὸς δὲ Ἰακώβου.")
    ).toBeInTheDocument();
  });

  it("can show only Greek in whole-book ESV interlinear mode", () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true,
        showEsvGreekOnly: true
      })
    );

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ esv: chapters, web: chapters }}
          esvInterlinearBook={ntInterlinearBook}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(
      screen.getByText("Ἰούδας Ἰησοῦ χριστοῦ δοῦλος ἀδελφὸς δὲ Ἰακώβου.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Jude, a servant of Jesus Christ...")).not.toBeInTheDocument();
  });

  it("shows selectable English gloss lines in whole-book ESV interlinear mode", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ esv: chapters, web: chapters }}
          esvInterlinearBook={ntInterlinearBookWithTokenGlosses}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(screen.getByRole("button", { name: "Choose English gloss for Ἰούδας" })).toHaveTextContent(
      "Jude"
    );
    expect(screen.getByRole("button", { name: "Choose English gloss for Ἀγαπητοί" })).toHaveTextContent(
      "beloved"
    );
    expect(await screen.findByText("Ioudas")).toBeInTheDocument();
    expect(await screen.findByText("Agapētoi")).toBeInTheDocument();
  });

  it("shows Bible Greek annotation controls in whole-book ESV interlinear mode", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ esv: chapters, web: chapters }}
          esvInterlinearBook={ntInterlinearBookWithTokenGlosses}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    fireEvent.click(await screen.findByRole("button", { name: "Annotate Greek" }));

    expect(screen.getByRole("button", { name: "Done annotating" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Greek undertext for Jude" })).toBeInTheDocument();
  });

  it("checks a whole Greek sentence from whole-book view when Learn Greek is enabled", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ esv: chapters, web: chapters }}
          esvInterlinearBook={ntInterlinearBookWithTokenGlosses}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    fireEvent.click(await screen.findByRole("button", { name: "Learn Greek" }));
    fireEvent.click(screen.getByRole("button", { name: /Ἰούδας Ἰούδας G2455/i }));

    fireEvent.change(await screen.findByLabelText("Type meaning for Ἰούδας"), {
      target: {
        value: "Judas"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Check sentence" }));

    expect(await screen.findByText("Sentence complete")).toBeInTheDocument();
    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
  });

  it("renders custom verse translation editors in whole-book view", () => {
    renderWithReaderCustomization(
      <>
        <WholeBookContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapters }}
        />
        <SearchPane />
        <LookupPane />
      </>
    );

    expect(screen.getByLabelText("Custom translation for jude 1:1")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom translation for jude 2:1")).toBeInTheDocument();
  });

  it("hides read-aloud controls in whole-book view", () => {
    renderWithReaderCustomization(
      <WholeBookContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapters, kjv: kjvChapters }}
        focusedChapterNumber={1}
      />
    );

    expect(screen.queryByRole("button", { name: "Play read aloud" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause read aloud" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop read aloud" })).not.toBeInTheDocument();
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

  it("opens the notebook in the right-side study pane in split whole-book view", () => {
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

    expect(screen.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
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
