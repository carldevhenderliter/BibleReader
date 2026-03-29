"use client";

type SearchStrongsToggleProps = {
  isEnabled: boolean;
  onChange: (value: boolean) => void;
};

export function SearchStrongsToggle({
  isEnabled,
  onChange
}: SearchStrongsToggleProps) {
  return (
    <button
      aria-pressed={isEnabled}
      className={`search-strongs-toggle${isEnabled ? " search-strongs-toggle-active" : ""}`}
      onClick={() => onChange(!isEnabled)}
      type="button"
    >
      Show Strongs
    </button>
  );
}
