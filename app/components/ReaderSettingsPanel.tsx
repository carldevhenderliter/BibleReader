"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderTts } from "@/app/components/ReaderTtsProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { BookMeta, ReadingView, ThemePreset } from "@/lib/bible/types";
import { BODY_FONT_OPTIONS, UI_FONT_OPTIONS } from "@/lib/reader-customization";
import { THEME_PRESETS } from "@/lib/reader-customization";
import { getViewToggleHref } from "@/lib/bible/utils";
import { getBibleVersionOptions, isInstalledBundledBibleVersion } from "@/lib/bible/version";

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
  const {
    activeEngine,
    browserVoices,
    isSupported: isTtsSupported,
    kokoroStatus,
    kokoroVoices,
    settings: ttsSettings,
    updateSettings: updateTtsSettings,
  } = useReaderTts();
  const { openCompare, openCrossReferences, openNotebook, openSermons, setActiveReaderPane } =
    useReaderWorkspace();
  const { version, setVersion } = useReaderVersion();
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const versionOptions = getBibleVersionOptions();
  const isReaderRoute = pathname.startsWith("/read");

  const handleVersionChange = (nextVersion: string) => {
    if (!isInstalledBundledBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
  };

  const handleTextSizeShift = (delta: number) => {
    updateSettings({
      textSize: Number((settings.textSize + delta).toFixed(2))
    });
  };

  const handleNotebookOpen = () => {
    openNotebook();
    setIsPanelOpen(false);
  };

  const handleStudySetsOpen = () => {
    setActiveReaderPane("study-sets");
    setIsPanelOpen(false);
  };

  const handleCompareOpen = () => {
    openCompare();
    setIsPanelOpen(false);
  };

  const handleSermonsOpen = () => {
    openSermons();
    setIsPanelOpen(false);
  };

  const handleCrossReferencesOpen = () => {
    openCrossReferences();
    setIsPanelOpen(false);
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
          <div className="reader-settings-subsection">
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
                      {option.label}
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
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Quick controls</p>
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
              <button
                aria-pressed={version === "kjv" ? settings.showStrongs : false}
                className="reader-inline-button reader-settings-link"
                disabled={version !== "kjv"}
                onClick={() => updateSettings({ showStrongs: !settings.showStrongs })}
                type="button"
              >
                {version === "kjv"
                  ? settings.showStrongs
                    ? "Hide Strongs"
                    : "Show Strongs"
                  : "Strongs (KJV only)"}
              </button>
              <Link
                className="reader-inline-action reader-settings-link"
                href={getViewToggleHref(book.slug, currentChapter, view, version)}
                onClick={() => setIsPanelOpen(false)}
              >
                {view === "book" ? "Chapter view" : "Whole book view"}
              </Link>
            </div>
          </div>
          {isReaderRoute ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-subsection-label">Study tools</p>
              <div className="reader-settings-shortcuts">
                <button
                  className="reader-inline-button reader-settings-link"
                  onClick={handleNotebookOpen}
                  type="button"
                >
                  Notebook
                </button>
                <button
                  className="reader-inline-button reader-settings-link"
                  onClick={handleSermonsOpen}
                  type="button"
                >
                  Sermons
                </button>
                <button
                  className="reader-inline-button reader-settings-link"
                  onClick={handleStudySetsOpen}
                  type="button"
                >
                  Study sets
                </button>
                <button
                  className="reader-inline-button reader-settings-link"
                  onClick={handleCrossReferencesOpen}
                  type="button"
                >
                  Cross refs
                </button>
                <button
                  className="reader-inline-button reader-settings-link"
                  onClick={handleCompareOpen}
                  type="button"
                >
                  Compare
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Read Aloud</h3>
            <p>Use the local HD voice when available, with browser read-aloud as the fallback.</p>
          </div>
          {!isTtsSupported ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-unavailable">
                Read aloud is unavailable in this browser.
              </p>
            </div>
          ) : (
            <>
              <div className="reader-settings-subsection">
                <p className="reader-settings-subsection-label">Engine status</p>
                <p className="reader-settings-unavailable">
                  {kokoroStatus === "loading"
                    ? "Loading the HD voice for local playback. Browser read-aloud will be used until it is ready."
                    : kokoroStatus === "ready"
                      ? activeEngine === "kokoro"
                        ? "HD voice is active for this reading session."
                        : "HD voice is ready and will be used automatically when possible."
                      : kokoroStatus === "error"
                        ? "HD voice could not start. Browser read-aloud will be used instead."
                        : kokoroStatus === "unavailable"
                          ? "HD voice is not available on this device. Browser read-aloud will be used."
                          : "HD voice will download the first time you press play."}
                </p>
                {kokoroStatus === "ready" ? (
                  <label className="reader-settings-field" htmlFor="reader-menu-kokoro-voice">
                    <span>HD voice</span>
                    <select
                      aria-label="Read aloud HD voice"
                      id="reader-menu-kokoro-voice"
                      onChange={(event) =>
                        updateTtsSettings({
                          kokoroVoice: event.target.value ? event.target.value : null
                        })
                      }
                      value={ttsSettings.kokoroVoice ?? ""}
                    >
                      {kokoroVoices.map((voice) => (
                        <option key={voice.id} value={voice.id}>
                          {voice.name} ({voice.language}, {voice.gender})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label className="reader-settings-field" htmlFor="reader-menu-browser-voice">
                  <span>Fallback browser voice</span>
                  <select
                    aria-label="Fallback browser voice"
                    id="reader-menu-browser-voice"
                    onChange={(event) =>
                      updateTtsSettings({
                        browserVoiceURI: event.target.value ? event.target.value : null
                      })
                    }
                    value={ttsSettings.browserVoiceURI ?? ""}
                  >
                    <option value="">System default</option>
                    {browserVoices.map((voice) => (
                      <option key={voice.voiceURI} value={voice.voiceURI}>
                        {voice.name} ({voice.lang})
                        {voice.isDefault ? " · default" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {browserVoices.length === 0 ? (
                  <p className="reader-settings-unavailable">Loading available browser voices…</p>
                ) : null}
              </div>
              <div className="reader-settings-subsection">
                <div className="settings-slider-group">
                  <label className="settings-slider">
                    <span>Reading speed</span>
                    <input
                      aria-label="Read aloud speed"
                      max="1.6"
                      min="0.6"
                      onChange={(event) =>
                        updateTtsSettings({ rate: Number(event.target.value) })
                      }
                      step="0.05"
                      type="range"
                      value={ttsSettings.rate}
                    />
                    <strong>{ttsSettings.rate.toFixed(2)}x</strong>
                  </label>
                  <label className="settings-slider">
                    <span>Pitch (browser only)</span>
                    <input
                      aria-label="Read aloud pitch"
                      max="1.5"
                      min="0.5"
                      onChange={(event) =>
                        updateTtsSettings({ pitch: Number(event.target.value) })
                      }
                      step="0.05"
                      type="range"
                      value={ttsSettings.pitch}
                    />
                    <strong>{ttsSettings.pitch.toFixed(2)}x</strong>
                  </label>
                </div>
              </div>
            </>
          )}
        </section>
        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Typography</h3>
            <p>Adjust the character of the scripture text and the supporting interface.</p>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Body font</p>
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
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Interface font</p>
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
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Alignment</p>
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
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Type scale</p>
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
          </div>
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Layout</h3>
            <p>Refine reading density, measure, and verse rhythm beyond the toolbar controls.</p>
          </div>
          <div className="reader-settings-subsection">
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
          </div>
        </section>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Visual Effects</h3>
            <p>Shape the intensity of the reading surface without falling into raw color editing.</p>
          </div>
          <div className="reader-settings-subsection">
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
