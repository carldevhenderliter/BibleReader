"use client";

import type { SearchMatchMode } from "@/lib/bible/types";

type SearchMatchModeToggleProps = {
  matchMode: SearchMatchMode;
  onChange: (value: SearchMatchMode) => void;
};

const SEARCH_MATCH_MODE_OPTIONS: Array<{
  label: string;
  value: SearchMatchMode;
}> = [
  {
    label: "Partial",
    value: "partial"
  },
  {
    label: "Complete",
    value: "complete"
  }
];

export function SearchMatchModeToggle({
  matchMode,
  onChange
}: SearchMatchModeToggleProps) {
  return (
    <div
      aria-label="Search match mode"
      className="search-match-mode-toggle"
      role="group"
    >
      {SEARCH_MATCH_MODE_OPTIONS.map((option) => (
        <button
          aria-pressed={matchMode === option.value}
          className={`search-match-mode-option${
            matchMode === option.value ? " search-match-mode-option-active" : ""
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
