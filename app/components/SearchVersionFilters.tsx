"use client";

import { useMemo } from "react";

import { useLookup } from "@/app/components/LookupProvider";
import type { BundledBibleVersion } from "@/lib/bible/types";
import {
  getBibleVersionLabel,
  getInstalledBundledBibleVersions
} from "@/lib/bible/version";

function getNextSelectedVersions(
  selectedVersions: readonly BundledBibleVersion[],
  toggledVersion: BundledBibleVersion
) {
  if (selectedVersions.includes(toggledVersion)) {
    if (selectedVersions.length === 1) {
      return selectedVersions;
    }

    return selectedVersions.filter((version) => version !== toggledVersion);
  }

  return [...selectedVersions, toggledVersion];
}

export function SearchVersionFilters() {
  const { searchVersions, setSearchVersions } = useLookup();
  const installedVersions = useMemo(() => getInstalledBundledBibleVersions(), []);

  return (
    <div
      aria-label="Search versions"
      className="search-version-filters"
      role="group"
    >
      {installedVersions.map((version) => {
        const isSelected = searchVersions.includes(version);

        return (
          <button
            aria-pressed={isSelected}
            className={`search-version-filter${isSelected ? " search-version-filter-active" : ""}`}
            key={version}
            onClick={() =>
              setSearchVersions(getNextSelectedVersions(searchVersions, version))
            }
            type="button"
          >
            {getBibleVersionLabel(version)}
          </button>
        );
      })}
    </div>
  );
}
