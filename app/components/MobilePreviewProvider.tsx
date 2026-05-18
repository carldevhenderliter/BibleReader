"use client";

import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export const MOBILE_PREVIEW_STORAGE_KEY = "bible-reader:mobile-preview";

type MobilePreviewContextValue = {
  isMobilePreviewEnabled: boolean;
  setMobilePreviewEnabled: Dispatch<SetStateAction<boolean>>;
};

const MobilePreviewContext = createContext<MobilePreviewContextValue>({
  isMobilePreviewEnabled: false,
  setMobilePreviewEnabled: () => {}
});

export function MobilePreviewProvider({ children }: PropsWithChildren) {
  const [isMobilePreviewEnabled, setMobilePreviewEnabled] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setMobilePreviewEnabled(
      window.localStorage.getItem(MOBILE_PREVIEW_STORAGE_KEY) === "true"
    );
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "mobile-preview-enabled",
      isMobilePreviewEnabled
    );
    document.body.classList.toggle("mobile-preview-enabled", isMobilePreviewEnabled);

    return () => {
      document.documentElement.classList.remove("mobile-preview-enabled");
      document.body.classList.remove("mobile-preview-enabled");
    };
  }, [isMobilePreviewEnabled]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    window.localStorage.setItem(
      MOBILE_PREVIEW_STORAGE_KEY,
      isMobilePreviewEnabled ? "true" : "false"
    );
  }, [hasHydrated, isMobilePreviewEnabled]);

  const value = useMemo<MobilePreviewContextValue>(
    () => ({
      isMobilePreviewEnabled,
      setMobilePreviewEnabled
    }),
    [isMobilePreviewEnabled]
  );

  return (
    <MobilePreviewContext.Provider value={value}>
      {children}
    </MobilePreviewContext.Provider>
  );
}

export function useMobilePreview() {
  return useContext(MobilePreviewContext);
}
