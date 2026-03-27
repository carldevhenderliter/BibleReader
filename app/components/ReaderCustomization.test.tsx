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

describe("Reader customization", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps common controls inline in the reader toolbar", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    expect(screen.getByLabelText("Book")).toBeInTheDocument();
    expect(screen.getByLabelText("Chapter")).toBeInTheDocument();
    expect(screen.getByLabelText("Version")).toBeInTheDocument();
    expect(screen.getByLabelText("Theme")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase text size" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Whole book view" })).toBeInTheDocument();
  });

  it("updates inline theme and text size controls and persists them", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.change(screen.getByLabelText("Theme"), {
      target: {
        value: "midnight"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Increase text size" }));

    const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY) ?? "";

    expect(stored).toContain('"themePreset":"midnight"');
    expect(stored).toContain('"textSize":1.12');
  });

  it("opens advanced settings and updates power-user controls", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    const trigger = screen.getByRole("button", { name: "Advanced" });

    expect(screen.queryByRole("dialog", { name: "Fine-tune the reading space" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Fine-tune the reading space" })).toBeVisible();
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

    expect(screen.getByLabelText("Theme")).toHaveValue("ember");

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));

    expect(screen.getByRole("button", { name: /Mono/i })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Justified/i })).toHaveClass("is-active");
  });

  it("resets advanced settings to defaults", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chaptersByVersion={chaptersByVersion}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
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

    const trigger = screen.getByRole("button", { name: "Advanced" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close reader settings" }));

    expect(screen.queryByRole("dialog", { name: "Fine-tune the reading space" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Fine-tune the reading space" })).not.toBeInTheDocument();
  });
});
