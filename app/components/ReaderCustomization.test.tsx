import { fireEvent, screen } from "@testing-library/react";

import { ReaderPageContent } from "@/app/components/ReaderPageContent";
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

  it("updates menu theme and text size controls and persists them", () => {
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
    expect(stored).toContain('"textSize":1.12');
    expect(stored).toContain('"showStrongs":false');
  });

  it("opens advanced settings and updates power-user controls", () => {
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

    fireEvent.click(screen.getByRole("button", { name: /Mono/i }));
    fireEvent.click(screen.getByRole("button", { name: /Justified/i }));
    fireEvent.change(screen.getByLabelText("Glow intensity"), {
      target: {
        value: "1.55"
      }
    });
    fireEvent.change(screen.getByLabelText("Verse spacing"), {
      target: {
        value: "1.35"
      }
    });

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"bodyFont":"mono"');
    expect(stored).toContain('"textAlign":"justify"');
    expect(stored).toContain('"glowIntensity":1.55');
    expect(stored).toContain('"verseSpacing":1.35');
  });

  it("restores persisted advanced settings from localStorage", () => {
    window.localStorage.setItem(
      READER_CUSTOMIZATION_STORAGE_KEY,
      JSON.stringify({
        themePreset: "ember",
        bodyFont: "mono",
        uiFont: "technical",
        showStrongs: false,
        textSize: 1.18,
        lineHeight: 2.1,
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

    expect(screen.getByRole("button", { name: /Mono/i })).toHaveClass("is-active");
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

  it("persists the ESV interlinear toggle from the reader menu", () => {
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
    fireEvent.change(screen.getByLabelText("Greek size"), {
      target: {
        value: "2.1"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Greek only" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"showEsvInterlinear":true');
    expect(stored).toContain('"showEsvGreekOnly":true');
    expect(stored).toContain('"showVerseText":false');
    expect(stored).toContain('"greekFontScale":2.1');
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

  it("resets advanced settings to defaults", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Mono/i }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(screen.getByRole("button", { name: /Serif/i })).toHaveClass("is-active");
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
