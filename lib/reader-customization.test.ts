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

  it("normalizes partial and invalid values", () => {
    expect(
      normalizeReaderCustomization({
        themePreset: "ember",
        bodyFont: "mono",
        uiFont: "technical",
        showStrongs: true,
        textSize: 9,
        lineHeight: 0,
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
      themePreset: "ember",
      bodyFont: "mono",
      uiFont: "technical",
      showStrongs: true,
      showEsvInterlinear: false,
      textSize: 1.8,
      lineHeight: 1.6,
      contentWidth: 60,
      verseSpacing: 1.8,
      paragraphSpacing: 0,
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

  it("maps settings to css custom properties", () => {
    const variables = getReaderCustomizationVariables({
      themePreset: "aurora",
      bodyFont: "humanist",
      uiFont: "technical",
      showStrongs: true,
      showEsvInterlinear: false,
      textSize: 1.2,
      lineHeight: 2,
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

    expect(variables["--reader-text-size"]).toBe("1.2rem");
    expect(variables["--reader-line-height"]).toBe("2");
    expect(variables["--reader-content-width"]).toBe("50rem");
    expect(variables["--reader-verse-spacing"]).toBe("1.4rem");
    expect(variables["--reader-text-align"]).toBe("justify");
    expect(variables["--reader-accent"]).toBe("#74ffd6");
    expect(variables["--reader-body-font"]).toContain("Inter");
  });

  it("fills new fields when restoring older saved settings", () => {
    expect(
      normalizeReaderCustomization({
        themePreset: "midnight",
        bodyFont: "serif",
        uiFont: "sans",
        showStrongs: true,
        textSize: 1.1,
        lineHeight: 2,
        contentWidth: 48
      })
    ).toEqual({
      ...DEFAULT_READER_CUSTOMIZATION,
      themePreset: "midnight",
      bodyFont: "serif",
      uiFont: "sans",
      showStrongs: true,
      textSize: 1.1,
      lineHeight: 2,
      contentWidth: 48
    });
  });
});
