import { fireEvent, render, screen } from "@testing-library/react";

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

describe("Reader customization", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens settings and updates the active theme", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    const trigger = screen.getByRole("button", { name: "Customize" });

    expect(screen.queryByRole("dialog", { name: "Customize your reading space" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    expect(screen.getByRole("dialog", { name: "Customize your reading space" })).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: /Midnight/i }));

    expect(screen.getByRole("button", { name: /Midnight/i })).toHaveClass("is-active");
  });

  it("updates slider values and persists them", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    expect(screen.getByRole("dialog", { name: "Customize your reading space" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Text size"), {
      target: {
        value: "1.22"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Close reader settings" }));

    expect(window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY)).toContain(
      '"textSize":1.22'
    );
  });

  it("updates power-user controls and persists them", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    fireEvent.click(screen.getByRole("button", { name: /Aurora/i }));
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

    expect(stored).toContain('"themePreset":"aurora"');
    expect(stored).toContain('"textAlign":"justify"');
    expect(stored).toContain('"glowIntensity":1.55');
    expect(stored).toContain('"verseSpacing":1.35');
  });

  it("restores persisted settings from localStorage", () => {
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
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Customize" }));

    expect(screen.getByRole("dialog", { name: "Customize your reading space" })).toBeVisible();
    expect(screen.getByRole("button", { name: /Ember/i })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Mono/i })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Justified/i })).toHaveClass("is-active");
  });

  it("resets to defaults", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Customize" }));
    fireEvent.click(screen.getByRole("button", { name: /Midnight/i }));
    fireEvent.click(screen.getByRole("button", { name: "Reset to defaults" }));

    expect(screen.getByRole("button", { name: /Neon/i })).toHaveClass("is-active");
  });

  it("closes the panel from the close button and escape key", () => {
    renderWithReaderCustomization(
      <ReaderPageContent
        book={books[0]}
        books={books}
        chapter={chapter}
        esvEnabled={false}
        version="web"
      />
    );

    const trigger = screen.getByRole("button", { name: "Customize" });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close reader settings" }));

    expect(screen.queryByRole("dialog", { name: "Customize your reading space" })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog", { name: "Customize your reading space" })).not.toBeInTheDocument();
  });
});
