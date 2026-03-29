"use client";

import type { SearchMode } from "@/lib/bible/types";

const SEARCH_MODE_OPTIONS: Array<{
  label: string;
  value: SearchMode;
}> = [
  {
    label: "Lookup",
    value: "lookup"
  },
  {
    label: "Ask AI",
    value: "ai"
  }
];

type SearchModeToggleProps = {
  searchMode: SearchMode;
  onChange: (value: SearchMode) => void;
};

export function SearchModeToggle({ searchMode, onChange }: SearchModeToggleProps) {
  return (
    <div aria-label="Search mode" className="search-match-mode-toggle" role="group">
      {SEARCH_MODE_OPTIONS.map((option) => (
        <button
          aria-pressed={searchMode === option.value}
          className={`search-match-mode-option${
            searchMode === option.value ? " search-match-mode-option-active" : ""
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
