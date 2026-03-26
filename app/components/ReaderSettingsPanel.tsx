"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import {
  BODY_FONT_OPTIONS,
  THEME_PRESETS,
  UI_FONT_OPTIONS
} from "@/lib/reader-customization";

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

export function ReaderSettingsPanel() {
  const { isPanelOpen, resetSettings, setIsPanelOpen, settings, updateSettings } =
    useReaderCustomization();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

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
            <p className="eyebrow">Reader Settings</p>
            <h2 className="reader-settings-title" id="reader-settings-title">
              Customize your reading space
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
            <h3>Theme</h3>
            <p>Preset-led palettes with deeper control over glow, contrast, and atmosphere.</p>
          </div>
          <div className="settings-option-grid settings-option-grid-compact">
            {THEME_PRESETS.map((preset) => (
              <button
                className={`settings-option-card${
                  settings.themePreset === preset.id ? " is-active" : ""
                }`}
                key={preset.id}
                onClick={() => updateSettings({ themePreset: preset.id })}
                type="button"
              >
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Typography</h3>
            <p>Control the voice of the scripture text and the sharpness of the interface.</p>
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
            <p>Dial in reading density, line flow, and the size of the scripture surface.</p>
          </div>
          <div className="settings-slider-group">
            <label className="settings-slider">
              <span>Text size</span>
              <input
                aria-label="Text size"
                max="1.4"
                min="0.92"
                onChange={(event) => updateSettings({ textSize: Number(event.target.value) })}
                step="0.02"
                type="range"
                value={settings.textSize}
              />
              <strong>{settings.textSize.toFixed(2)}rem</strong>
            </label>
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
