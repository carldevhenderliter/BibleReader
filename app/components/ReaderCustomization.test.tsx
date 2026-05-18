import { fireEvent, screen, within } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
import { MOBILE_PREVIEW_STORAGE_KEY } from "@/app/components/MobilePreviewProvider";
import type { BookMeta, Chapter } from "@/lib/bible/types";
import { READER_CUSTOMIZATION_STORAGE_KEY } from "@/lib/reader-customization";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

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

const chaptersByVersion = {
  web: chapter,
  kjv: chapter
} as const;

const esvChapter: Chapter = {
  bookSlug: "matthew",
  chapterNumber: 1,
  verses: [{ number: 1, text: "The book of the genealogy of Jesus Christ, the son of David, the son of Abraham." }]
};

const ntBooks: BookMeta[] = [
  {
    slug: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    testament: "New",
    chapterCount: 28,
    order: 40
  }
];

describe("Reader customization", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps book and chapter controls pinned in the reader toolbar", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    expect(screen.getByLabelText("Book")).toBeInTheDocument();
    expect(screen.getByLabelText("Chapter")).toBeInTheDocument();
    expect(screen.getAllByText("Genesis 1").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Menu" })).toBeInTheDocument();
  });

  it("updates menu theme and main text size controls and persists them", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Theme"), {
      target: {
        value: "midnight"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Increase text size" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"themePreset":"midnight"');
    expect(stored).toContain('"bodyTextSize":1.12');
    expect(stored).toContain('"showStrongs":false');
    expect(stored).not.toContain('"textSize"');
  });

  it("persists the top-level Strong's verse size control", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Strong's verse size" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"strongsVerseTextSize":1.06');
  });

  it("persists the top-level Thayer text size control", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase Thayer text size" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"thayerTextSize":1.02');
  });

  it("toggles the desktop mobile preview mode from the reader menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Mobile preview off" }));

    expect(window.localStorage.getItem(MOBILE_PREVIEW_STORAGE_KEY)).toBe("true");
    expect(document.body).toHaveClass("mobile-preview-enabled");
    expect(screen.getByRole("button", { name: "Mobile preview on" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("persists the under-verse translation toggle and selected version", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ web: chapter, kjv: chapter, esv: chapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Under-verse version/i }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "Under-verse versions" })).getByRole(
        "button",
        { name: "KJV" }
      )
    );

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showSecondaryVerseTranslation":true');
    expect(stored).toContain('"secondaryVerseTranslationVersions":["esv","kjv"]');
  });

  it("persists the Greek grammar card toggles", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ greek: esvChapter, esv: esvChapter, web: esvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "greek"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /Greek grammar cards/i }));
    fireEvent.click(screen.getByRole("button", { name: /Grammar lemma/i }));
    fireEvent.click(screen.getByRole("button", { name: /Grammar form/i }));
    fireEvent.click(screen.getByRole("button", { name: /Expanded grammar details/i }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showGreekGrammarCards":true');
    expect(stored).toContain('"showGreekGrammarLemma":false');
    expect(stored).toContain('"showGreekGrammarForm":false');
    expect(stored).toContain('"showExpandedGreekGrammarCards":true');
  });

  it("opens advanced settings and persists unrestricted layout spacing values", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    const trigger = screen.getByRole("button", { name: "Menu" });

    expect(screen.queryByRole("dialog", { name: "Reader controls and settings" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Reader controls and settings" })).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getAllByRole("button", { name: /Mono/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /Justified/i }));
    fireEvent.change(screen.getByLabelText("Glow intensity"), {
      target: {
        value: "1.55"
      }
    });
    fireEvent.change(screen.getByLabelText("Content width"), {
      target: {
        value: "128"
      }
    });
    fireEvent.change(screen.getByLabelText("Verse spacing"), {
      target: {
        value: "4.75"
      }
    });
    fireEvent.change(screen.getByLabelText("Paragraph spacing"), {
      target: {
        value: "-0.8"
      }
    });

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"bodyFont":"mono"');
    expect(stored).toContain('"textAlign":"justify"');
    expect(stored).toContain('"glowIntensity":1.55');
    expect(stored).toContain('"contentWidth":128');
    expect(stored).toContain('"verseSpacing":4.75');
    expect(stored).toContain('"paragraphSpacing":-0.8');
  });

  it("persists exact per-layer typography inputs and font selections", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ greek: chapter, web: chapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "greek"
      }
    });
    fireEvent.change(screen.getByLabelText("Main text size"), {
      target: {
        value: "1.34"
      }
    });
    fireEvent.change(screen.getByLabelText("Strong's verse size"), {
      target: {
        value: "1.28"
      }
    });
    fireEvent.change(screen.getByLabelText("Thayer text size"), {
      target: {
        value: "1.16"
      }
    });
    fireEvent.change(screen.getByLabelText("Hebrew text size"), {
      target: {
        value: "1.92"
      }
    });
    fireEvent.change(screen.getByLabelText("First-line indent"), {
      target: {
        value: "1.15"
      }
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Literary Serif/i })[1]);

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"bodyTextSize":1.34');
    expect(stored).toContain('"strongsVerseTextSize":1.28');
    expect(stored).toContain('"thayerTextSize":1.16');
    expect(stored).toContain('"hebrewTextSize":1.92');
    expect(stored).toContain('"firstLineIndent":1.15');
    expect(stored).toContain('"companionVerseFont":"literary"');
  });

  it("restores persisted advanced settings from localStorage", () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        themePreset: "ember",
        bodyFont: "mono",
        greekFont: "modern",
        hebrewFont: "sans",
        companionVerseFont: "humanist",
        customVerseFont: "humanist",
        uiFont: "technical",
        showStrongs: false,
        bodyTextSize: 1.18,
        strongsVerseTextSize: 1.31,
        greekTextSize: 1.94,
        hebrewTextSize: 1.72,
        companionVerseTextSize: 1.02,
        customVerseTextSize: 1.16,
        lineHeight: 2.1,
        firstLineIndent: 0.85,
        contentWidth: 52,
        verseSpacing: 1.3,
        paragraphSpacing: 0.45,
        textAlign: "justify",
        headerScale: 1.18,
        verseNumberScale: 1.2,
        letterSpacing: 0.015,
        readingModeContrast: 1.12,
        glowIntensity: 1.35,
        backgroundIntensity: 0.22,
        surfaceDepth: 1.12
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByLabelText("Theme")).toHaveValue("ember");

    expect(screen.getAllByRole("button", { name: /Mono/i })[0]).toHaveClass("is-active");
    expect(screen.getAllByRole("button", { name: /Modern Sans/i })[0]).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Justified/i })).toHaveClass("is-active");
  });

  it("persists the KJV Strongs toggle from the reader menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Show Strongs" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showStrongs":true');
  });

  it("lets the Greek interlinear quick control drive the KJV under-Greek display", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "kjv"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Show Greek interlinear" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showStrongs":true');
  });

  it("persists the ESV interlinear toggle from the reader menu", () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false
      })
    );

    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvChapter, web: esvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Show Greek interlinear" }));
    fireEvent.change(screen.getByLabelText("Greek text size"), {
      target: {
        value: "2.1"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Greek only" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showEsvInterlinear":true');
    expect(stored).toContain('"showGreekSurface":true');
    expect(stored).toContain('"showEsvGreekOnly":true');
    expect(stored).toContain('"showVerseText":false');
    expect(stored).toContain('"greekTextSize":2.1');
    expect(stored).not.toContain('"greekFontScale"');
  });

  it("persists individual verse display toggles from the reader menu", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvChapter, web: esvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Show Greek interlinear" }));
    fireEvent.click(screen.getByRole("button", { name: /Greek lemma/i }));
    fireEvent.click(screen.getByRole("button", { name: /Your translation/i }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showGreekLemma":false');
    expect(stored).toContain('"showCustomVerseTranslation":false');
  });

  it("persists the verse-display Strong's number toggle for ESV interlinear", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={ntBooks[0]}
        books={ntBooks}
        chaptersByVersion={{ esv: esvChapter, web: esvChapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "esv"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Show Greek interlinear" }));
    fireEvent.click(screen.getByRole("button", { name: /Strong's numbers/i }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showVerseStrongs":false');
  });

  it("persists the English companion toggle for the standalone Greek version", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={{ greek: chapter, web: chapter }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.change(screen.getByLabelText("Version"), {
      target: {
        value: "greek"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: /English companion/i }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showCompanionVerseTranslation":false');
  });

  it("resets advanced settings to defaults", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getAllByRole("button", { name: /Mono/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(screen.getAllByRole("button", { name: /Serif/i })[0]).toHaveClass("is-active");
  });

  it("closes the panel from the close button and escape key", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    const trigger = screen.getByRole("button", { name: "Menu" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close reader settings" }));

    expect(screen.queryByRole("dialog", { name: "Reader controls and settings" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Reader controls and settings" })).not.toBeInTheDocument();
  });

  it("reopens the panel after closing it from the backdrop", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    const trigger = screen.getByRole("button", { name: "Menu" });

    fireEvent.click(trigger);
    fireEvent.click(document.querySelector(".reader-settings-backdrop") as Element);

    expect(screen.queryByRole("dialog", { name: "Reader controls and settings" })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Reader controls and settings" })).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
