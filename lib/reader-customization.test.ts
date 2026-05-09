import {
  DEFAULT_READER_CUSTOMIZATION,
  getReaderCustomizationVariables,
  normalizeReaderCustomization
} from "@/lib/reader-customization";

describe("reader customization", () => {
  it("returns the default settings for invalid input", () => {
    expect(normalizeReaderCustomization(null)).toEqual(DEFAULT_READER_CUSTOMIZATION);
    expect(normalizeReaderCustomization("bad")).toEqual(DEFAULT_READER_CUSTOMIZATION);
  });

  it("keeps layout spacing values fully custom while normalizing bounded typography controls", () => {
    expect(
      normalizeReaderCustomization({
        themePreset: "ember",
        bodyFont: "mono",
        greekFont: "modern",
        hebrewFont: "sans",
        companionVerseFont: "humanist",
        customVerseFont: "transitional",
        uiFont: "technical",
        showStrongs: true,
        showVerseStrongs: false,
        showEsvGreekOnly: true,
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekMorphology: false,
        showGreekGloss: false,
        showCustomVerseTranslation: false,
        bodyTextSize: 9,
        greekTextSize: 8,
        hebrewTextSize: 7,
        companionVerseTextSize: 5,
        customVerseTextSize: 6,
        lineHeight: 0,
        firstLineIndent: -2,
        contentWidth: 200,
        verseSpacing: 9,
        paragraphSpacing: -1,
        textAlign: "justify",
        headerScale: 9,
        verseNumberScale: 0,
        letterSpacing: 1,
        readingModeContrast: 5,
        glowIntensity: -1,
        backgroundIntensity: 5,
        surfaceDepth: 9
      })
    ).toEqual({
      readerPreset: "reading",
      focusReadingMode: false,
      themePreset: "ember",
      bodyFont: "mono",
      greekFont: "modern",
      hebrewFont: "sans",
      companionVerseFont: "humanist",
      customVerseFont: "transitional",
      uiFont: "technical",
      showStrongs: true,
      showVerseStrongs: false,
      showEsvInterlinear: false,
      showEsvGreekOnly: true,
      showVerseNumbers: true,
      showChapterHeadings: true,
      showVerseText: false,
      showCompanionVerseTranslation: true,
      showAnnotatedGreekUndertext: true,
      showGreekSurface: false,
      showGreekLemma: false,
      showGreekTransliteration: false,
      showGreekMorphology: false,
      showGreekGloss: false,
      showCustomVerseTranslation: false,
      showFathersSentenceLines: false,
        disableLazyLoading: false,
        bodyTextSize: 3.25,
        strongsVerseTextSize: 1.02,
        thayerTextSize: 0.98,
        greekTextSize: 4,
        hebrewTextSize: 4,
      companionVerseTextSize: 3,
      customVerseTextSize: 3.25,
      lineHeight: 0,
      firstLineIndent: -2,
      contentWidth: 200,
      verseSpacing: 9,
      paragraphSpacing: -1,
      textAlign: "justify",
      headerScale: 1.3,
      verseNumberScale: 0.75,
      letterSpacing: 0.04,
      readingModeContrast: 1.25,
      glowIntensity: 0,
      backgroundIntensity: 0.3,
      surfaceDepth: 1.3
    });
  });

  it("maps settings to per-layer css custom properties", () => {
    const variables = getReaderCustomizationVariables({
      readerPreset: "reading",
      focusReadingMode: false,
      themePreset: "aurora",
      bodyFont: "humanist",
      greekFont: "scholarly",
      hebrewFont: "serif",
      companionVerseFont: "literary",
      customVerseFont: "mono",
      uiFont: "technical",
      showStrongs: true,
      showVerseStrongs: true,
      showEsvInterlinear: false,
      showEsvGreekOnly: false,
      showVerseNumbers: true,
      showChapterHeadings: true,
      showVerseText: true,
      showCompanionVerseTranslation: true,
      showGreekSurface: true,
      showGreekLemma: true,
      showGreekTransliteration: true,
      showGreekMorphology: true,
      showGreekGloss: true,
      showCustomVerseTranslation: true,
      showFathersSentenceLines: false,
      disableLazyLoading: false,
      bodyTextSize: 1.2,
      strongsVerseTextSize: 1.18,
      thayerTextSize: 1.11,
      greekTextSize: 1.8,
      hebrewTextSize: 1.7,
      companionVerseTextSize: 1.05,
      customVerseTextSize: 1.12,
      lineHeight: 2,
      firstLineIndent: 1.2,
      contentWidth: 50,
      verseSpacing: 1.4,
      paragraphSpacing: 0.35,
      textAlign: "justify",
      headerScale: 1.15,
      verseNumberScale: 1.1,
      letterSpacing: 0.01,
      readingModeContrast: 1.12,
      glowIntensity: 1.4,
      backgroundIntensity: 0.2,
      surfaceDepth: 1.1
    });

    expect(variables["--reader-body-text-size"]).toBe("1.2rem");
    expect(variables["--reader-strongs-verse-text-size"]).toBe("1.18rem");
    expect(variables["--reader-thayer-text-size"]).toBe("1.11rem");
    expect(variables["--reader-greek-text-size"]).toBe("1.8rem");
    expect(variables["--reader-hebrew-text-size"]).toBe("1.7rem");
    expect(variables["--reader-companion-text-size"]).toBe("1.05rem");
    expect(variables["--reader-custom-text-size"]).toBe("1.12rem");
    expect(variables["--reader-line-height"]).toBe("2");
    expect(variables["--reader-first-line-indent"]).toBe("1.2rem");
    expect(variables["--reader-content-width"]).toBe("50rem");
    expect(variables["--reader-verse-spacing"]).toBe("1.4rem");
    expect(variables["--reader-text-align"]).toBe("justify");
    expect(variables["--reader-accent"]).toBe("#74ffd6");
    expect(variables["--reader-body-font"]).toContain("Avenir Next");
    expect(variables["--reader-greek-font"]).toContain("Times New Roman");
    expect(variables["--reader-hebrew-font"]).toContain("Noto Serif Hebrew");
  });

  it("migrates legacy textSize and greekFontScale into the new fields", () => {
    expect(
      normalizeReaderCustomization({
        themePreset: "midnight",
        bodyFont: "serif",
        uiFont: "sans",
        showStrongs: true,
        showVerseStrongs: true,
        textSize: 1.1,
        greekFontScale: 2.05,
        lineHeight: 2,
        contentWidth: 48
      })
    ).toEqual({
      ...DEFAULT_READER_CUSTOMIZATION,
      themePreset: "midnight",
      bodyFont: "serif",
      companionVerseFont: "serif",
      customVerseFont: "serif",
      uiFont: "sans",
      showStrongs: true,
      showVerseStrongs: true,
      showVerseText: true,
      showEsvGreekOnly: false,
      bodyTextSize: 1.1,
      strongsVerseTextSize: 1.02,
      thayerTextSize: 0.98,
      greekTextSize: 2.05,
      hebrewTextSize: 2.05,
      companionVerseTextSize: 1.06,
      customVerseTextSize: 1.1,
      lineHeight: 2,
      contentWidth: 48
    });
  });

  it("maps legacy Greek-only settings onto the granular visibility fields", () => {
    expect(
      normalizeReaderCustomization({
        showEsvInterlinear: true,
        showEsvGreekOnly: true
      })
    ).toEqual({
      ...DEFAULT_READER_CUSTOMIZATION,
      showEsvInterlinear: true,
      showEsvGreekOnly: true,
      showVerseText: false,
      showCompanionVerseTranslation: false,
      showCustomVerseTranslation: false
    });
  });

  it("preserves the lazy loading toggle when provided", () => {
    expect(
      normalizeReaderCustomization({
        disableLazyLoading: true
      }).disableLazyLoading
    ).toBe(true);
  });

  it("preserves the annotated Greek undertext toggle when provided", () => {
    expect(
      normalizeReaderCustomization({
        showAnnotatedGreekUndertext: false
      }).showAnnotatedGreekUndertext
    ).toBe(false);
  });

  it("preserves the chapter headings toggle when provided", () => {
    expect(
      normalizeReaderCustomization({
        showChapterHeadings: false
      }).showChapterHeadings
    ).toBe(false);
  });
});
