"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type { BookMeta, ReadingView, ThemePreset } from "@/lib/bible/types";
import { BODY_FONT_OPTIONS, UI_FONT_OPTIONS } from "@/lib/reader-customization";
import { THEME_PRESETS } from "@/lib/reader-customization";
import { getViewToggleHref } from "@/lib/bible/utils";
import { getBibleVersionOptions, isBundledBibleVersion } from "@/lib/bible/version";

const TEXT_ALIGNMENT_OPTIONS = [
  {
    id: "left",
    name: "Left aligned",
    description: "Keeps a looser digital-reader rhythm."
  },
  {
    id: "justify",
    name: "Justified",
    description: "Creates a denser page-like reading block."
  }
] as const;

type ReaderSettingsPanelProps = {
  book: BookMeta;
  currentChapter: number;
  view: ReadingView;
};

export function ReaderSettingsPanel({
  book,
  currentChapter,
  view
}: ReaderSettingsPanelProps) {
  const { isPanelOpen, resetSettings, setIsPanelOpen, settings, updateSettings } =
    useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const versionOptions = getBibleVersionOptions(false);

  const handleVersionChange = (nextVersion: string) => {
    if (!isBundledBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
  };

  const handleTextSizeShift = (delta: number) => {
    updateSettings({
      textSize: Number((settings.textSize + delta).toFixed(2))
    });
  };

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    closeButtonRef.current?.focus();
  }, [isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPanelOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPanelOpen, setIsPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPanelOpen]);

  if (!isPanelOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="reader-settings-backdrop is-open"
        onClick={() => setIsPanelOpen(false)}
      />
      <aside
        aria-labelledby="reader-settings-title"
        className="reader-settings-panel is-open"
        id="reader-settings-panel"
        role="dialog"
      >
        <div className="reader-settings-header">
          <div>
            <p className="eyebrow">Reader Menu</p>
            <h2 className="reader-settings-title" id="reader-settings-title">
              Reader controls and settings
            </h2>
          </div>
          <button
            aria-label="Close reader settings"
            className="reader-settings-close"
            onClick={() => setIsPanelOpen(false)}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </div>
        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Reading Controls</h3>
            <p>Change the active version, theme, reading size, and view from one menu.</p>
          </div>
          <div className="reader-settings-field-grid">
            <label className="reader-settings-field" htmlFor="reader-menu-version">
              <span>Version</span>
              <select
                aria-label="Version"
                id="reader-menu-version"
                onChange={(event) => handleVersionChange(event.target.value)}
                value={version}
              >
                {versionOptions.map((option) => (
                  <option disabled={option.disabled} key={option.id} value={option.id}>
                    {option.disabled ? `${option.label} (API key required)` : option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="reader-settings-field" htmlFor="reader-menu-theme">
              <span>Theme</span>
              <select
                aria-label="Theme"
                id="reader-menu-theme"
                onChange={(event) =>
                  updateSettings({ themePreset: event.target.value as ThemePreset })
                }
                value={settings.themePreset}
              >
                {THEME_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="reader-settings-shortcuts">
            <div className="reader-size-controls" role="group" aria-label="Text size controls">
              <button
                aria-label="Decrease text size"
                className="reader-inline-button"
                onClick={() => handleTextSizeShift(-0.04)}
                type="button"
              >
                A-
              </button>
              <span className="reader-controls-status">{settings.textSize.toFixed(2)}rem</span>
              <button
                aria-label="Increase text size"
                className="reader-inline-button"
                onClick={() => handleTextSizeShift(0.04)}
                type="button"
              >
                A+
              </button>
            </div>
            <Link
              className="reader-inline-action reader-settings-link"
              href={getViewToggleHref(book.slug, currentChapter, view, version)}
              onClick={() => setIsPanelOpen(false)}
            >
              {view === "book" ? "Chapter view" : "Whole book view"}
            </Link>
          </div>
        </section>
        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Typography</h3>
            <p>Adjust the character of the scripture text and the supporting interface.</p>
          </div>
          <div className="settings-option-grid settings-option-grid-compact">
            {BODY_FONT_OPTIONS.map((option) => (
              <button
                className={`settings-option-card${
                  settings.bodyFont === option.id ? " is-active" : ""
                }`}
                key={option.id}
                onClick={() => updateSettings({ bodyFont: option.id })}
                type="button"
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <div className="settings-option-grid settings-option-grid-compact">
            {UI_FONT_OPTIONS.map((option) => (
              <button
                className={`settings-option-card${
                  settings.uiFont === option.id ? " is-active" : ""
                }`}
                key={option.id}
                onClick={() => updateSettings({ uiFont: option.id })}
                type="button"
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <div className="settings-option-grid settings-option-grid-compact">
            {TEXT_ALIGNMENT_OPTIONS.map((option) => (
              <button
                className={`settings-option-card${
                  settings.textAlign === option.id ? " is-active" : ""
                }`}
                key={option.id}
                onClick={() => updateSettings({ textAlign: option.id })}
                type="button"
              >
                <strong>{option.name}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
          <div className="settings-slider-group">
            <label className="settings-slider">
              <span>Header scale</span>
              <input
                aria-label="Header scale"
                max="1.3"
                min="0.85"
                onChange={(event) => updateSettings({ headerScale: Number(event.target.value) })}
                step="0.01"
                type="range"
                value={settings.headerScale}
              />
              <strong>{settings.headerScale.toFixed(2)}x</strong>
            </label>
            <label className="settings-slider">
              <span>Verse number scale</span>
              <input
                aria-label="Verse number scale"
                max="1.6"
                min="0.75"
                onChange={(event) =>
                  updateSettings({ verseNumberScale: Number(event.target.value) })
                }
                step="0.01"
                type="range"
                value={settings.verseNumberScale}
              />
              <strong>{settings.verseNumberScale.toFixed(2)}x</strong>
            </label>
            <label className="settings-slider">
              <span>Letter spacing</span>
              <input
                aria-label="Letter spacing"
                max="0.04"
                min="-0.01"
                onChange={(event) => updateSettings({ letterSpacing: Number(event.target.value) })}
                step="0.005"
                type="range"
                value={settings.letterSpacing}
              />
              <strong>{settings.letterSpacing.toFixed(3)}em</strong>
            </label>
          </div>
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Layout</h3>
            <p>Refine reading density, measure, and verse rhythm beyond the toolbar controls.</p>
          </div>
          <div className="settings-slider-group">
            <label className="settings-slider">
              <span>Line height</span>
              <input
                aria-label="Line height"
                max="2.3"
                min="1.6"
                onChange={(event) => updateSettings({ lineHeight: Number(event.target.value) })}
                step="0.05"
                type="range"
                value={settings.lineHeight}
              />
              <strong>{settings.lineHeight.toFixed(2)}</strong>
            </label>
            <label className="settings-slider">
              <span>Content width</span>
              <input
                aria-label="Content width"
                max="60"
                min="36"
                onChange={(event) => updateSettings({ contentWidth: Number(event.target.value) })}
                step="1"
                type="range"
                value={settings.contentWidth}
              />
              <strong>{settings.contentWidth}rem</strong>
            </label>
            <label className="settings-slider">
              <span>Verse spacing</span>
              <input
                aria-label="Verse spacing"
                max="1.8"
                min="0.6"
                onChange={(event) => updateSettings({ verseSpacing: Number(event.target.value) })}
                step="0.05"
                type="range"
                value={settings.verseSpacing}
              />
              <strong>{settings.verseSpacing.toFixed(2)}rem</strong>
            </label>
            <label className="settings-slider">
              <span>Paragraph spacing</span>
              <input
                aria-label="Paragraph spacing"
                max="0.8"
                min="0"
                onChange={(event) =>
                  updateSettings({ paragraphSpacing: Number(event.target.value) })
                }
                step="0.05"
                type="range"
                value={settings.paragraphSpacing}
              />
              <strong>{settings.paragraphSpacing.toFixed(2)}rem</strong>
            </label>
          </div>
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Visual Effects</h3>
            <p>Shape the intensity of the reading surface without falling into raw color editing.</p>
          </div>
          <div className="settings-slider-group">
            <label className="settings-slider">
              <span>Reading contrast</span>
              <input
                aria-label="Reading contrast"
                max="1.25"
                min="0.9"
                onChange={(event) =>
                  updateSettings({ readingModeContrast: Number(event.target.value) })
                }
                step="0.01"
                type="range"
                value={settings.readingModeContrast}
              />
              <strong>{settings.readingModeContrast.toFixed(2)}x</strong>
            </label>
            <label className="settings-slider">
              <span>Glow intensity</span>
              <input
                aria-label="Glow intensity"
                max="1.8"
                min="0"
                onChange={(event) => updateSettings({ glowIntensity: Number(event.target.value) })}
                step="0.05"
                type="range"
                value={settings.glowIntensity}
              />
              <strong>{settings.glowIntensity.toFixed(2)}x</strong>
            </label>
            <label className="settings-slider">
              <span>Background intensity</span>
              <input
                aria-label="Background intensity"
                max="0.3"
                min="0.03"
                onChange={(event) =>
                  updateSettings({ backgroundIntensity: Number(event.target.value) })
                }
                step="0.01"
                type="range"
                value={settings.backgroundIntensity}
              />
              <strong>{settings.backgroundIntensity.toFixed(2)}</strong>
            </label>
            <label className="settings-slider">
              <span>Surface depth</span>
              <input
                aria-label="Surface depth"
                max="1.3"
                min="0.8"
                onChange={(event) => updateSettings({ surfaceDepth: Number(event.target.value) })}
                step="0.01"
                type="range"
                value={settings.surfaceDepth}
              />
              <strong>{settings.surfaceDepth.toFixed(2)}x</strong>
            </label>
          </div>
        </section>

        <div className="reader-settings-actions">
          <button className="secondary-button" onClick={resetSettings} type="button">
            Reset to defaults
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
