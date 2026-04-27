import { fireEvent, screen, waitFor, within } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { LookupPane } from "@/app/components/LookupPane";
import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { SearchPane } from "@/app/components/SearchPane";
import type { BookMeta, Chapter, EsvInterlinearDisplayChapter } from "@/lib/bible/types";
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
  },
  {
    slug: "job",
    name: "Job",
    abbreviation: "Job",
    testament: "Old",
    chapterCount: 42,
    order: 18
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
    {
      number: 1,
      text: "In the beginning God created the heaven and the earth.",
      tokens: [
        { text: "In the ", strongsNumbers: [] },
        { text: "beginning", strongsNumbers: ["G746"] },
        { text: " God created the heaven and the earth.", strongsNumbers: [] }
      ]
    },
    { number: 2, text: "And the earth was without form, and void." }
  ]
};

const nltChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning God created the heavens and the earth." },
    { number: 2, text: "The earth was formless and empty." }
  ]
};

const esvChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    { number: 1, text: "In the beginning, God created the heavens and the earth." },
    { number: 2, text: "The earth was without form and void." }
  ]
};

const greekOtChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "ἐν ἀρχῇ ἐποίησεν ὁ θεὸς τὸν οὐρανὸν καὶ τὴν γῆν",
      greekTokens: [
        {
          surface: "ἀρχῇ",
          lemma: "ἀρχή",
          entryKey: "G746",
          strongs: "G746",
          gloss: "beginning",
          transliteration: "archē"
        },
        {
          surface: "θεὸς",
          lemma: "θεός",
          entryKey: "G2316",
          strongs: "G2316",
          gloss: "God",
          transliteration: "theos"
        }
      ]
    }
  ]
};

const masoreticChapter: Chapter = {
  bookSlug: "genesis",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "בראשית ברא אלהים את השמים ואת הארץ",
      hebrewTokens: [
        {
          surface: "בראשית",
          lemma: "רֵאשִׁית",
          strongs: "H7225",
          transliteration: "re'shiyth",
          gloss: "beginning"
        },
        {
          surface: "ברא",
          lemma: "בָּרָא",
          strongs: "H1254",
          transliteration: "bara'",
          gloss: "create"
        }
      ]
    }
  ]
};

const ntBooks: BookMeta[] = [
  {
    slug: "james",
    name: "James",
    abbreviation: "Jas",
    testament: "New",
    chapterCount: 5,
    order: 59
  },
  {
    slug: "romans",
    name: "Romans",
    abbreviation: "Rom",
    testament: "New",
    chapterCount: 16,
    order: 45
  },
  {
    slug: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    testament: "New",
    chapterCount: 28,
    order: 40
  }
];

const esvNtChapter: Chapter = {
  bookSlug: "matthew",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      text: "The book of the genealogy of Jesus Christ, the son of David, the son of Abraham."
    }
  ]
};

const esvNtInterlinearChapter: EsvInterlinearDisplayChapter = {
  bookSlug: "matthew",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      baseGreek: "Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.",
      greek: "Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ."
    }
  ]
};

const esvNtInterlinearChapterWithTokenGlosses: EsvInterlinearDisplayChapter = {
  bookSlug: "matthew",
  chapterNumber: 1,
  verses: [
    {
      number: 1,
      baseGreek: "Βίβλος γενέσεως Ἰησοῦ χριστοῦ",
      greek: "Βίβλος γενέσεως Ἰησοῦ χριστοῦ",
      tokens: [
        {
          surface: "Βίβλος",
          lemma: "βίβλος",
          strongs: "G976",
          occurrenceKey: "matthew:1:1:0",
          gloss: "book"
        },
        {
          surface: "γενέσεως",
          lemma: "γένεσις",
          strongs: "G1078",
          occurrenceKey: "matthew:1:1:1",
          gloss: "genealogy"
        },
        {
          surface: "Ἰησοῦ",
          lemma: "Ἰησοῦς",
          strongs: "G2424",
          occurrenceKey: "matthew:1:1:2",
          gloss: "Jesus"
        },
        {
          surface: "χριστοῦ",
          lemma: "Χριστός",
          strongs: "G5547",
          occurrenceKey: "matthew:1:1:3",
          gloss: "Christ"
        }
      ]
    }
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

describe("ReaderPageContent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMockPathname("/read/genesis/1");
    window.history.replaceState({}, "", "/read/genesis/1");
    setSplitViewActive(false);
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
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
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

  it("opens compare in the reader view from the menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getByRole("tab", { name: "Compare" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Parallel Compare")).toBeInTheDocument();
    expect(screen.getByLabelText("Parallel translation comparison")).toBeInTheDocument();
  });

  it("opens harmony in the reader view from the menu", async () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Harmony" }));

    expect(screen.getByRole("tab", { name: "Harmony" })).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("Chronological Harmony of the Gospels")).toBeInTheDocument();
    expect(screen.getByText("Prologue and Genealogies")).toBeInTheDocument();
    expect(screen.getByLabelText("Harmony event")).toBeInTheDocument();
  });

  it("opens OT compare from the menu for Old Testament passages", async () => {
    renderWithReaderCustomization(
      <>
        <ReaderPageContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapter, greek: greekOtChapter }}
          masoreticChapter={masoreticChapter}
        />
        <LookupPane />
      </>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "OT Compare" }));

    expect(screen.getByRole("tab", { name: "OT Compare" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("OT Textual Compare")).toBeInTheDocument();
    expect(screen.getByLabelText("LXX and Masoretic compare")).toBeInTheDocument();
    expect(screen.getByLabelText("LXX Greek compare pane")).toBeInTheDocument();
    expect(screen.getByLabelText("Masoretic Hebrew compare pane")).toBeInTheDocument();
    expect(screen.getByLabelText("LXX Greek compare scroller")).toBeInTheDocument();
    expect(screen.getByLabelText("Masoretic Hebrew compare scroller")).toBeInTheDocument();
    expect(screen.getByText("LXX Greek")).toBeInTheDocument();
    expect(screen.getByText("Masoretic Hebrew")).toBeInTheDocument();
    expect(screen.getByText("ἀρχῇ")).toBeInTheDocument();
    expect(screen.getByText("archē")).toBeInTheDocument();
    expect(screen.getByText("ἀρχή")).toBeInTheDocument();
    expect(screen.getAllByText("beginning").length).toBeGreaterThan(0);
    expect(screen.getByText("בראשית")).toBeInTheDocument();
    expect(screen.getByText("re'shiyth")).toBeInTheDocument();
    expect(screen.getByText("רֵאשִׁית")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /בראשית רֵאשִׁית H7225/i }));

    expect(screen.getByRole("tab", { name: "OT Compare" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(await screen.findByText("Hebrew")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /ἀρχῇ ἀρχή G746/i }));

    expect(screen.getByRole("tab", { name: "OT Compare" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(await screen.findByText("Greek Dictionary")).toBeInTheDocument();
  });

  it("shows Greek interlinear lines under ESV New Testament verses when enabled", () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapter}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(
      screen.getByText("Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.")
    ).toBeInTheDocument();
  });

  it("lets the reader switch the book selector to chronological New Testament order", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[2]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapter}
      />,
      {
        version: "esv"
      }
    );

    fireEvent.change(screen.getByLabelText("Book order"), {
      target: { value: "chronological-new-testament" }
    });

    expect(
      within(screen.getByLabelText("Book")).getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["James", "Romans", "Matthew"]);
  });

  it("lets the reader switch the book selector to chronological Old Testament order", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    fireEvent.change(screen.getByLabelText("Book order"), {
      target: { value: "chronological-old-testament" }
    });

    expect(
      within(screen.getByLabelText("Book")).getAllByRole("option").map((option) => option.textContent)
    ).toEqual(["Genesis", "Job", "Exodus"]);
  });

  it("can show only Greek without the English verse text in ESV interlinear mode", () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true,
        showEsvGreekOnly: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapter}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(
      screen.getByText("Βίβλος γενέσεως Ἰησοῦ χριστοῦ υἱοῦ Δαυὶδ υἱοῦ Ἀβραάμ.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "The book of the genealogy of Jesus Christ, the son of David, the son of Abraham."
      )
    ).not.toBeInTheDocument();
  });

  it("shows selectable English gloss lines under Greek tokens in chapter view", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapterWithTokenGlosses}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    expect(screen.getByRole("button", { name: "Choose English gloss for Βίβλος" })).toHaveTextContent(
      "book"
    );
    expect(screen.getByRole("button", { name: "Choose English gloss for γενέσεως" })).toHaveTextContent(
      "genealogy"
    );
    expect(await screen.findByText("Biblos")).toBeInTheDocument();
    expect(await screen.findByText("geneseōs")).toBeInTheDocument();
  });

  it("shows Bible Greek annotation controls in ESV interlinear chapter view", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapterWithTokenGlosses}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    fireEvent.click(await screen.findByRole("button", { name: "Annotate Greek" }));

    expect(screen.getByRole("button", { name: "Done annotating" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show Greek undertext for genealogy" })
    ).toBeInTheDocument();
  });

  it("checks a whole Greek sentence in chapter view when Learn Greek is enabled", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapterWithTokenGlosses}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    fireEvent.click(await screen.findByRole("button", { name: "Learn Greek" }));
    fireEvent.click(screen.getByRole("button", { name: /Βίβλος βίβλος G976/i }));

    fireEvent.change(await screen.findByLabelText("Type meaning for Βίβλος"), {
      target: {
        value: "book"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for γενέσεως"), {
      target: {
        value: "genealogy"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for Ἰησοῦ"), {
      target: {
        value: "Jesus"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for χριστοῦ"), {
      target: {
        value: "Christ"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Check sentence" }));

    expect(await screen.findByText("Sentence complete")).toBeInTheDocument();
    expect(screen.queryByText("Greek Learning")).not.toBeInTheDocument();
  });

  it("shows which Greek sentence answers are wrong in chapter view", async () => {
    window.localStorage.setItem(
      "bible-reader:customization",
      JSON.stringify({
        showEsvInterlinear: true
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvNtChapter, web: esvNtChapter }}
        esvInterlinearChapter={esvNtInterlinearChapterWithTokenGlosses}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });

    fireEvent.click(await screen.findByRole("button", { name: "Learn Greek" }));
    fireEvent.click(screen.getByRole("button", { name: /Βίβλος βίβλος G976/i }));

    fireEvent.change(await screen.findByLabelText("Type meaning for Βίβλος"), {
      target: {
        value: "book"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for γενέσεως"), {
      target: {
        value: "wrong"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for Ἰησοῦ"), {
      target: {
        value: "Jesus"
      }
    });
    fireEvent.change(screen.getByLabelText("Type meaning for χριστοῦ"), {
      target: {
        value: "Christ"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Check sentence" }));

    expect(await screen.findByText("1 word wrong")).toBeInTheDocument();
    expect(screen.getByText(/Wrong: source, origin/i)).toBeInTheDocument();
  });

  it("renders custom verse translation editors in chapter view", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter }}
      />
    );

    expect(screen.getByLabelText("Custom translation for genesis 1:1")).toBeInTheDocument();
    expect(screen.getByLabelText("Custom translation for genesis 1:2")).toBeInTheDocument();
  });

  it("renders three versions in chapter compare and routes KJV Strongs clicks to study", async () => {
    setSplitViewActive(true);

    renderWithReaderCustomization(
      <AppSplitLayout>
        <ReaderPageContent
          book={books[0]}
          books={books}
          chaptersByVersion={{ web: chapter, kjv: kjvChapter, nlt: nltChapter }}
        />
      </AppSplitLayout>
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    expect(screen.getAllByText("WEB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KJV").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NLT").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /beginning\s+G746/i }));

    const studyPane = screen.getByLabelText("Study pane");
    expect(await within(studyPane).findByRole("heading", { name: "G746" })).toBeInTheDocument();
  });

  it("lets the compare selectors switch to other available versions", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter, nlt: nltChapter, esv: esvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));

    const firstSelector = screen.getByLabelText("Compare with version");
    expect(within(firstSelector).getByRole("option", { name: "KJV" })).toBeInTheDocument();
    expect(within(firstSelector).getByRole("option", { name: "NLT" })).toBeInTheDocument();
    expect(within(firstSelector).getByRole("option", { name: "ESV" })).toBeInTheDocument();

    fireEvent.change(firstSelector, { target: { value: "nlt" } });

    expect(firstSelector).toHaveValue("nlt");
    expect(screen.getAllByText("NLT").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Add translation" }));

    const thirdSelector = screen.getByLabelText("Also compare with version 3");
    expect(thirdSelector).toHaveValue("esv");
    expect(screen.getAllByText("ESV").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Parallel translation comparison")).toBeInTheDocument();
  });

  it("hides read-aloud controls from the reader toolbar and settings menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: kjvChapter }}
      />
    );

    expect(screen.queryByRole("button", { name: "Play read aloud" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause read aloud" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stop read aloud" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.queryByText(/Downloading HD voice/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Read aloud speed")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Read aloud HD voice")).not.toBeInTheDocument();
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

  it("opens the notebook in the right-side study pane in split view", async () => {
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

    expect(screen.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
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
