import type { BodyFontOption } from "@/lib/bible/types";

export type NotebookSurfaceStyle = "soft" | "paper" | "minimal";
export type NotebookWidthOption = "full" | "focused";

export type NotebookCustomizationSettings = {
  bodyFont: BodyFontOption;
  textSize: number;
  lineHeight: number;
  width: NotebookWidthOption;
  surfaceStyle: NotebookSurfaceStyle;
};

export const NOTEBOOK_CUSTOMIZATION_STORAGE_KEY = "bible-reader:notebook-customization";

export const DEFAULT_NOTEBOOK_CUSTOMIZATION: NotebookCustomizationSettings = {
  bodyFont: "serif",
  textSize: 1.02,
  lineHeight: 1.72,
  width: "full",
  surfaceStyle: "soft"
};

const TEXT_SIZE_RANGE = { min: 0.92, max: 1.6 };
const LINE_HEIGHT_RANGE = { min: 1.4, max: 2.2 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isBodyFontOption(value: unknown): value is BodyFontOption {
  return value === "serif" || value === "humanist" || value === "mono";
}

function isNotebookWidthOption(value: unknown): value is NotebookWidthOption {
  return value === "full" || value === "focused";
}

function isNotebookSurfaceStyle(value: unknown): value is NotebookSurfaceStyle {
  return value === "soft" || value === "paper" || value === "minimal";
}

export function normalizeNotebookCustomization(value: unknown): NotebookCustomizationSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_NOTEBOOK_CUSTOMIZATION;
  }

  const candidate = value as Partial<NotebookCustomizationSettings>;

  return {
    bodyFont: isBodyFontOption(candidate.bodyFont)
      ? candidate.bodyFont
      : DEFAULT_NOTEBOOK_CUSTOMIZATION.bodyFont,
    textSize:
      typeof candidate.textSize === "number"
        ? clamp(candidate.textSize, TEXT_SIZE_RANGE.min, TEXT_SIZE_RANGE.max)
        : DEFAULT_NOTEBOOK_CUSTOMIZATION.textSize,
    lineHeight:
      typeof candidate.lineHeight === "number"
        ? clamp(candidate.lineHeight, LINE_HEIGHT_RANGE.min, LINE_HEIGHT_RANGE.max)
        : DEFAULT_NOTEBOOK_CUSTOMIZATION.lineHeight,
    width: isNotebookWidthOption(candidate.width)
      ? candidate.width
      : DEFAULT_NOTEBOOK_CUSTOMIZATION.width,
    surfaceStyle: isNotebookSurfaceStyle(candidate.surfaceStyle)
      ? candidate.surfaceStyle
      : DEFAULT_NOTEBOOK_CUSTOMIZATION.surfaceStyle
  };
}
