import type {
  BodyFontOption,
  SearchCustomizationSettings,
  SearchDensityOption,
  UiFontOption
} from "@/lib/bible/types";
import { getBodyFontValue, getUiFontValue } from "@/lib/reader-customization";

export const SEARCH_CUSTOMIZATION_STORAGE_KEY = "bible-reader:search-customization";

export const DEFAULT_SEARCH_CUSTOMIZATION: SearchCustomizationSettings = {
  textSize: 1.04,
  lineHeight: 1.72,
  bodyFont: "serif",
  uiFont: "sans",
  density: "comfortable"
};

const TEXT_SIZE_RANGE = { min: 0.92, max: 2.25 };
const LINE_HEIGHT_RANGE = { min: 1.25, max: 2.3 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isBodyFontOption(value: unknown): value is BodyFontOption {
  return value === "serif" || value === "humanist" || value === "mono";
}

function isUiFontOption(value: unknown): value is UiFontOption {
  return value === "sans" || value === "technical";
}

function isSearchDensityOption(value: unknown): value is SearchDensityOption {
  return value === "comfortable" || value === "compact";
}

export function normalizeSearchCustomization(value: unknown): SearchCustomizationSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_SEARCH_CUSTOMIZATION;
  }

  const candidate = value as Partial<SearchCustomizationSettings>;

  return {
    textSize:
      typeof candidate.textSize === "number"
        ? clamp(candidate.textSize, TEXT_SIZE_RANGE.min, TEXT_SIZE_RANGE.max)
        : DEFAULT_SEARCH_CUSTOMIZATION.textSize,
    lineHeight:
      typeof candidate.lineHeight === "number"
        ? clamp(candidate.lineHeight, LINE_HEIGHT_RANGE.min, LINE_HEIGHT_RANGE.max)
        : DEFAULT_SEARCH_CUSTOMIZATION.lineHeight,
    bodyFont: isBodyFontOption(candidate.bodyFont)
      ? candidate.bodyFont
      : DEFAULT_SEARCH_CUSTOMIZATION.bodyFont,
    uiFont: isUiFontOption(candidate.uiFont)
      ? candidate.uiFont
      : DEFAULT_SEARCH_CUSTOMIZATION.uiFont,
    density: isSearchDensityOption(candidate.density)
      ? candidate.density
      : DEFAULT_SEARCH_CUSTOMIZATION.density
  };
}

export function getSearchCustomizationVariables(
  settings: SearchCustomizationSettings
): Record<string, string> {
  const isCompact = settings.density === "compact";

  return {
    "--search-ui-font": getUiFontValue(settings.uiFont),
    "--search-body-font": getBodyFontValue(settings.bodyFont),
    "--search-text-size": `${settings.textSize}rem`,
    "--search-line-height": String(settings.lineHeight),
    "--search-density": settings.density,
    "--search-density-gap": isCompact ? "0.72rem" : "1rem",
    "--search-density-tight-gap": isCompact ? "0.48rem" : "0.72rem",
    "--search-density-card-padding": isCompact ? "0.78rem" : "0.96rem",
    "--search-density-group-padding": isCompact ? "0.82rem" : "0.98rem",
    "--search-density-header-gap": isCompact ? "0.72rem" : "1rem",
    "--search-density-header-margin": isCompact ? "0.82rem" : "1rem",
    "--search-density-input-padding-y": isCompact ? "0.68rem" : "0.82rem",
    "--search-density-input-padding-x": isCompact ? "0.82rem" : "0.9rem"
  };
}
