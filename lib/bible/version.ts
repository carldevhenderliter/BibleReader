import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type { BibleVersion, BundledBibleVersion } from "@/lib/bible/types";

export type BibleVersionOption = {
  id: BibleVersion;
  label: string;
  description: string;
  supportsWholeBook: boolean;
  disabled: boolean;
};

type BibleVersionMetadata = Omit<BibleVersionOption, "disabled"> & {
  badge: string;
};

export const BIBLE_VERSIONS = ["web", "kjv", "esv"] as const satisfies readonly BibleVersion[];
export const BUNDLED_BIBLE_VERSIONS = ["web", "kjv"] as const satisfies readonly BundledBibleVersion[];

export const BIBLE_VERSION_METADATA: Record<BibleVersion, BibleVersionMetadata> = {
  web: {
    id: "web",
    label: "WEB",
    badge: "World English",
    description: "Bundled locally. Clean default translation with whole-book support.",
    supportsWholeBook: true
  },
  kjv: {
    id: "kjv",
    label: "KJV",
    badge: "King James",
    description: "Bundled locally. Classic 1769 public-domain text with whole-book support.",
    supportsWholeBook: true
  },
  esv: {
    id: "esv",
    label: "ESV",
    badge: "Crossway API",
    description: "Chapter mode only. Requires an ESV API key on the server.",
    supportsWholeBook: false
  }
};

export function isBibleVersion(value: unknown): value is BibleVersion {
  return typeof value === "string" && BIBLE_VERSIONS.includes(value as BibleVersion);
}

export function isBundledBibleVersion(value: unknown): value is BundledBibleVersion {
  return typeof value === "string" && BUNDLED_BIBLE_VERSIONS.includes(value as BundledBibleVersion);
}

export function getBibleVersionOptions(esvEnabled: boolean): BibleVersionOption[] {
  return BIBLE_VERSIONS.map((version) => ({
    id: version,
    label: BIBLE_VERSION_METADATA[version].label,
    description: BIBLE_VERSION_METADATA[version].description,
    supportsWholeBook: BIBLE_VERSION_METADATA[version].supportsWholeBook,
    disabled: version === "esv" && !esvEnabled
  }));
}

export function getBibleVersionLabel(version: BibleVersion): string {
  return BIBLE_VERSION_METADATA[version].label;
}

export function getBibleVersionBadge(version: BibleVersion): string {
  return BIBLE_VERSION_METADATA[version].badge;
}

export function resolveBibleVersion(
  value: unknown,
  options: { esvEnabled: boolean }
): BibleVersion | null {
  if (value == null || value === "") {
    return DEFAULT_BIBLE_VERSION;
  }

  if (!isBibleVersion(value)) {
    return null;
  }

  if (value === "esv" && !options.esvEnabled) {
    return null;
  }

  return value;
}

export function normalizeBibleVersion(
  value: unknown,
  options: { esvEnabled: boolean }
): BibleVersion {
  return resolveBibleVersion(value, options) ?? DEFAULT_BIBLE_VERSION;
}
