import type {
  BodyFontOption,
  GreekFontOption,
  HebrewFontOption,
  ReaderPreset,
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
    id: "literary",
    name: "Literary Serif",
    description: "Warmer book-page rhythm with softer strokes."
  },
  {
    id: "transitional",
    name: "Transitional Serif",
    description: "Sharper contrast for a more formal printed feel."
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

export const GREEK_FONT_OPTIONS = [
  {
    id: "classic",
    name: "Classical Serif",
    description: "A traditional Greek reading face with a familiar liturgical feel."
  },
  {
    id: "scholarly",
    name: "Scholarly Serif",
    description: "A denser academic stack for extended lexical work."
  },
  {
    id: "modern",
    name: "Modern Sans",
    description: "Cleaner Greek forms for tighter token-based study layouts."
  }
] satisfies Array<{ id: GreekFontOption; name: string; description: string }>;

export const HEBREW_FONT_OPTIONS = [
  {
    id: "square",
    name: "Square Hebrew",
    description: "A traditional square-script reading stack for Hebrew text."
  },
  {
    id: "serif",
    name: "Hebrew Serif",
    description: "A softer serif stack for sustained Hebrew reading."
  },
  {
    id: "sans",
    name: "Hebrew Sans",
    description: "A clearer modern sans stack for dense compare panes."
  }
] satisfies Array<{ id: HebrewFontOption; name: string; description: string }>;

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
  readerPreset: "reading",
  focusReadingMode: false,
  themePreset: "neon",
  bodyFont: "serif",
  greekFont: "classic",
  hebrewFont: "square",
  companionVerseFont: "serif",
  customVerseFont: "serif",
  uiFont: "sans",
  showStrongs: false,
  showVerseStrongs: true,
  showEsvInterlinear: false,
  showEsvGreekOnly: false,
  showVerseNumbers: true,
  showChapterHeadings: true,
  showVerseText: true,
  showCompanionVerseTranslation: true,
  showSecondaryVerseTranslation: false,
  secondaryVerseTranslationVersion: "web",
  secondaryVerseTranslationVersions: [],
  showAnnotatedGreekUndertext: true,
  showGreekSurface: true,
  showGreekLemma: true,
  showGreekTransliteration: true,
  showGreekMorphology: true,
  showGreekGloss: true,
  showGreekGrammarCards: false,
  showExpandedGreekGrammarCards: false,
  showCustomVerseTranslation: true,
  showFathersSentenceLines: false,
  disableLazyLoading: false,
  bodyTextSize: 1.08,
  strongsVerseTextSize: 1.02,
  thayerTextSize: 0.98,
  greekTextSize: 1.55,
  hebrewTextSize: 1.55,
  companionVerseTextSize: 1.04,
  customVerseTextSize: 1.08,
  lineHeight: 1.95,
  firstLineIndent: 0,
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

const BODY_TEXT_SIZE_RANGE = { min: 0.8, max: 3.25 };
const STRONGS_TEXT_SIZE_RANGE = { min: 0.72, max: 3.25 };
const THAYER_TEXT_SIZE_RANGE = { min: 0.72, max: 3.25 };
const SCRIPT_TEXT_SIZE_RANGE = { min: 0.9, max: 4 };
const COMPANION_TEXT_SIZE_RANGE = { min: 0.72, max: 3 };
const CUSTOM_TEXT_SIZE_RANGE = { min: 0.72, max: 3.25 };
const HEADER_SCALE_RANGE = { min: 0.85, max: 1.3 };
const VERSE_NUMBER_SCALE_RANGE = { min: 0.75, max: 1.6 };
const LETTER_SPACING_RANGE = { min: -0.01, max: 0.04 };
const CONTRAST_RANGE = { min: 0.9, max: 1.25 };
const GLOW_RANGE = { min: 0, max: 1.8 };
const BACKGROUND_INTENSITY_RANGE = { min: 0.03, max: 0.3 };
const SURFACE_DEPTH_RANGE = { min: 0.8, max: 1.3 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function roundToHundredths(value: number) {
  return Number(value.toFixed(2));
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
  return (
    value === "serif" ||
    value === "literary" ||
    value === "transitional" ||
    value === "humanist" ||
    value === "mono"
  );
}

function isGreekFontOption(value: unknown): value is GreekFontOption {
  return value === "classic" || value === "scholarly" || value === "modern";
}

function isHebrewFontOption(value: unknown): value is HebrewFontOption {
  return value === "square" || value === "serif" || value === "sans";
}

function isUiFontOption(value: unknown): value is UiFontOption {
  return value === "sans" || value === "technical";
}

function isTextAlignOption(value: unknown): value is TextAlignOption {
  return value === "left" || value === "justify";
}

function isReaderPreset(value: unknown): value is ReaderPreset {
  return value === "reading" || value === "study" || value === "audio" || value === "custom";
}

function isBundledBibleVersionOption(value: unknown): value is ReaderCustomizationSettings["secondaryVerseTranslationVersion"] {
  return (
    value === "web" ||
    value === "kjv" ||
    value === "nlt" ||
    value === "esv" ||
    value === "greek" ||
    value === "tr"
  );
}

function normalizeBundledBibleVersionOptions(
  value: unknown
): ReaderCustomizationSettings["secondaryVerseTranslationVersions"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter(isBundledBibleVersionOption))
  );
}

export function normalizeReaderCustomization(value: unknown): ReaderCustomizationSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_READER_CUSTOMIZATION;
  }

  const candidate = value as Partial<ReaderCustomizationSettings> & {
    greekFontScale?: number;
    textSize?: number;
  };
  const hasGranularVerseText = typeof candidate.showVerseText === "boolean";
  const hasGranularCompanionVerseTranslation =
    typeof candidate.showCompanionVerseTranslation === "boolean";
  const hasGranularGreekSurface = typeof candidate.showGreekSurface === "boolean";
  const hasGranularGreekLemma = typeof candidate.showGreekLemma === "boolean";
  const hasGranularGreekTransliteration =
    typeof candidate.showGreekTransliteration === "boolean";
  const hasGranularGreekMorphology = typeof candidate.showGreekMorphology === "boolean";
  const hasGranularGreekGloss = typeof candidate.showGreekGloss === "boolean";
  const hasGranularGreekGrammarCards =
    typeof candidate.showGreekGrammarCards === "boolean";
  const hasGranularExpandedGreekGrammarCards =
    typeof candidate.showExpandedGreekGrammarCards === "boolean";
  const hasGranularCustomVerseTranslation =
    typeof candidate.showCustomVerseTranslation === "boolean";
  const normalizedBodyFont = isBodyFontOption(candidate.bodyFont)
    ? candidate.bodyFont
    : DEFAULT_READER_CUSTOMIZATION.bodyFont;
  const normalizedBodyTextSize = clampNumber(
    candidate.bodyTextSize ?? candidate.textSize,
    BODY_TEXT_SIZE_RANGE.min,
    BODY_TEXT_SIZE_RANGE.max,
    DEFAULT_READER_CUSTOMIZATION.bodyTextSize
  );
  const normalizedStrongsVerseTextSize = clampNumber(
    candidate.strongsVerseTextSize,
    STRONGS_TEXT_SIZE_RANGE.min,
    STRONGS_TEXT_SIZE_RANGE.max,
    DEFAULT_READER_CUSTOMIZATION.strongsVerseTextSize
  );
  const normalizedThayerTextSize = clampNumber(
    candidate.thayerTextSize,
    THAYER_TEXT_SIZE_RANGE.min,
    THAYER_TEXT_SIZE_RANGE.max,
    DEFAULT_READER_CUSTOMIZATION.thayerTextSize
  );
  const normalizedGreekTextSize = clampNumber(
    candidate.greekTextSize ?? candidate.greekFontScale,
    SCRIPT_TEXT_SIZE_RANGE.min,
    SCRIPT_TEXT_SIZE_RANGE.max,
    DEFAULT_READER_CUSTOMIZATION.greekTextSize
  );
  const normalizedHebrewTextSize = clampNumber(
    candidate.hebrewTextSize ?? candidate.greekFontScale,
    SCRIPT_TEXT_SIZE_RANGE.min,
    SCRIPT_TEXT_SIZE_RANGE.max,
    DEFAULT_READER_CUSTOMIZATION.hebrewTextSize
  );
  const shouldDeriveCompanionSizeFromLegacyBody =
    typeof candidate.companionVerseTextSize !== "number" &&
    (typeof candidate.bodyTextSize === "number" || typeof candidate.textSize === "number");
  const shouldDeriveCustomSizeFromLegacyBody =
    typeof candidate.customVerseTextSize !== "number" &&
    (typeof candidate.bodyTextSize === "number" || typeof candidate.textSize === "number");

  return {
    readerPreset: isReaderPreset(candidate.readerPreset)
      ? candidate.readerPreset
      : DEFAULT_READER_CUSTOMIZATION.readerPreset,
    focusReadingMode:
      typeof candidate.focusReadingMode === "boolean"
        ? candidate.focusReadingMode
        : DEFAULT_READER_CUSTOMIZATION.focusReadingMode,
    themePreset: isThemePreset(candidate.themePreset)
      ? candidate.themePreset
      : DEFAULT_READER_CUSTOMIZATION.themePreset,
    bodyFont: normalizedBodyFont,
    greekFont: isGreekFontOption(candidate.greekFont)
      ? candidate.greekFont
      : DEFAULT_READER_CUSTOMIZATION.greekFont,
    hebrewFont: isHebrewFontOption(candidate.hebrewFont)
      ? candidate.hebrewFont
      : DEFAULT_READER_CUSTOMIZATION.hebrewFont,
    companionVerseFont: isBodyFontOption(candidate.companionVerseFont)
      ? candidate.companionVerseFont
      : normalizedBodyFont,
    customVerseFont: isBodyFontOption(candidate.customVerseFont)
      ? candidate.customVerseFont
      : normalizedBodyFont,
    uiFont: isUiFontOption(candidate.uiFont)
      ? candidate.uiFont
      : DEFAULT_READER_CUSTOMIZATION.uiFont,
    showStrongs:
      typeof candidate.showStrongs === "boolean"
        ? candidate.showStrongs
        : DEFAULT_READER_CUSTOMIZATION.showStrongs,
    showVerseStrongs:
      typeof candidate.showVerseStrongs === "boolean"
        ? candidate.showVerseStrongs
        : DEFAULT_READER_CUSTOMIZATION.showVerseStrongs,
    showEsvInterlinear:
      typeof candidate.showEsvInterlinear === "boolean"
        ? candidate.showEsvInterlinear
        : DEFAULT_READER_CUSTOMIZATION.showEsvInterlinear,
    showEsvGreekOnly:
      typeof candidate.showEsvGreekOnly === "boolean"
        ? candidate.showEsvGreekOnly
        : DEFAULT_READER_CUSTOMIZATION.showEsvGreekOnly,
    showVerseNumbers:
      typeof candidate.showVerseNumbers === "boolean"
        ? candidate.showVerseNumbers
        : DEFAULT_READER_CUSTOMIZATION.showVerseNumbers,
    showChapterHeadings:
      typeof candidate.showChapterHeadings === "boolean"
        ? candidate.showChapterHeadings
        : DEFAULT_READER_CUSTOMIZATION.showChapterHeadings,
    showVerseText:
      typeof candidate.showVerseText === "boolean"
        ? candidate.showVerseText
        : candidate.showEsvGreekOnly === true
          ? false
          : DEFAULT_READER_CUSTOMIZATION.showVerseText,
    showCompanionVerseTranslation:
      typeof candidate.showCompanionVerseTranslation === "boolean"
        ? candidate.showCompanionVerseTranslation
        : candidate.showEsvGreekOnly === true &&
            !hasGranularVerseText &&
            !hasGranularCompanionVerseTranslation &&
            !hasGranularGreekSurface &&
            !hasGranularGreekLemma &&
            !hasGranularGreekTransliteration &&
            !hasGranularGreekMorphology &&
            !hasGranularGreekGloss &&
            !hasGranularCustomVerseTranslation
          ? false
          : DEFAULT_READER_CUSTOMIZATION.showCompanionVerseTranslation,
    showSecondaryVerseTranslation:
      typeof candidate.showSecondaryVerseTranslation === "boolean"
        ? candidate.showSecondaryVerseTranslation
        : DEFAULT_READER_CUSTOMIZATION.showSecondaryVerseTranslation,
    secondaryVerseTranslationVersion: isBundledBibleVersionOption(
      candidate.secondaryVerseTranslationVersion
    )
      ? candidate.secondaryVerseTranslationVersion
      : DEFAULT_READER_CUSTOMIZATION.secondaryVerseTranslationVersion,
    secondaryVerseTranslationVersions:
      normalizeBundledBibleVersionOptions(candidate.secondaryVerseTranslationVersions).length > 0
        ? normalizeBundledBibleVersionOptions(candidate.secondaryVerseTranslationVersions)
        : isBundledBibleVersionOption(candidate.secondaryVerseTranslationVersion)
          ? [candidate.secondaryVerseTranslationVersion]
          : DEFAULT_READER_CUSTOMIZATION.secondaryVerseTranslationVersions,
    showAnnotatedGreekUndertext:
      typeof candidate.showAnnotatedGreekUndertext === "boolean"
        ? candidate.showAnnotatedGreekUndertext
        : DEFAULT_READER_CUSTOMIZATION.showAnnotatedGreekUndertext,
    showGreekSurface:
      typeof candidate.showGreekSurface === "boolean"
        ? candidate.showGreekSurface
        : DEFAULT_READER_CUSTOMIZATION.showGreekSurface,
    showGreekLemma:
      typeof candidate.showGreekLemma === "boolean"
        ? candidate.showGreekLemma
        : DEFAULT_READER_CUSTOMIZATION.showGreekLemma,
    showGreekTransliteration:
      typeof candidate.showGreekTransliteration === "boolean"
        ? candidate.showGreekTransliteration
        : DEFAULT_READER_CUSTOMIZATION.showGreekTransliteration,
    showGreekMorphology:
      typeof candidate.showGreekMorphology === "boolean"
        ? candidate.showGreekMorphology
        : DEFAULT_READER_CUSTOMIZATION.showGreekMorphology,
    showGreekGloss:
      typeof candidate.showGreekGloss === "boolean"
        ? candidate.showGreekGloss
        : DEFAULT_READER_CUSTOMIZATION.showGreekGloss,
    showGreekGrammarCards:
      typeof candidate.showGreekGrammarCards === "boolean"
        ? candidate.showGreekGrammarCards
        : DEFAULT_READER_CUSTOMIZATION.showGreekGrammarCards,
    showExpandedGreekGrammarCards:
      typeof candidate.showExpandedGreekGrammarCards === "boolean"
        ? candidate.showExpandedGreekGrammarCards
        : DEFAULT_READER_CUSTOMIZATION.showExpandedGreekGrammarCards,
    showCustomVerseTranslation:
      typeof candidate.showCustomVerseTranslation === "boolean"
        ? candidate.showCustomVerseTranslation
        : candidate.showEsvGreekOnly === true &&
            !hasGranularVerseText &&
            !hasGranularGreekSurface &&
            !hasGranularGreekLemma &&
            !hasGranularGreekTransliteration &&
            !hasGranularGreekMorphology &&
            !hasGranularGreekGloss &&
            !hasGranularGreekGrammarCards &&
            !hasGranularExpandedGreekGrammarCards &&
            !hasGranularCustomVerseTranslation
          ? false
          : DEFAULT_READER_CUSTOMIZATION.showCustomVerseTranslation,
    showFathersSentenceLines:
      typeof candidate.showFathersSentenceLines === "boolean"
        ? candidate.showFathersSentenceLines
        : DEFAULT_READER_CUSTOMIZATION.showFathersSentenceLines,
    disableLazyLoading:
      typeof candidate.disableLazyLoading === "boolean"
        ? candidate.disableLazyLoading
        : DEFAULT_READER_CUSTOMIZATION.disableLazyLoading,
    bodyTextSize: normalizedBodyTextSize,
    strongsVerseTextSize: normalizedStrongsVerseTextSize,
    thayerTextSize: normalizedThayerTextSize,
    greekTextSize: normalizedGreekTextSize,
    hebrewTextSize: normalizedHebrewTextSize,
    companionVerseTextSize: clampNumber(
      candidate.companionVerseTextSize,
      COMPANION_TEXT_SIZE_RANGE.min,
      COMPANION_TEXT_SIZE_RANGE.max,
      shouldDeriveCompanionSizeFromLegacyBody
        ? clamp(
            roundToHundredths(normalizedBodyTextSize * 0.96),
            COMPANION_TEXT_SIZE_RANGE.min,
            COMPANION_TEXT_SIZE_RANGE.max
          )
        : DEFAULT_READER_CUSTOMIZATION.companionVerseTextSize
    ),
    customVerseTextSize: clampNumber(
      candidate.customVerseTextSize,
      CUSTOM_TEXT_SIZE_RANGE.min,
      CUSTOM_TEXT_SIZE_RANGE.max,
      shouldDeriveCustomSizeFromLegacyBody
        ? clamp(
            roundToHundredths(normalizedBodyTextSize),
            CUSTOM_TEXT_SIZE_RANGE.min,
            CUSTOM_TEXT_SIZE_RANGE.max
          )
        : DEFAULT_READER_CUSTOMIZATION.customVerseTextSize
    ),
    lineHeight: normalizeFiniteNumber(
      candidate.lineHeight,
      DEFAULT_READER_CUSTOMIZATION.lineHeight
    ),
    firstLineIndent: normalizeFiniteNumber(
      candidate.firstLineIndent,
      DEFAULT_READER_CUSTOMIZATION.firstLineIndent
    ),
    contentWidth: normalizeFiniteNumber(
      candidate.contentWidth,
      DEFAULT_READER_CUSTOMIZATION.contentWidth
    ),
    verseSpacing: normalizeFiniteNumber(
      candidate.verseSpacing,
      DEFAULT_READER_CUSTOMIZATION.verseSpacing
    ),
    paragraphSpacing: normalizeFiniteNumber(
      candidate.paragraphSpacing,
      DEFAULT_READER_CUSTOMIZATION.paragraphSpacing
    ),
    textAlign: isTextAlignOption(candidate.textAlign)
      ? candidate.textAlign
      : DEFAULT_READER_CUSTOMIZATION.textAlign,
    headerScale: clampNumber(
      candidate.headerScale,
      HEADER_SCALE_RANGE.min,
      HEADER_SCALE_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.headerScale
    ),
    verseNumberScale: clampNumber(
      candidate.verseNumberScale,
      VERSE_NUMBER_SCALE_RANGE.min,
      VERSE_NUMBER_SCALE_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.verseNumberScale
    ),
    letterSpacing: clampNumber(
      candidate.letterSpacing,
      LETTER_SPACING_RANGE.min,
      LETTER_SPACING_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.letterSpacing
    ),
    readingModeContrast: clampNumber(
      candidate.readingModeContrast,
      CONTRAST_RANGE.min,
      CONTRAST_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.readingModeContrast
    ),
    glowIntensity: clampNumber(
      candidate.glowIntensity,
      GLOW_RANGE.min,
      GLOW_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.glowIntensity
    ),
    backgroundIntensity: clampNumber(
      candidate.backgroundIntensity,
      BACKGROUND_INTENSITY_RANGE.min,
      BACKGROUND_INTENSITY_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.backgroundIntensity
    ),
    surfaceDepth: clampNumber(
      candidate.surfaceDepth,
      SURFACE_DEPTH_RANGE.min,
      SURFACE_DEPTH_RANGE.max,
      DEFAULT_READER_CUSTOMIZATION.surfaceDepth
    )
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
    "--reader-greek-font": getGreekFontValue(settings.greekFont),
    "--reader-hebrew-font": getHebrewFontValue(settings.hebrewFont),
    "--reader-companion-font": getBodyFontValue(settings.companionVerseFont),
    "--reader-custom-font": getBodyFontValue(settings.customVerseFont),
    "--reader-body-text-size": `${settings.bodyTextSize}rem`,
    "--reader-strongs-verse-text-size": `${settings.strongsVerseTextSize}rem`,
    "--reader-thayer-text-size": `${settings.thayerTextSize}rem`,
    "--reader-greek-text-size": `${settings.greekTextSize}rem`,
    "--reader-hebrew-text-size": `${settings.hebrewTextSize}rem`,
    "--reader-companion-text-size": `${settings.companionVerseTextSize}rem`,
    "--reader-custom-text-size": `${settings.customVerseTextSize}rem`,
    "--reader-text-size": `${settings.bodyTextSize}rem`,
    "--reader-greek-font-scale": String(settings.greekTextSize),
    "--reader-line-height": String(settings.lineHeight),
    "--reader-first-line-indent": `${settings.firstLineIndent}rem`,
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
    case "literary":
      return '"Baskerville", "Garamond", "Times New Roman", serif';
    case "transitional":
      return '"Charter", "Cambria", "Times New Roman", serif';
    case "humanist":
      return '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
    case "mono":
      return '"SFMono-Regular", "JetBrains Mono", "Menlo", monospace';
    case "serif":
    default:
      return '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif';
  }
}

export function getGreekFontValue(greekFont: GreekFontOption) {
  switch (greekFont) {
    case "scholarly":
      return '"Times New Roman", "Palatino Linotype", "Georgia", serif';
    case "modern":
      return '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
    case "classic":
    default:
      return '"Palatino Linotype", "Times New Roman", "Georgia", serif';
  }
}

export function getHebrewFontValue(hebrewFont: HebrewFontOption) {
  switch (hebrewFont) {
    case "serif":
      return '"Times New Roman", "Noto Serif Hebrew", serif';
    case "sans":
      return '"Arial Hebrew", Arial, "Noto Sans Hebrew", sans-serif';
    case "square":
    default:
      return '"SBL Hebrew", "Times New Roman", serif';
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
