"use client";

import {
  createContext,
  type CSSProperties,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type { ReaderCustomizationSettings } from "@/lib/bible/types";
import {
  DEFAULT_READER_CUSTOMIZATION,
  READER_CUSTOMIZATION_STORAGE_KEY,
  getReaderShellMaxWidthRem,
  getReaderCustomizationVariables,
  normalizeReaderCustomization
} from "@/lib/reader-customization";

type ReaderCustomizationContextValue = {
  isPanelOpen: boolean;
  setIsPanelOpen: Dispatch<SetStateAction<boolean>>;
  settings: ReaderCustomizationSettings;
  updateSettings: (updates: Partial<ReaderCustomizationSettings>) => void;
  resetSettings: () => void;
  style: CSSProperties;
};

const ReaderCustomizationContext = createContext<ReaderCustomizationContextValue | null>(null);

export function ReaderCustomizationProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_READER_CUSTOMIZATION);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(READER_CUSTOMIZATION_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setSettings(normalizeReaderCustomization(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(READER_CUSTOMIZATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(READER_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--reader-shell-max-width",
      `${getReaderShellMaxWidthRem(settings)}rem`
    );
  }, [settings]);

  useEffect(() => {
    if (settings.themePreset === "parchment") {
      document.documentElement.classList.add("reader-light-theme");
    } else {
      document.documentElement.classList.remove("reader-light-theme");
    }
  }, [settings.themePreset]);

  const value = useMemo<ReaderCustomizationContextValue>(
    () => ({
      isPanelOpen,
      setIsPanelOpen,
      settings,
      updateSettings: (updates) => {
        setSettings((current) =>
          normalizeReaderCustomization({
            ...current,
            ...updates,
            ...(Object.prototype.hasOwnProperty.call(updates, "readerPreset")
              ? {}
              : { readerPreset: "custom" })
          })
        );
      },
      resetSettings: () => {
        setSettings(DEFAULT_READER_CUSTOMIZATION);
      },
      style: getReaderCustomizationVariables(settings) as CSSProperties
    }),
    [isPanelOpen, settings]
  );

  return (
    <ReaderCustomizationContext.Provider value={value}>
      {children}
    </ReaderCustomizationContext.Provider>
  );
}

export function useReaderCustomization() {
  const context = useContext(ReaderCustomizationContext);

  if (!context) {
    throw new Error("useReaderCustomization must be used within ReaderCustomizationProvider.");
  }

  return context;
}
