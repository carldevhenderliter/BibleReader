import type {
  BodyFontOption,
  ReaderCustomizationSettings,
  TextAlignOption,
  ThemePreset,
  UiFontOption
} from "@/lib/bible/types";

export const READER_CUSTOMIZATION_STORAGE_KEY = "bible-reader:customization";

type RgbTriplet = [number, number, number];

type ThemePresetVariables = {
  surfaceRgb: RgbTriplet;
  surfaceStrongRgb: RgbTriplet;
  borderRgb: RgbTriplet;
  glowRgb: RgbTriplet;
  accentRgb: RgbTriplet;
  secondaryRgb: RgbTriplet;
  verseTextRgb: RgbTriplet;
  metaTextRgb: RgbTriplet;
};

export const THEME_PRESETS = [
  {
    id: "neon",
    name: "Neon",
    description: "Electric cyan and violet glow with the current dark-tech feel."
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Cooler, lower-glow tones for a more restrained night reader."
  },
  {
    id: "ember",
    name: "Ember",
    description: "Warm reading tones with softer highlights inside the dark shell."
  },
  {
    id: "obsidian",
    name: "Obsidian",
    description: "Minimal glow, deeper blacks, and a more restrained premium reader."
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Cyan-green energy with brighter atmospheric gradients."
  }
] satisfies Array<{ id: ThemePreset; name: string; description: string }>;

export const BODY_FONT_OPTIONS = [
  {
    id: "serif",
    name: "Serif",
    description: "Classic long-form scripture reading."
  },
  {
    id: "humanist",
    name: "Humanist Sans",
    description: "Cleaner and more contemporary body text."
  },
  {
    id: "mono",
    name: "Mono",
    description: "A technical codex feel with tighter character rhythm."
  }
] satisfies Array<{ id: BodyFontOption; name: string; description: string }>;

export const UI_FONT_OPTIONS = [
  {
    id: "sans",
    name: "Modern Sans",
    description: "Default interface font stack."
  },
  {
    id: "technical",
    name: "Technical",
    description: "Sharper control labels and interface chrome."
  }
] satisfies Array<{ id: UiFontOption; name: string; description: string }>;

export const DEFAULT_READER_CUSTOMIZATION: ReaderCustomizationSettings = {
  themePreset: "neon",
  bodyFont: "serif",
  uiFont: "sans",
  showStrongs: false,
  showEsvInterlinear: false,
  showEsvGreekOnly: false,
  greekFontScale: 1.55,
  textSize: 1.08,
  lineHeight: 1.95,
  contentWidth: 46,
  verseSpacing: 1,
  paragraphSpacing: 0.2,
  textAlign: "left",
  headerScale: 1,
  verseNumberScale: 1,
  letterSpacing: 0,
  readingModeContrast: 1,
  glowIntensity: 1,
  backgroundIntensity: 0.14,
  surfaceDepth: 1
};

const TEXT_SIZE_RANGE = { min: 0.92, max: 1.8 };
const LINE_HEIGHT_RANGE = { min: 1.6, max: 2.3 };
const CONTENT_WIDTH_RANGE = { min: 36, max: 60 };
const VERSE_SPACING_RANGE = { min: 0.6, max: 1.8 };
const PARAGRAPH_SPACING_RANGE = { min: 0, max: 0.8 };
const HEADER_SCALE_RANGE = { min: 0.85, max: 1.3 };
const VERSE_NUMBER_SCALE_RANGE = { min: 0.75, max: 1.6 };
const LETTER_SPACING_RANGE = { min: -0.01, max: 0.04 };
const CONTRAST_RANGE = { min: 0.9, max: 1.25 };
const GLOW_RANGE = { min: 0, max: 1.8 };
const BACKGROUND_INTENSITY_RANGE = { min: 0.03, max: 0.3 };
const SURFACE_DEPTH_RANGE = { min: 0.8, max: 1.3 };
const GREEK_FONT_SCALE_RANGE = { min: 1, max: 2.4 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isThemePreset(value: unknown): value is ThemePreset {
  return (
    value === "neon" ||
    value === "midnight" ||
    value === "ember" ||
    value === "obsidian" ||
    value === "aurora"
  );
}

function isBodyFontOption(value: unknown): value is BodyFontOption {
  return value === "serif" || value === "humanist" || value === "mono";
}

function isUiFontOption(value: unknown): value is UiFontOption {
  return value === "sans" || value === "technical";
}

function isTextAlignOption(value: unknown): value is TextAlignOption {
  return value === "left" || value === "justify";
}

export function normalizeReaderCustomization(value: unknown): ReaderCustomizationSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_READER_CUSTOMIZATION;
  }

  const candidate = value as Partial<ReaderCustomizationSettings>;

  return {
    themePreset: isThemePreset(candidate.themePreset)
      ? candidate.themePreset
      : DEFAULT_READER_CUSTOMIZATION.themePreset,
    bodyFont: isBodyFontOption(candidate.bodyFont)
      ? candidate.bodyFont
      : DEFAULT_READER_CUSTOMIZATION.bodyFont,
    uiFont: isUiFontOption(candidate.uiFont)
      ? candidate.uiFont
      : DEFAULT_READER_CUSTOMIZATION.uiFont,
    showStrongs:
      typeof candidate.showStrongs === "boolean"
        ? candidate.showStrongs
        : DEFAULT_READER_CUSTOMIZATION.showStrongs,
    showEsvInterlinear:
      typeof candidate.showEsvInterlinear === "boolean"
        ? candidate.showEsvInterlinear
        : DEFAULT_READER_CUSTOMIZATION.showEsvInterlinear,
    showEsvGreekOnly:
      typeof candidate.showEsvGreekOnly === "boolean"
        ? candidate.showEsvGreekOnly
        : DEFAULT_READER_CUSTOMIZATION.showEsvGreekOnly,
    greekFontScale:
      typeof candidate.greekFontScale === "number"
        ? clamp(candidate.greekFontScale, GREEK_FONT_SCALE_RANGE.min, GREEK_FONT_SCALE_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.greekFontScale,
    textSize:
      typeof candidate.textSize === "number"
        ? clamp(candidate.textSize, TEXT_SIZE_RANGE.min, TEXT_SIZE_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.textSize,
    lineHeight:
      typeof candidate.lineHeight === "number"
        ? clamp(candidate.lineHeight, LINE_HEIGHT_RANGE.min, LINE_HEIGHT_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.lineHeight,
    contentWidth:
      typeof candidate.contentWidth === "number"
        ? clamp(candidate.contentWidth, CONTENT_WIDTH_RANGE.min, CONTENT_WIDTH_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.contentWidth,
    verseSpacing:
      typeof candidate.verseSpacing === "number"
        ? clamp(candidate.verseSpacing, VERSE_SPACING_RANGE.min, VERSE_SPACING_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.verseSpacing,
    paragraphSpacing:
      typeof candidate.paragraphSpacing === "number"
        ? clamp(
            candidate.paragraphSpacing,
            PARAGRAPH_SPACING_RANGE.min,
            PARAGRAPH_SPACING_RANGE.max
          )
        : DEFAULT_READER_CUSTOMIZATION.paragraphSpacing,
    textAlign: isTextAlignOption(candidate.textAlign)
      ? candidate.textAlign
      : DEFAULT_READER_CUSTOMIZATION.textAlign,
    headerScale:
      typeof candidate.headerScale === "number"
        ? clamp(candidate.headerScale, HEADER_SCALE_RANGE.min, HEADER_SCALE_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.headerScale,
    verseNumberScale:
      typeof candidate.verseNumberScale === "number"
        ? clamp(
            candidate.verseNumberScale,
            VERSE_NUMBER_SCALE_RANGE.min,
            VERSE_NUMBER_SCALE_RANGE.max
          )
        : DEFAULT_READER_CUSTOMIZATION.verseNumberScale,
    letterSpacing:
      typeof candidate.letterSpacing === "number"
        ? clamp(candidate.letterSpacing, LETTER_SPACING_RANGE.min, LETTER_SPACING_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.letterSpacing,
    readingModeContrast:
      typeof candidate.readingModeContrast === "number"
        ? clamp(candidate.readingModeContrast, CONTRAST_RANGE.min, CONTRAST_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.readingModeContrast,
    glowIntensity:
      typeof candidate.glowIntensity === "number"
        ? clamp(candidate.glowIntensity, GLOW_RANGE.min, GLOW_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.glowIntensity,
    backgroundIntensity:
      typeof candidate.backgroundIntensity === "number"
        ? clamp(
            candidate.backgroundIntensity,
            BACKGROUND_INTENSITY_RANGE.min,
            BACKGROUND_INTENSITY_RANGE.max
          )
        : DEFAULT_READER_CUSTOMIZATION.backgroundIntensity,
    surfaceDepth:
      typeof candidate.surfaceDepth === "number"
        ? clamp(candidate.surfaceDepth, SURFACE_DEPTH_RANGE.min, SURFACE_DEPTH_RANGE.max)
        : DEFAULT_READER_CUSTOMIZATION.surfaceDepth
  };
}

export function getReaderCustomizationVariables(
  settings: ReaderCustomizationSettings
): Record<string, string> {
  const presetVariables = getThemePresetVariables(settings.themePreset);
  const glowSpread = Math.round(18 + settings.glowIntensity * 18);
  const glowAlpha = clamp(0.05 + settings.glowIntensity * 0.08, 0.02, 0.24);
  const shellAlpha = clamp(
    settings.backgroundIntensity * (0.7 + settings.surfaceDepth * 0.25),
    0.03,
    0.34
  );
  const surfaceAlpha = clamp(0.78 + settings.surfaceDepth * 0.12, 0.72, 0.96);
  const surfaceStrongAlpha = clamp(0.88 + settings.surfaceDepth * 0.08, 0.82, 0.99);
  const borderAlpha = clamp(
    0.12 + (settings.surfaceDepth - 0.8) * 0.16 + (settings.readingModeContrast - 0.9) * 0.18,
    0.12,
    0.38
  );
  const verseTextAlpha = clamp(0.9 + (settings.readingModeContrast - 1) * 0.5, 0.85, 1);
  const metaTextAlpha = clamp(0.7 + (settings.readingModeContrast - 1) * 0.5, 0.62, 0.95);

  return {
    "--reader-surface": toRgb(presetVariables.surfaceRgb, surfaceAlpha),
    "--reader-surface-strong": toRgb(presetVariables.surfaceStrongRgb, surfaceStrongAlpha),
    "--reader-border": toRgb(presetVariables.borderRgb, borderAlpha),
    "--reader-glow": `0 0 0 1px ${toRgb(
      presetVariables.glowRgb,
      glowAlpha * 0.7
    )}, 0 0 ${glowSpread}px ${toRgb(presetVariables.glowRgb, glowAlpha)}`,
    "--reader-accent": toHex(presetVariables.accentRgb),
    "--reader-accent-rgb": toRgbChannels(presetVariables.accentRgb),
    "--reader-secondary-rgb": toRgbChannels(presetVariables.secondaryRgb),
    "--reader-shell-intensity": `${shellAlpha}`,
    "--reader-verse-text": toRgb(presetVariables.verseTextRgb, verseTextAlpha),
    "--reader-meta-text": toRgb(presetVariables.metaTextRgb, metaTextAlpha),
    "--reader-ui-font": getUiFontValue(settings.uiFont),
    "--reader-body-font": getBodyFontValue(settings.bodyFont),
    "--reader-text-size": `${settings.textSize}rem`,
    "--reader-greek-font-scale": String(settings.greekFontScale),
    "--reader-line-height": String(settings.lineHeight),
    "--reader-content-width": `${settings.contentWidth}rem`,
    "--reader-verse-spacing": `${settings.verseSpacing}rem`,
    "--reader-paragraph-spacing": `${settings.paragraphSpacing}rem`,
    "--reader-text-align": settings.textAlign,
    "--reader-header-scale": String(settings.headerScale),
    "--reader-verse-number-scale": String(settings.verseNumberScale),
    "--reader-letter-spacing": `${settings.letterSpacing}em`,
    "--reader-contrast": String(settings.readingModeContrast),
    "--reader-background-intensity": `${settings.backgroundIntensity}`,
    "--reader-surface-depth": String(settings.surfaceDepth)
  };
}

function getThemePresetVariables(themePreset: ThemePreset): ThemePresetVariables {
  switch (themePreset) {
    case "midnight":
      return {
        surfaceRgb: [8, 16, 29],
        surfaceStrongRgb: [5, 10, 20],
        borderRgb: [139, 173, 219],
        glowRgb: [76, 119, 194],
        accentRgb: [142, 197, 255],
        secondaryRgb: [109, 165, 233],
        verseTextRgb: [237, 244, 255],
        metaTextRgb: [145, 169, 200]
      };
    case "ember":
      return {
        surfaceRgb: [24, 16, 18],
        surfaceStrongRgb: [17, 10, 12],
        borderRgb: [255, 172, 125],
        glowRgb: [255, 111, 72],
        accentRgb: [255, 176, 125],
        secondaryRgb: [255, 162, 87],
        verseTextRgb: [255, 242, 235],
        metaTextRgb: [211, 166, 141]
      };
    case "obsidian":
      return {
        surfaceRgb: [7, 9, 14],
        surfaceStrongRgb: [2, 4, 8],
        borderRgb: [121, 135, 164],
        glowRgb: [94, 111, 154],
        accentRgb: [195, 208, 255],
        secondaryRgb: [123, 136, 178],
        verseTextRgb: [241, 245, 255],
        metaTextRgb: [150, 160, 188]
      };
    case "aurora":
      return {
        surfaceRgb: [7, 20, 22],
        surfaceStrongRgb: [4, 10, 15],
        borderRgb: [95, 235, 218],
        glowRgb: [74, 204, 230],
        accentRgb: [116, 255, 214],
        secondaryRgb: [74, 204, 230],
        verseTextRgb: [234, 255, 250],
        metaTextRgb: [140, 205, 196]
      };
    case "neon":
    default:
      return {
        surfaceRgb: [10, 18, 31],
        surfaceStrongRgb: [4, 9, 18],
        borderRgb: [120, 157, 214],
        glowRgb: [85, 214, 255],
        accentRgb: [85, 214, 255],
        secondaryRgb: [123, 97, 255],
        verseTextRgb: [235, 241, 251],
        metaTextRgb: [138, 160, 191]
      };
  }
}

export function getBodyFontValue(bodyFont: BodyFontOption) {
  switch (bodyFont) {
    case "humanist":
      return '"Inter", "Segoe UI", "Helvetica Neue", sans-serif';
    case "mono":
      return '"SFMono-Regular", "JetBrains Mono", "Menlo", monospace';
    case "serif":
    default:
      return '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
  }
}

export function getUiFontValue(uiFont: UiFontOption) {
  switch (uiFont) {
    case "technical":
      return '"Eurostile", "Avenir Next Condensed", "Segoe UI", sans-serif';
    case "sans":
    default:
      return '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif';
  }
}

function toRgb(rgb: RgbTriplet, alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha.toFixed(3)})`;
}

function toRgbChannels(rgb: RgbTriplet) {
  return `${rgb[0]} ${rgb[1]} ${rgb[2]}`;
}

function toHex(rgb: RgbTriplet) {
  return `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
