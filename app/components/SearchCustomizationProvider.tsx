"use client";

import {
  createContext,
  type CSSProperties,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import type { SearchCustomizationSettings } from "@/lib/bible/types";
import {
  DEFAULT_SEARCH_CUSTOMIZATION,
  SEARCH_CUSTOMIZATION_STORAGE_KEY,
  getSearchCustomizationVariables,
  normalizeSearchCustomization
} from "@/lib/search-customization";

type SearchCustomizationContextValue = {
  settings: SearchCustomizationSettings;
  updateSettings: (updates: Partial<SearchCustomizationSettings>) => void;
  resetSettings: () => void;
  style: CSSProperties;
};

const SearchCustomizationContext = createContext<SearchCustomizationContextValue | null>(null);

export function SearchCustomizationProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState(DEFAULT_SEARCH_CUSTOMIZATION);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SEARCH_CUSTOMIZATION_STORAGE_KEY);

      if (!stored) {
        return;
      }

      setSettings(normalizeSearchCustomization(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(SEARCH_CUSTOMIZATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SEARCH_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const value = useMemo<SearchCustomizationContextValue>(
    () => ({
      settings,
      updateSettings: (updates) => {
        setSettings((current) => normalizeSearchCustomization({ ...current, ...updates }));
      },
      resetSettings: () => {
        setSettings(DEFAULT_SEARCH_CUSTOMIZATION);
      },
      style: getSearchCustomizationVariables(settings) as CSSProperties
    }),
    [settings]
  );

  return (
    <SearchCustomizationContext.Provider value={value}>
      {children}
    </SearchCustomizationContext.Provider>
  );
}

export function useSearchCustomization() {
  const context = useContext(SearchCustomizationContext);

  if (!context) {
    throw new Error("useSearchCustomization must be used within SearchCustomizationProvider.");
  }

  return context;
}
