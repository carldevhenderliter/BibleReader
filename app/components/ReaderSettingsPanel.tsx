"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type {
  BookMeta,
  ReaderCustomizationSettings,
  ReadingView,
  ReaderPreset,
  ThemePreset
} from "@/lib/bible/types";
import {
  BODY_FONT_OPTIONS,
  GREEK_FONT_OPTIONS,
  HEBREW_FONT_OPTIONS,
  THEME_PRESETS,
  UI_FONT_OPTIONS
} from "@/lib/reader-customization";
import { getViewToggleHref } from "@/lib/bible/utils";
import { GOSPEL_HARMONY_BOOK_SLUG } from "@/lib/gospel-harmony";
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

type NumericFieldProps = {
  label: string;
  inputId: string;
  value: number;
  min?: number;
  max?: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
  disabled?: boolean;
};

function NumericField({
  label,
  inputId,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
  disabled = false
}: NumericFieldProps) {
  return (
    <label className="reader-settings-field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        aria-label={label}
        disabled={disabled}
        id={inputId}
        max={max}
        min={min}
        onChange={(event) => {
          const nextValue = event.currentTarget.valueAsNumber;

          if (!Number.isFinite(nextValue)) {
            return;
          }

          onChange(nextValue);
        }}
        step={step}
        type="number"
        value={value}
      />
      <strong className="reader-settings-field-value">
        {value.toFixed(step >= 1 ? 0 : 2)}
        {suffix}
      </strong>
    </label>
  );
}

type BibleReaderSettingsPanelProps = {
  mode?: "bible";
  book: BookMeta;
  currentChapter: number;
  view: ReadingView;
};

type FathersReaderSettingsPanelProps = {
  mode: "fathers";
  hasGreekReaderAid: boolean;
};

type ReaderSettingsPanelProps =
  | BibleReaderSettingsPanelProps
  | FathersReaderSettingsPanelProps;

export function ReaderSettingsPanel({
  mode = "bible",
  ...props
}: ReaderSettingsPanelProps) {
  const { isPanelOpen, resetSettings, setIsPanelOpen, settings, updateSettings } =
    useReaderCustomization();
  const {
    createHarmony,
    getHarmonyDocuments,
    openCompare,
    openCrossReferences,
    openNotebook,
    openOtCompare,
    openSermons,
    setActiveReaderPane,
    setActiveUtilityPane
  } = useReaderWorkspace();
  const { version, setVersion } = useReaderVersion();
  const pathname = usePathname();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const versionOptions = getBibleVersionOptions();
  const isFathersMode = mode === "fathers";
  const isReaderRoute = pathname.startsWith("/read");
  const book = !isFathersMode ? (props as BibleReaderSettingsPanelProps).book : null;
  const currentChapter = !isFathersMode
    ? (props as BibleReaderSettingsPanelProps).currentChapter
    : null;
  const view = !isFathersMode ? (props as BibleReaderSettingsPanelProps).view : null;
  const hasGreekReaderAid = isFathersMode
    ? (props as FathersReaderSettingsPanelProps).hasGreekReaderAid
    : false;
  const supportsFullRenderToggle = isFathersMode || view === "book";
  const isOldTestament = book?.testament === "Old";
  const isHarmonyBook = book?.slug === GOSPEL_HARMONY_BOOK_SLUG;
  const isStandaloneGreekVersion = !isFathersMode && (version === "greek" || version === "tr");
  const originalLanguageLabel = isFathersMode
    ? "Greek"
    : version === "kjv"
      ? isOldTestament
        ? "Hebrew"
        : "Greek"
      : "Greek";
  const supportsGreekReading = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" || isStandaloneGreekVersion;
  const supportsEsvInterlinear = !isFathersMode && version === "esv";
  const supportsQuickGreekInterlinear = !isFathersMode && (version === "esv" || version === "kjv");
  const supportsGreekStudyLayers = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" || isStandaloneGreekVersion || version === "kjv";
  const greekStudyLayersEnabled = isFathersMode
    ? hasGreekReaderAid
    : isStandaloneGreekVersion ||
        settings.showEsvInterlinear ||
        (version === "kjv" && settings.showStrongs);
  const supportsOriginalWordSurface = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" || isStandaloneGreekVersion || (version === "kjv" && !isOldTestament);
  const supportsVerseStrongs = !isFathersMode &&
    (version === "kjv" || version === "tr" || (version === "esv" && !isOldTestament));
  const hasVisibleGreekStudyLayer =
    settings.showGreekSurface ||
    settings.showGreekLemma ||
    settings.showGreekTransliteration ||
    settings.showGreekGloss;

  useEffect(() => {
    // Older stored settings and reading/audio presets can leave every Greek layer disabled.
    // If a reader surface with available Greek companion text is active, restore one visible layer.
    if (
      isFathersMode ||
      hasVisibleGreekStudyLayer ||
      !(
        (version === "esv" && settings.showEsvInterlinear) ||
        (version === "kjv" && !isOldTestament && settings.showStrongs)
      )
    ) {
      return;
    }

    updateSettings({
      showGreekSurface: true
    });
  }, [
    hasVisibleGreekStudyLayer,
    isFathersMode,
    isOldTestament,
    settings.showEsvInterlinear,
    settings.showStrongs,
    updateSettings,
    version
  ]);

  const handleVersionChange = (nextVersion: string) => {
    if (!isInstalledBundledBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
  };

  const isQuickGreekInterlinearEnabled =
    version === "esv" ? settings.showEsvInterlinear : version === "kjv" ? settings.showStrongs : false;

  const handleTextSizeShift = (delta: number) => {
    updateSettings({
      bodyTextSize: Number((settings.bodyTextSize + delta).toFixed(2))
    });
  };

  const updateNumericSetting = <K extends keyof ReaderCustomizationSettings>(
    key: K,
    nextValue: ReaderCustomizationSettings[K]
  ) => {
    updateSettings({
      [key]: nextValue
    } as Partial<ReaderCustomizationSettings>);
  };

  const enterReadingSurface = () => {
    setActiveReaderPane("reading");
    setActiveUtilityPane("search");
  };

  const applyReaderPreset = (preset: ReaderPreset) => {
    if (preset === "reading") {
      enterReadingSurface();
      updateSettings({
        readerPreset: "reading",
        focusReadingMode: true,
        showVerseNumbers: false,
        showChapterHeadings: false,
        showVerseText: true,
        showCompanionVerseTranslation: isStandaloneGreekVersion,
        showAnnotatedGreekUndertext: false,
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false,
        showCustomVerseTranslation: false,
        showFathersSentenceLines: false,
        disableLazyLoading: false,
        contentWidth: 58
      });
      return;
    }

    if (preset === "study") {
      updateSettings({
        readerPreset: "study",
        focusReadingMode: false,
        showEsvInterlinear: !isFathersMode && supportsEsvInterlinear ? true : settings.showEsvInterlinear,
        showEsvGreekOnly: false,
        showVerseNumbers: true,
        showChapterHeadings: true,
        showVerseText: true,
        showCompanionVerseTranslation: !isFathersMode,
        showAnnotatedGreekUndertext: true,
        showGreekSurface: true,
        showGreekLemma: true,
        showGreekTransliteration: true,
        showGreekGloss: true,
        showCustomVerseTranslation: true,
        showFathersSentenceLines: false,
        disableLazyLoading: false
      });
      return;
    }

    enterReadingSurface();
    updateSettings({
      readerPreset: "audio",
      focusReadingMode: true,
      showVerseNumbers: false,
      showChapterHeadings: false,
      showVerseText: true,
      showCompanionVerseTranslation: false,
      showAnnotatedGreekUndertext: false,
      showGreekSurface: false,
      showGreekLemma: false,
      showGreekTransliteration: false,
      showGreekGloss: false,
      showCustomVerseTranslation: false,
      showFathersSentenceLines: false,
      disableLazyLoading: false,
      bodyTextSize: Math.max(settings.bodyTextSize, 1.18),
      contentWidth: 60
    });
  };

  const toggleLayer = (
    key:
      | "showVerseNumbers"
      | "showVerseText"
      | "showChapterHeadings"
      | "showCompanionVerseTranslation"
      | "showAnnotatedGreekUndertext"
      | "showVerseStrongs"
      | "showCustomVerseTranslation"
      | "showGreekSurface"
      | "showGreekLemma"
      | "showGreekTransliteration"
      | "showGreekGloss"
      | "showFathersSentenceLines"
  ) => {
    updateSettings({
      [key]: !settings[key],
      showEsvGreekOnly: false
    } as Partial<ReaderCustomizationSettings>);
  };

  const applyGreekOnlyPreset = () => {
    if (isFathersMode) {
      updateSettings({
        showVerseNumbers: false,
        showChapterHeadings: false,
        showVerseText: false,
        showAnnotatedGreekUndertext: false,
        showGreekSurface: true,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false
      });
      return;
    }

    if (isStandaloneGreekVersion) {
      updateSettings({
        showVerseNumbers: false,
        showChapterHeadings: false,
        showVerseText: true,
        showAnnotatedGreekUndertext: false,
        showCompanionVerseTranslation: false,
        showCustomVerseTranslation: false,
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false
      });
      return;
    }

    updateSettings({
      showEsvInterlinear: true,
      showEsvGreekOnly: true,
      showVerseNumbers: false,
      showChapterHeadings: false,
      showVerseText: false,
      showAnnotatedGreekUndertext: false,
      showGreekSurface: true,
      showGreekLemma: false,
      showGreekTransliteration: false,
      showGreekGloss: false,
      showCustomVerseTranslation: false
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

  const handleOtCompareOpen = () => {
    openOtCompare();
    setIsPanelOpen(false);
  };

  const handleSermonsOpen = () => {
    openSermons();
    setIsPanelOpen(false);
  };

  const handleHarmonyOpen = () => {
    if (getHarmonyDocuments().length === 0) {
      createHarmony();
    }

    setActiveReaderPane("harmony");
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
            <p>
              {isFathersMode
                ? "Adjust shared reader settings for Fathers works without Bible-only controls."
                : "Change the active version, theme, reading size, and view from one menu."}
            </p>
          </div>
          <div className="reader-settings-subsection">
            <div className="reader-settings-field-grid">
              {!isFathersMode ? (
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
              ) : null}
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
            <div className="reader-settings-field-grid">
              <div className="reader-settings-field">
                <span>Session presets</span>
                <div className="reader-settings-shortcuts">
                  <button
                    className={`reader-inline-button reader-settings-link${
                      settings.readerPreset === "reading" ? " is-active" : ""
                    }`}
                    onClick={() => applyReaderPreset("reading")}
                    type="button"
                  >
                    Reading
                  </button>
                  <button
                    className={`reader-inline-button reader-settings-link${
                      settings.readerPreset === "study" ? " is-active" : ""
                    }`}
                    onClick={() => applyReaderPreset("study")}
                    type="button"
                  >
                    Study
                  </button>
                  <button
                    className={`reader-inline-button reader-settings-link${
                      settings.readerPreset === "audio" ? " is-active" : ""
                    }`}
                    onClick={() => applyReaderPreset("audio")}
                    type="button"
                  >
                    Audio
                  </button>
                </div>
              </div>
              <div className="reader-settings-field">
                <span>Reading focus</span>
                <div className="reader-settings-shortcuts">
                  <button
                    className={`reader-inline-button reader-settings-link${
                      settings.focusReadingMode ? " is-active" : ""
                    }`}
                    onClick={() => {
                      if (!settings.focusReadingMode) {
                        enterReadingSurface();
                      }

                      updateSettings({
                        focusReadingMode: !settings.focusReadingMode
                      });
                    }}
                    type="button"
                  >
                    {settings.focusReadingMode ? "Focus reading on" : "Focus reading off"}
                  </button>
                  {supportsGreekReading ? (
                    <button
                      className="reader-inline-button reader-settings-link"
                      onClick={applyGreekOnlyPreset}
                      type="button"
                    >
                      Greek only
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {isFathersMode && !hasGreekReaderAid ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-unavailable">
                Greek display controls appear automatically for Fathers works that include Greek study tokens.
              </p>
            </div>
          ) : null}
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Verse display</p>
            <div className="settings-option-grid settings-option-grid-compact">
                <button
                  className={`settings-option-card${settings.showVerseNumbers ? " is-active" : ""}`}
                  key="showVerseNumbers"
                  onClick={() => toggleLayer("showVerseNumbers")}
                  type="button"
                >
                  <strong>{isFathersMode ? "Section references" : "Verse numbers"}</strong>
                  <span>
                    {isFathersMode
                      ? "Show the small section reference line above each Fathers section."
                      : "Show the small verse numbers beside each Bible verse."}
                  </span>
                </button>
                {!isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showChapterHeadings ? " is-active" : ""
                    }`}
                    key="showChapterHeadings"
                    onClick={() => toggleLayer("showChapterHeadings")}
                    type="button"
                  >
                    <strong>Chapter headings</strong>
                    <span>Show the chapter header blocks in whole-book Bible reading.</span>
                  </button>
                ) : null}
                <button
                  className={`settings-option-card${settings.showVerseText ? " is-active" : ""}`}
                  key="showVerseText"
                  onClick={() => toggleLayer("showVerseText")}
                  type="button"
                >
                  <strong>{isFathersMode ? "English text" : "Verse text"}</strong>
                  <span>
                    {isFathersMode
                      ? "Show the English translation block for each Fathers section."
                      : isStandaloneGreekVersion
                        ? "Show the main Greek verse line."
                        : "Show the translation line for the verse."}
                  </span>
                </button>
                {!isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showCompanionVerseTranslation ? " is-active" : ""
                    }`}
                    key="showCompanionVerseTranslation"
                    onClick={() => toggleLayer("showCompanionVerseTranslation")}
                    type="button"
                  >
                    <strong>English companion</strong>
                    <span>Show the English verse line under the Greek text.</span>
                  </button>
                ) : null}
                {!isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showAnnotatedGreekUndertext ? " is-active" : ""
                    }`}
                    key="showAnnotatedGreekUndertext"
                    onClick={() => toggleLayer("showAnnotatedGreekUndertext")}
                    type="button"
                  >
                    <strong>Annotated Greek</strong>
                    <span>Show saved Greek undertext beneath the English words.</span>
                  </button>
                ) : null}
                {isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showAnnotatedGreekUndertext ? " is-active" : ""
                    }`}
                    key="showAnnotatedGreekUndertext"
                    onClick={() => toggleLayer("showAnnotatedGreekUndertext")}
                    type="button"
                  >
                    <strong>Annotated Greek</strong>
                    <span>Show saved Greek undertext beneath the English reading line.</span>
                  </button>
                ) : null}
                {!isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showCustomVerseTranslation ? " is-active" : ""
                    }`}
                    key="showCustomVerseTranslation"
                    onClick={() => toggleLayer("showCustomVerseTranslation")}
                    type="button"
                  >
                    <strong>Your translation</strong>
                    <span>Show your saved custom verse under the text.</span>
                  </button>
                ) : null}
                {supportsVerseStrongs ? (
                  <button
                    className={`settings-option-card${
                      (version === "kjv" ? settings.showStrongs : settings.showVerseStrongs)
                        ? " is-active"
                        : ""
                    }`}
                    key="showVerseStrongs"
                    onClick={() =>
                      version === "kjv"
                        ? updateSettings({ showStrongs: !settings.showStrongs })
                        : toggleLayer("showVerseStrongs")
                    }
                    type="button"
                  >
                    <strong>{version === "kjv" ? "Strongs tags" : "Strong's numbers"}</strong>
                    <span>
                      {version === "kjv"
                        ? "Show the Strong's-linked tagged words in the verse text."
                        : "Show Strong's numbers beside matched verse words where Greek alignment is available."}
                    </span>
                  </button>
                ) : null}
                <button
                  className={`settings-option-card${
                    settings.showGreekSurface ? " is-active" : ""
                  }`}
                  disabled={!supportsOriginalWordSurface || !greekStudyLayersEnabled}
                  key="showGreekSurface"
                  onClick={() => toggleLayer("showGreekSurface")}
                  type="button"
                >
                  <strong>{originalLanguageLabel} words</strong>
                  <span>
                    {version === "kjv"
                      ? "Show the exact original word forms when full interlinear text is available."
                      : `Show the actual ${originalLanguageLabel.toLowerCase()} word forms.`}
                  </span>
                </button>
                <button
                  className={`settings-option-card${settings.showGreekLemma ? " is-active" : ""}`}
                  disabled={!supportsGreekStudyLayers || !greekStudyLayersEnabled}
                  key="showGreekLemma"
                  onClick={() => toggleLayer("showGreekLemma")}
                  type="button"
                >
                  <strong>{originalLanguageLabel} lemma</strong>
                  <span>Show the dictionary form under each word.</span>
                </button>
                <button
                  className={`settings-option-card${
                    settings.showGreekTransliteration ? " is-active" : ""
                  }`}
                  disabled={!supportsGreekStudyLayers || !greekStudyLayersEnabled}
                  key="showGreekTransliteration"
                  onClick={() => toggleLayer("showGreekTransliteration")}
                  type="button"
                >
                  <strong>Transliteration</strong>
                  <span>
                    Show the English-letter pronunciation line for the {originalLanguageLabel.toLowerCase()} word.
                  </span>
                </button>
                <button
                  className={`settings-option-card${settings.showGreekGloss ? " is-active" : ""}`}
                  disabled={!supportsGreekStudyLayers || !greekStudyLayersEnabled}
                  key="showGreekGloss"
                  onClick={() => toggleLayer("showGreekGloss")}
                  type="button"
                >
                  <strong>English gloss</strong>
                  <span>
                    Keep saved glosses visible. Turn this on when you want to edit the glosses inline.
                  </span>
                </button>
                {isFathersMode ? (
                  <button
                    className={`settings-option-card${
                      settings.showFathersSentenceLines ? " is-active" : ""
                    }`}
                    key="showFathersSentenceLines"
                    onClick={() => toggleLayer("showFathersSentenceLines")}
                    type="button"
                  >
                    <strong>Sentence lines</strong>
                    <span>Put each English sentence on its own line in Fathers reading.</span>
                  </button>
                ) : null}
                {supportsFullRenderToggle ? (
                  <button
                    className={`settings-option-card${
                      settings.disableLazyLoading ? " is-active" : ""
                    }`}
                    key="disableLazyLoading"
                    onClick={() =>
                      updateSettings({ disableLazyLoading: !settings.disableLazyLoading })
                    }
                    type="button"
                  >
                    <strong>{isFathersMode ? "Load full work" : "Load full book"}</strong>
                    <span>
                      {isFathersMode
                        ? "Render every section immediately instead of lazy loading as you scroll."
                        : "Render every chapter immediately instead of lazy loading as you scroll."}
                    </span>
                  </button>
                ) : null}
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
                <span className="reader-controls-status">{settings.bodyTextSize.toFixed(2)}rem</span>
                <button
                  aria-label="Increase text size"
                  className="reader-inline-button"
                  onClick={() => handleTextSizeShift(0.04)}
                  type="button"
                >
                  A+
                </button>
              </div>
              {!isFathersMode ? (
                <>
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
                  <button
                    aria-pressed={supportsQuickGreekInterlinear ? isQuickGreekInterlinearEnabled : false}
                    className="reader-inline-button reader-settings-link"
                    disabled={!supportsQuickGreekInterlinear}
                    onClick={() => {
                      if (version === "kjv") {
                        updateSettings({
                          showStrongs: !settings.showStrongs,
                          ...(!settings.showStrongs &&
                          !isOldTestament &&
                          !hasVisibleGreekStudyLayer
                            ? { showGreekSurface: true }
                            : {})
                        });
                        return;
                      }

                      updateSettings({
                        showEsvInterlinear: !settings.showEsvInterlinear,
                        showEsvGreekOnly: false,
                        ...(!settings.showEsvInterlinear && !hasVisibleGreekStudyLayer
                          ? { showGreekSurface: true }
                          : {})
                      });
                    }}
                    type="button"
                  >
                    {supportsQuickGreekInterlinear
                      ? isQuickGreekInterlinearEnabled
                        ? "Hide Greek interlinear"
                        : "Show Greek interlinear"
                      : "Greek interlinear (ESV/KJV only)"}
                  </button>
                  <Link
                    className="reader-inline-action reader-settings-link"
                    href={getViewToggleHref(book!.slug, currentChapter!, view!, version)}
                    onClick={() => setIsPanelOpen(false)}
                  >
                    {view === "book" ? "Chapter view" : "Whole book view"}
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          {!isFathersMode && isReaderRoute ? (
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
                  onClick={handleHarmonyOpen}
                  type="button"
                >
                  Harmony
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
                {!isHarmonyBook ? (
                  <button
                    className="reader-inline-button reader-settings-link"
                    onClick={handleCompareOpen}
                    type="button"
                  >
                    Compare
                  </button>
                ) : null}
                {isOldTestament && !isHarmonyBook ? (
                  <button
                    className="reader-inline-button reader-settings-link"
                    onClick={handleOtCompareOpen}
                    type="button"
                  >
                    OT Compare
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <details className="reader-settings-advanced">
          <summary className="reader-settings-advanced-summary">Customize</summary>

        <section className="reader-settings-section">
          <div className="reader-settings-section-header">
            <h3>Typography</h3>
            <p>Set exact sizes and curated font stacks for each reading layer.</p>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Exact sizes</p>
            <div className="reader-settings-field-grid">
              <NumericField
                inputId="reader-menu-body-text-size"
                label="Main text size"
                max={3.25}
                min={0.8}
                onChange={(value) => updateNumericSetting("bodyTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.bodyTextSize}
              />
              <NumericField
                disabled={!supportsGreekReading}
                inputId="reader-menu-greek-text-size"
                label="Greek text size"
                max={4}
                min={0.9}
                onChange={(value) => updateNumericSetting("greekTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.greekTextSize}
              />
              <NumericField
                inputId="reader-menu-hebrew-text-size"
                label="Hebrew text size"
                max={4}
                min={0.9}
                onChange={(value) => updateNumericSetting("hebrewTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.hebrewTextSize}
              />
              <NumericField
                inputId="reader-menu-companion-text-size"
                label="Companion verse size"
                max={3}
                min={0.72}
                onChange={(value) => updateNumericSetting("companionVerseTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.companionVerseTextSize}
              />
              <NumericField
                inputId="reader-menu-custom-text-size"
                label="Custom translation size"
                max={3.25}
                min={0.72}
                onChange={(value) => updateNumericSetting("customVerseTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.customVerseTextSize}
              />
            </div>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Main and English fonts</p>
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
            <p className="reader-settings-subsection-label">Greek font</p>
            <div className="settings-option-grid settings-option-grid-compact">
              {GREEK_FONT_OPTIONS.map((option) => (
                <button
                  className={`settings-option-card${
                    settings.greekFont === option.id ? " is-active" : ""
                  }`}
                  key={option.id}
                  onClick={() => updateSettings({ greekFont: option.id })}
                  type="button"
                >
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Hebrew font</p>
            <div className="settings-option-grid settings-option-grid-compact">
              {HEBREW_FONT_OPTIONS.map((option) => (
                <button
                  className={`settings-option-card${
                    settings.hebrewFont === option.id ? " is-active" : ""
                  }`}
                  key={option.id}
                  onClick={() => updateSettings({ hebrewFont: option.id })}
                  type="button"
                >
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Companion verse font</p>
            <div className="settings-option-grid settings-option-grid-compact">
              {BODY_FONT_OPTIONS.map((option) => (
                <button
                  className={`settings-option-card${
                    settings.companionVerseFont === option.id ? " is-active" : ""
                  }`}
                  key={`companion:${option.id}`}
                  onClick={() => updateSettings({ companionVerseFont: option.id })}
                  type="button"
                >
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Custom translation font</p>
            <div className="settings-option-grid settings-option-grid-compact">
              {BODY_FONT_OPTIONS.map((option) => (
                <button
                  className={`settings-option-card${
                    settings.customVerseFont === option.id ? " is-active" : ""
                  }`}
                  key={`custom:${option.id}`}
                  onClick={() => updateSettings({ customVerseFont: option.id })}
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
            <p className="reader-settings-subsection-label">Supporting scale</p>
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
            <p className="reader-settings-subsection-label">Paragraph rhythm</p>
            <div className="reader-settings-field-grid">
              <NumericField
                inputId="reader-menu-line-height"
                label="Line height"
                onChange={(value) => updateNumericSetting("lineHeight", value)}
                step={0.01}
                suffix=""
                value={settings.lineHeight}
              />
              <NumericField
                inputId="reader-menu-first-line-indent"
                label="First-line indent"
                onChange={(value) => updateNumericSetting("firstLineIndent", value)}
                step={0.05}
                suffix="rem"
                value={settings.firstLineIndent}
              />
            </div>
          </div>
          <div className="reader-settings-subsection">
            <div className="reader-settings-field-grid">
              <NumericField
                inputId="reader-menu-content-width"
                label="Content width"
                onChange={(value) => updateNumericSetting("contentWidth", value)}
                step={1}
                suffix="rem"
                value={settings.contentWidth}
              />
              <NumericField
                inputId="reader-menu-verse-spacing"
                label="Verse spacing"
                onChange={(value) => updateNumericSetting("verseSpacing", value)}
                step={0.05}
                suffix="rem"
                value={settings.verseSpacing}
              />
              <NumericField
                inputId="reader-menu-paragraph-spacing"
                label="Paragraph spacing"
                onChange={(value) => updateNumericSetting("paragraphSpacing", value)}
                step={0.05}
                suffix="rem"
                value={settings.paragraphSpacing}
              />
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
        </details>

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
