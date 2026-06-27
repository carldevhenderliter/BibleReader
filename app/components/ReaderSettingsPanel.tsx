"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { downloadGreekGlossExportFile } from "@/app/components/GreekGlossOverridesProvider";
import { useMobilePreview } from "@/app/components/MobilePreviewProvider";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type {
  BookMeta,
  BundledBibleVersion,
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
import {
  getAlternateBundledVersions,
  getBibleVersionLabel,
  getBibleVersionOptions,
  isInstalledBundledBibleVersion
} from "@/lib/bible/version";
import { isReaderRoutePath } from "@/lib/reader-routes";

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

function getNextSelectedVersions(
  selectedVersions: readonly BundledBibleVersion[],
  toggledVersion: BundledBibleVersion
) {
  if (selectedVersions.includes(toggledVersion)) {
    if (selectedVersions.length === 1) {
      return [...selectedVersions];
    }

    return selectedVersions.filter((version) => version !== toggledVersion);
  }

  return [...selectedVersions, toggledVersion];
}

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
  readerTools?: ReactNode;
  view: ReadingView;
};

type FathersReaderSettingsPanelProps = {
  mode: "fathers";
  hasGreekReaderAid: boolean;
  readerTools?: ReactNode;
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
  const { isMobilePreviewEnabled, setMobilePreviewEnabled } = useMobilePreview();
  const {
    activeReaderPane,
    activeUtilityPane,
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
  const [greekGlossExportStatus, setGreekGlossExportStatus] = useState<string | null>(null);
  const versionOptions = getBibleVersionOptions();
  const isFathersMode = mode === "fathers";
  const isReaderRoute = isReaderRoutePath(pathname);
  const book = !isFathersMode ? (props as BibleReaderSettingsPanelProps).book : null;
  const currentChapter = !isFathersMode
    ? (props as BibleReaderSettingsPanelProps).currentChapter
    : null;
  const view = !isFathersMode ? (props as BibleReaderSettingsPanelProps).view : null;
  const hasGreekReaderAid = isFathersMode
    ? (props as FathersReaderSettingsPanelProps).hasGreekReaderAid
    : false;
  const readerTools = props.readerTools ?? null;
  const supportsFullRenderToggle = isFathersMode || view === "book";
  const isOldTestament = book?.testament === "Old";
  const isHarmonyBook = book?.slug === GOSPEL_HARMONY_BOOK_SLUG;
  const isStandaloneGreekVersion = !isFathersMode && (version === "greek" || version === "tr");
  const isStandaloneHebrewVersion = !isFathersMode && version === "mt";
  const originalLanguageLabel = isFathersMode
    ? "Greek"
    : version === "kjv"
      ? isOldTestament
        ? "Hebrew"
        : "Greek"
      : isStandaloneHebrewVersion
        ? "Hebrew"
        : "Greek";
  const supportsGreekReading = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" || isStandaloneGreekVersion || isStandaloneHebrewVersion;
  const supportsEsvInterlinear = !isFathersMode && version === "esv";
  const supportsQuickGreekInterlinear = !isFathersMode && (version === "esv" || version === "kjv");
  const supportsGreekStudyLayers = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" || isStandaloneGreekVersion || isStandaloneHebrewVersion || version === "kjv";
  const greekStudyLayersEnabled = isFathersMode
    ? hasGreekReaderAid
    : isStandaloneGreekVersion ||
        isStandaloneHebrewVersion ||
        settings.showEsvInterlinear ||
        (version === "kjv" && settings.showStrongs);
  const supportsOriginalWordSurface = isFathersMode
    ? hasGreekReaderAid
    : version === "esv" ||
      isStandaloneGreekVersion ||
      isStandaloneHebrewVersion ||
      (version === "kjv" && !isOldTestament);
  const supportsVerseStrongs = !isFathersMode &&
    (version === "kjv" ||
      version === "tr" ||
      isStandaloneHebrewVersion ||
      (version === "esv" && !isOldTestament));
  const hasVisibleGreekStudyLayer =
    settings.showGreekSurface ||
    settings.showGreekLemma ||
    settings.showGreekTransliteration ||
    settings.showGreekGloss ||
    settings.showGreekGrammarCards;
  const ORIGINAL_LANGUAGE_VERSIONS: readonly BundledBibleVersion[] = ["greek", "tr", "mt"];
  const availableSecondaryVersions = isFathersMode
    ? []
    : versionOptions
        .map((option) => option.id)
        .filter(
          (option): option is BundledBibleVersion =>
            option !== version && isInstalledBundledBibleVersion(option)
        )
        .sort((a, b) => {
          const aIsOriginal = ORIGINAL_LANGUAGE_VERSIONS.includes(a);
          const bIsOriginal = ORIGINAL_LANGUAGE_VERSIONS.includes(b);
          if (aIsOriginal === bIsOriginal) return 0;
          return aIsOriginal ? -1 : 1;
        });
  const selectedSecondaryVersions = isFathersMode
    ? []
    : getAlternateBundledVersions(
        version,
        settings.secondaryVerseTranslationVersions,
        availableSecondaryVersions,
        settings.secondaryVerseTranslationVersion
      );

  const handleVersionChange = (nextVersion: string) => {
    if (!isInstalledBundledBibleVersion(nextVersion) || nextVersion === version) {
      return;
    }

    setVersion(nextVersion);
  };

  const handleGreekGlossExport = () => {
    const result = downloadGreekGlossExportFile();

    if (!result) {
      setGreekGlossExportStatus("Greek gloss export is only available in the browser.");
      return;
    }

    const wordGlossLabel = result.overrideCount === 1 ? "word gloss" : "word glosses";
    const lemmaDefaultLabel =
      result.lemmaDefaultCount === 1 ? "lemma default" : "lemma defaults";

    setGreekGlossExportStatus(
      `Exported ${result.overrideCount} ${wordGlossLabel} and ${result.lemmaDefaultCount} ${lemmaDefaultLabel}.`
    );
  };

  const isQuickGreekInterlinearEnabled =
    version === "esv" ? settings.showEsvInterlinear : version === "kjv" ? settings.showStrongs : false;

  const handleTextSizeShift = (delta: number) => {
    updateSettings({
      bodyTextSize: Number((settings.bodyTextSize + delta).toFixed(2))
    });
  };

  const handleStrongsVerseTextSizeShift = (delta: number) => {
    updateSettings({
      strongsVerseTextSize: Number((settings.strongsVerseTextSize + delta).toFixed(2))
    });
  };

  const handleThayerTextSizeShift = (delta: number) => {
    updateSettings({
      thayerTextSize: Number((settings.thayerTextSize + delta).toFixed(2))
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
        showSecondaryVerseTranslation: false,
        secondaryVerseTranslationVersions: [],
        showAnnotatedGreekUndertext: false,
        showGreekSurface: false,
        showGreekLemma: false,
        showGreekTransliteration: false,
        showGreekGloss: false,
        showGreekGrammarCards: false,
        showExpandedGreekGrammarCards: false,
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
        showSecondaryVerseTranslation: false,
        secondaryVerseTranslationVersions: [],
        showAnnotatedGreekUndertext: true,
        showGreekSurface: true,
        showGreekLemma: true,
        showGreekTransliteration: true,
        showGreekGloss: true,
        showGreekGrammarCards: false,
        showExpandedGreekGrammarCards: false,
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
      showSecondaryVerseTranslation: false,
      secondaryVerseTranslationVersions: [],
      showAnnotatedGreekUndertext: false,
      showGreekSurface: false,
      showGreekLemma: false,
      showGreekTransliteration: false,
      showGreekGloss: false,
      showGreekGrammarCards: false,
      showExpandedGreekGrammarCards: false,
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
      | "showSecondaryVerseTranslation"
      | "showAnnotatedGreekUndertext"
      | "showVerseStrongs"
      | "showCustomVerseTranslation"
      | "showGreekSurface"
      | "showGreekLemma"
      | "showGreekTransliteration"
      | "showGreekGloss"
      | "showGreekGrammarCards"
      | "showExpandedGreekGrammarCards"
      | "showGreekGrammarPartOfSpeech"
      | "showGreekGrammarLemma"
      | "showGreekGrammarGloss"
      | "showGreekGrammarForm"
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
        showGreekGloss: false,
        showGreekGrammarCards: false,
        showExpandedGreekGrammarCards: false
      });
      return;
    }

    if (isStandaloneGreekVersion || isStandaloneHebrewVersion) {
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
        showGreekGloss: false,
        showGreekGrammarCards: false,
        showExpandedGreekGrammarCards: false
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
      showGreekGrammarCards: false,
      showExpandedGreekGrammarCards: false,
      showCustomVerseTranslation: false
    });
  };

  const handleNotebookOpen = () => {
    openNotebook();
    setIsPanelOpen(false);
  };

  const handleScriptureOpen = () => {
    setActiveUtilityPane("search");
    setActiveReaderPane("reading");
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
              <div className="reader-settings-field">
                <span>Theme</span>
                <div className="settings-option-grid settings-option-grid-compact">
                  {THEME_PRESETS.map((preset) => (
                    <button
                      aria-pressed={settings.themePreset === preset.id}
                      className={`settings-option-card theme-swatch-card${
                        settings.themePreset === preset.id ? " is-active" : ""
                      }`}
                      key={preset.id}
                      onClick={() => updateSettings({ themePreset: preset.id })}
                      type="button"
                    >
                      <span
                        className="theme-swatch-preview"
                        style={{ background: preset.preview.surface }}
                      >
                        <span
                          className="theme-swatch-dot"
                          style={{ background: preset.preview.accent }}
                        />
                        <span
                          className="theme-swatch-text"
                          style={{ color: preset.preview.text }}
                        >
                          Aa
                        </span>
                      </span>
                      <strong>{preset.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="reader-settings-field">
                <span>Desktop preview</span>
                <div className="reader-settings-shortcuts">
                  <button
                    aria-pressed={isMobilePreviewEnabled}
                    className={`reader-inline-button reader-settings-link${
                      isMobilePreviewEnabled ? " is-active" : ""
                    }`}
                    onClick={() => setMobilePreviewEnabled((current) => !current)}
                    type="button"
                  >
                    {isMobilePreviewEnabled ? "Mobile preview on" : "Mobile preview off"}
                  </button>
                </div>
                <p className="reader-settings-unavailable">
                  Forces desktop browsers to use the mobile reader flow for layout fixes.
                </p>
              </div>
              <div className="reader-settings-field">
                <span>Layout width</span>
                <div className="reader-settings-shortcuts">
                  <button
                    aria-pressed={settings.superwideLayout}
                    className={`reader-inline-button reader-settings-link${
                      settings.superwideLayout ? " is-active" : ""
                    }`}
                    onClick={() =>
                      updateSettings({
                        superwideLayout: !settings.superwideLayout
                      })
                    }
                    type="button"
                  >
                    {settings.superwideLayout ? "Superwide on" : "Superwide off"}
                  </button>
                </div>
                <p className="reader-settings-unavailable">
                  Expands the desktop reader shell further on ultrawide displays.
                </p>
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
                      settings.showSecondaryVerseTranslation ? " is-active" : ""
                    }`}
                    disabled={availableSecondaryVersions.length === 0}
                    key="showSecondaryVerseTranslation"
                    onClick={() => toggleLayer("showSecondaryVerseTranslation")}
                    type="button"
                  >
                    <strong>Under-verse version</strong>
                    <span>Show another selected Bible version directly under each verse.</span>
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
                  <span>Show the verse line assembled from the glosses you typed under each Greek word.</span>
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
            {!isFathersMode && availableSecondaryVersions.length > 0 ? (
              <div className="reader-settings-field-grid">
                <div className="reader-settings-field">
                  <span>Under-verse versions</span>
                  <div
                    aria-label="Under-verse versions"
                    className="reader-settings-shortcuts"
                    role="group"
                  >
                    {availableSecondaryVersions.map((candidateVersion) => {
                      const isSelected =
                        selectedSecondaryVersions.includes(candidateVersion);

                      return (
                        <button
                          aria-pressed={isSelected}
                          className={`reader-inline-button reader-settings-link${
                            isSelected ? " is-active" : ""
                          }`}
                          key={candidateVersion}
                          onClick={() =>
                            updateSettings({
                              secondaryVerseTranslationVersions: getNextSelectedVersions(
                                selectedSecondaryVersions,
                                candidateVersion
                              )
                            })
                          }
                          type="button"
                        >
                          {getBibleVersionLabel(candidateVersion)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="reader-settings-subsection">
            <p className="reader-settings-subsection-label">Reading shortcuts</p>
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
              <div
                className="reader-size-controls"
                role="group"
                aria-label="Strong's verse size controls"
              >
                <button
                  aria-label="Decrease Strong's verse size"
                  className="reader-inline-button"
                  onClick={() => handleStrongsVerseTextSizeShift(-0.04)}
                  type="button"
                >
                  S-
                </button>
                <span className="reader-controls-status">
                  Strongs {settings.strongsVerseTextSize.toFixed(2)}rem
                </span>
                <button
                  aria-label="Increase Strong's verse size"
                  className="reader-inline-button"
                  onClick={() => handleStrongsVerseTextSizeShift(0.04)}
                  type="button"
                >
                  S+
                </button>
              </div>
              <div
                className="reader-size-controls"
                role="group"
                aria-label="Thayer text size controls"
              >
                <button
                  aria-label="Decrease Thayer text size"
                  className="reader-inline-button"
                  onClick={() => handleThayerTextSizeShift(-0.04)}
                  type="button"
                >
                  T-
                </button>
                <span className="reader-controls-status">
                  Thayer {settings.thayerTextSize.toFixed(2)}rem
                </span>
                <button
                  aria-label="Increase Thayer text size"
                  className="reader-inline-button"
                  onClick={() => handleThayerTextSizeShift(0.04)}
                  type="button"
                >
                  T+
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
          {readerTools ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-subsection-label">Reader tools</p>
              <div className="reader-settings-shortcuts">{readerTools}</div>
            </div>
          ) : null}
          {!isFathersMode && isReaderRoute ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-subsection-label">Reading modes</p>
              <div className="reader-settings-shortcuts">
                <button
                  className={`reader-inline-button reader-settings-link${
                    activeReaderPane === "reading" ? " is-active" : ""
                  }`}
                  onClick={handleScriptureOpen}
                  type="button"
                >
                  Scripture
                </button>
                {!isHarmonyBook ? (
                  <button
                    className={`reader-inline-button reader-settings-link${
                      activeReaderPane === "harmony" ? " is-active" : ""
                    }`}
                    onClick={handleHarmonyOpen}
                    type="button"
                  >
                    Harmony
                  </button>
                ) : null}
                <button
                  className={`reader-inline-button reader-settings-link${
                    activeReaderPane === "study-sets" ? " is-active" : ""
                  }`}
                  onClick={handleStudySetsOpen}
                  type="button"
                >
                  Study sets
                </button>
                {!isHarmonyBook ? (
                  <button
                    className={`reader-inline-button reader-settings-link${
                      activeReaderPane === "compare" ? " is-active" : ""
                    }`}
                    onClick={handleCompareOpen}
                    type="button"
                  >
                    Compare
                  </button>
                ) : null}
                {isOldTestament && !isHarmonyBook ? (
                  <button
                    className={`reader-inline-button reader-settings-link${
                      activeReaderPane === "ot-compare" ? " is-active" : ""
                    }`}
                    onClick={handleOtCompareOpen}
                    type="button"
                  >
                    OT Compare
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          {!isFathersMode && isReaderRoute ? (
            <div className="reader-settings-subsection">
              <p className="reader-settings-subsection-label">Study pane</p>
              <div className="reader-settings-shortcuts">
                <button
                  className={`reader-inline-button reader-settings-link${
                    activeUtilityPane === "notebook" ? " is-active" : ""
                  }`}
                  onClick={handleNotebookOpen}
                  type="button"
                >
                  Notebook
                </button>
                <button
                  className={`reader-inline-button reader-settings-link${
                    activeUtilityPane === "sermons" ? " is-active" : ""
                  }`}
                  onClick={handleSermonsOpen}
                  type="button"
                >
                  Sermons
                </button>
                <button
                  className={`reader-inline-button reader-settings-link${
                    activeUtilityPane === "cross-references" ? " is-active" : ""
                  }`}
                  onClick={handleCrossReferencesOpen}
                  type="button"
                >
                  Cross refs
                </button>
              </div>
            </div>
          ) : null}
        </section>

        {supportsGreekStudyLayers ? (
          <details className="reader-settings-advanced">
            <summary className="reader-settings-advanced-summary">Greek</summary>

            <section className="reader-settings-section">
              <div className="reader-settings-section-header">
                <h3>{originalLanguageLabel} study layers</h3>
                <p>Font, size, and display controls for {originalLanguageLabel.toLowerCase()} reading.</p>
              </div>
              <div className="reader-settings-subsection">
                <p className="reader-settings-subsection-label">Font and size</p>
                <div className="reader-settings-field-grid">
                  <NumericField
                    disabled={!supportsGreekReading}
                    inputId="reader-menu-greek-text-size"
                    label={`${originalLanguageLabel} text size`}
                    max={4}
                    min={0.9}
                    onChange={(value) => updateNumericSetting("greekTextSize", value)}
                    step={0.01}
                    suffix="rem"
                    value={settings.greekTextSize}
                  />
                </div>
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
                <p className="reader-settings-subsection-label">Display layers</p>
                <div className="settings-option-grid settings-option-grid-compact">
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
                  <button
                    className={`settings-option-card${
                      settings.showGreekGrammarCards ? " is-active" : ""
                    }`}
                    disabled={!supportsGreekStudyLayers || !greekStudyLayersEnabled}
                    key="showGreekGrammarCards"
                    onClick={() =>
                      updateSettings({
                        showGreekGrammarCards: !settings.showGreekGrammarCards,
                        ...(!settings.showGreekGrammarCards && !settings.showGreekSurface
                          ? { showGreekSurface: true }
                          : {})
                      })
                    }
                    type="button"
                  >
                    <strong>{originalLanguageLabel} grammar cards</strong>
                    <span>
                      Show quick grammar cards under each {originalLanguageLabel.toLowerCase()} word, with a More section for full details.
                    </span>
                  </button>
                  <div className="reader-settings-greek-subgroup">
                    <button
                      className={`settings-option-card${
                        settings.showGreekGrammarPartOfSpeech ? " is-active" : ""
                      }`}
                      disabled={
                        !supportsGreekStudyLayers ||
                        !greekStudyLayersEnabled ||
                        !settings.showGreekGrammarCards
                      }
                      key="showGreekGrammarPartOfSpeech"
                      onClick={() => toggleLayer("showGreekGrammarPartOfSpeech")}
                      type="button"
                    >
                      <strong>Grammar type</strong>
                      <span>Show the part of speech line under each {originalLanguageLabel.toLowerCase()} word.</span>
                    </button>
                    <button
                      className={`settings-option-card${
                        settings.showGreekGrammarLemma ? " is-active" : ""
                      }`}
                      disabled={
                        !supportsGreekStudyLayers ||
                        !greekStudyLayersEnabled ||
                        !settings.showGreekGrammarCards
                      }
                      key="showGreekGrammarLemma"
                      onClick={() => toggleLayer("showGreekGrammarLemma")}
                      type="button"
                    >
                      <strong>Grammar lemma</strong>
                      <span>Show the lemma line in the inline grammar card.</span>
                    </button>
                    <button
                      className={`settings-option-card${
                        settings.showGreekGrammarGloss ? " is-active" : ""
                      }`}
                      disabled={
                        !supportsGreekStudyLayers ||
                        !greekStudyLayersEnabled ||
                        !settings.showGreekGrammarCards
                      }
                      key="showGreekGrammarGloss"
                      onClick={() => toggleLayer("showGreekGrammarGloss")}
                      type="button"
                    >
                      <strong>Grammar gloss</strong>
                      <span>Show the gloss line in the inline grammar card.</span>
                    </button>
                    <button
                      className={`settings-option-card${
                        settings.showGreekGrammarForm ? " is-active" : ""
                      }`}
                      disabled={
                        !supportsGreekStudyLayers ||
                        !greekStudyLayersEnabled ||
                        !settings.showGreekGrammarCards
                      }
                      key="showGreekGrammarForm"
                      onClick={() => toggleLayer("showGreekGrammarForm")}
                      type="button"
                    >
                      <strong>Grammar form</strong>
                      <span>Show the case or tense summary line in the inline grammar card.</span>
                    </button>
                    <button
                      className={`settings-option-card${
                        settings.showExpandedGreekGrammarCards ? " is-active" : ""
                      }`}
                      disabled={
                        !supportsGreekStudyLayers ||
                        !greekStudyLayersEnabled ||
                        !settings.showGreekGrammarCards
                      }
                      key="showExpandedGreekGrammarCards"
                      onClick={() => toggleLayer("showExpandedGreekGrammarCards")}
                      type="button"
                    >
                      <strong>Expanded grammar details</strong>
                      <span>Open each grammar card with morphology, hints, and linked phrases already expanded.</span>
                    </button>
                  </div>
                </div>
                {originalLanguageLabel === "Greek" ? (
                  <div className="reader-settings-greek-actions">
                    <button
                      className="reader-inline-button reader-settings-link"
                      onClick={handleGreekGlossExport}
                      type="button"
                    >
                      Export Greek glosses
                    </button>
                    {greekGlossExportStatus ? (
                      <p className="reader-settings-status" role="status">
                        {greekGlossExportStatus}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          </details>
        ) : null}

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
                inputId="reader-menu-strongs-verse-text-size"
                label="Strong's verse size"
                max={3.25}
                min={0.72}
                onChange={(value) => updateNumericSetting("strongsVerseTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.strongsVerseTextSize}
              />
              <NumericField
                inputId="reader-menu-thayer-text-size"
                label="Thayer text size"
                max={3.25}
                min={0.72}
                onChange={(value) => updateNumericSetting("thayerTextSize", value)}
                step={0.01}
                suffix="rem"
                value={settings.thayerTextSize}
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
