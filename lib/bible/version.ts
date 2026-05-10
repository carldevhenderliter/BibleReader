import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import installedBundledVersionsSource from "@/data/bible/installed-versions.json";
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

export const BIBLE_VERSIONS = [
  "web",
  "kjv",
  "nlt",
  "esv",
  "greek",
  "tr"
] as const satisfies readonly BibleVersion[];
export const BUNDLED_BIBLE_VERSIONS = [
  "web",
  "kjv",
  "nlt",
  "esv",
  "greek",
  "tr"
] as const satisfies readonly BundledBibleVersion[];

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
  nlt: {
    id: "nlt",
    label: "NLT",
    badge: "New Living",
    description: "Optional local import. Whole-book support without Strongs tagging.",
    supportsWholeBook: true
  },
  esv: {
    id: "esv",
    label: "ESV",
    badge: "English Standard",
    description: "Bundled locally from mdbible with whole-book support.",
    supportsWholeBook: true
  },
  greek: {
    id: "greek",
    label: "Greek",
    badge: "Rahlfs LXX + SBLGNT",
    description: "Bundled locally. Standalone Greek OT and NT reading text with dictionary lookup.",
    supportsWholeBook: true
  },
  tr: {
    id: "tr",
    label: "TR",
    badge: "Textus Receptus",
    description: "Bundled locally. Public-domain Greek New Testament with Strong’s-linked morphology.",
    supportsWholeBook: true
  }
};

const INSTALLED_BUNDLED_BIBLE_VERSIONS = BUNDLED_BIBLE_VERSIONS.filter((version) =>
  (installedBundledVersionsSource as string[]).includes(version)
);

export function isBibleVersion(value: unknown): value is BibleVersion {
  return typeof value === "string" && BIBLE_VERSIONS.includes(value as BibleVersion);
}

export function isBundledBibleVersion(value: unknown): value is BundledBibleVersion {
  return typeof value === "string" && BUNDLED_BIBLE_VERSIONS.includes(value as BundledBibleVersion);
}

export function getInstalledBundledBibleVersions(): readonly BundledBibleVersion[] {
  return INSTALLED_BUNDLED_BIBLE_VERSIONS;
}

export function isInstalledBundledBibleVersion(value: unknown): value is BundledBibleVersion {
  return (
    typeof value === "string" &&
    INSTALLED_BUNDLED_BIBLE_VERSIONS.includes(value as BundledBibleVersion)
  );
}

export function getBibleVersionOptions(): BibleVersionOption[] {
  return BIBLE_VERSIONS.map((version) => ({
    id: version,
    label: BIBLE_VERSION_METADATA[version].label,
    description: BIBLE_VERSION_METADATA[version].description,
    supportsWholeBook: BIBLE_VERSION_METADATA[version].supportsWholeBook,
    disabled: false
  })).filter((option) => isInstalledBundledBibleVersion(option.id));
}

export function getBibleVersionLabel(version: BibleVersion): string {
  return BIBLE_VERSION_METADATA[version].label;
}

export function getBibleVersionSelectionLabel(
  versions: readonly BundledBibleVersion[]
): string {
  const normalizedVersions = versions.filter(isInstalledBundledBibleVersion);

  if (normalizedVersions.length === 0) {
    return getBibleVersionLabel(DEFAULT_BIBLE_VERSION);
  }

  if (normalizedVersions.length === INSTALLED_BUNDLED_BIBLE_VERSIONS.length) {
    return "All Versions";
  }

  const labels = normalizedVersions.map((version) => getBibleVersionLabel(version));

  if (labels.length <= 3) {
    return labels.join(" + ");
  }

  return `${labels.slice(0, 2).join(" + ")} + ${labels.length - 2} more`;
}

export function getBibleVersionBadge(version: BibleVersion): string {
  return BIBLE_VERSION_METADATA[version].badge;
}

export function getAlternateBundledVersion(
  currentVersion: BundledBibleVersion,
  preferredVersion: BundledBibleVersion,
  installedVersions: readonly BundledBibleVersion[] = INSTALLED_BUNDLED_BIBLE_VERSIONS
): BundledBibleVersion | null {
  const availableVersions = installedVersions.filter((version) => version !== currentVersion);

  if (availableVersions.length === 0) {
    return null;
  }

  if (preferredVersion !== currentVersion && availableVersions.includes(preferredVersion)) {
    return preferredVersion;
  }

  return (
    availableVersions.find((version) => version === "web") ??
    availableVersions.find((version) => version === "esv") ??
    availableVersions.find((version) => version === "kjv") ??
    availableVersions[0] ??
    null
  );
}

export function resolveBibleVersion(value: unknown): BibleVersion | null {
  if (value == null || value === "") {
    return DEFAULT_BIBLE_VERSION;
  }

  if (!isBibleVersion(value)) {
    return null;
  }

  if (isBundledBibleVersion(value) && !isInstalledBundledBibleVersion(value)) {
    return null;
  }

  return value;
}

export function normalizeBibleVersion(value: unknown): BibleVersion {
  return resolveBibleVersion(value) ?? DEFAULT_BIBLE_VERSION;
}
