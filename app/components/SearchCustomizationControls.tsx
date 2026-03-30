"use client";

import { BODY_FONT_OPTIONS, UI_FONT_OPTIONS } from "@/lib/reader-customization";
import { useSearchCustomization } from "@/app/components/SearchCustomizationProvider";

const LINE_HEIGHT_OPTIONS = [
  { value: 1.4, label: "Tight" },
  { value: 1.6, label: "Normal" },
  { value: 1.72, label: "Default" },
  { value: 1.9, label: "Open" },
  { value: 2, label: "Spacious" }
] as const;

export function SearchCustomizationControls() {
  const { resetSettings, settings, updateSettings } = useSearchCustomization();

  return (
    <div className="search-customization-controls" role="group" aria-label="Search settings">
      <div className="search-customization-stepper" role="group" aria-label="Search text size">
        <button
          aria-label="Decrease search text size"
          className="search-customization-stepper-button"
          onClick={() =>
            updateSettings({
              textSize: Number((settings.textSize - 0.08).toFixed(2))
            })
          }
          type="button"
        >
          A-
        </button>
        <span className="search-customization-value">
          {Math.round(settings.textSize * 100)}%
        </span>
        <button
          aria-label="Increase search text size"
          className="search-customization-stepper-button"
          onClick={() =>
            updateSettings({
              textSize: Number((settings.textSize + 0.08).toFixed(2))
            })
          }
          type="button"
        >
          A+
        </button>
      </div>

      <label className="search-customization-field">
        <span>Leading</span>
        <select
          aria-label="Search line height"
          onChange={(event) => {
            updateSettings({ lineHeight: Number(event.target.value) });
          }}
          value={settings.lineHeight}
        >
          {LINE_HEIGHT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="search-customization-field">
        <span>Body</span>
        <select
          aria-label="Search body font"
          onChange={(event) => {
            updateSettings({ bodyFont: event.target.value as (typeof BODY_FONT_OPTIONS)[number]["id"] });
          }}
          value={settings.bodyFont}
        >
          {BODY_FONT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <label className="search-customization-field">
        <span>UI</span>
        <select
          aria-label="Search UI font"
          onChange={(event) => {
            updateSettings({ uiFont: event.target.value as (typeof UI_FONT_OPTIONS)[number]["id"] });
          }}
          value={settings.uiFont}
        >
          {UI_FONT_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>

      <div className="search-density-toggle" role="group" aria-label="Search density">
        {(["comfortable", "compact"] as const).map((density) => (
          <button
            aria-pressed={settings.density === density}
            className={`search-density-option${
              settings.density === density ? " search-density-option-active" : ""
            }`}
            key={density}
            onClick={() => {
              updateSettings({ density });
            }}
            type="button"
          >
            {density === "comfortable" ? "Comfortable" : "Compact"}
          </button>
        ))}
      </div>

      <button className="search-settings-reset-button" onClick={resetSettings} type="button">
        Reset
      </button>
    </div>
  );
}
