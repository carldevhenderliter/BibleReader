"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

import { LookupPane } from "@/app/components/LookupPane";
import { useLookup } from "@/app/components/LookupProvider";

const SPLIT_LAYOUT_WIDTH_STORAGE_KEY = "bible-reader.split-layout-width-rem";
const MIN_LOOKUP_WIDTH_REM = 18;
const DEFAULT_LOOKUP_WIDTH_REM = 20;
const LOOKUP_WIDTH_PER_EXTRA_QUERY_REM = 14;
const LOOKUP_WIDTH_MAX_VIEWPORT_RATIO = 0.75;

function getRootFontSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function getMaximumLookupWidthRem() {
  return Math.max(
    MIN_LOOKUP_WIDTH_REM,
    (window.innerWidth * LOOKUP_WIDTH_MAX_VIEWPORT_RATIO) / getRootFontSize()
  );
}

function clampLookupWidthRem(value: number, maximumLookupWidthRem: number) {
  return Math.min(maximumLookupWidthRem, Math.max(MIN_LOOKUP_WIDTH_REM, value));
}

export function AppSplitLayout({ children }: PropsWithChildren) {
  const { isSplitViewActive, queryParts } = useLookup();
  const [manualLookupWidthRem, setManualLookupWidthRem] = useState<number | null>(null);
  const [maximumLookupWidthRem, setMaximumLookupWidthRem] = useState(() =>
    typeof window === "undefined" ? DEFAULT_LOOKUP_WIDTH_REM : getMaximumLookupWidthRem()
  );

  const queryCount = Math.max(queryParts.length, 1);
  const automaticLookupWidthRem = useMemo(
    () =>
      clampLookupWidthRem(
        DEFAULT_LOOKUP_WIDTH_REM + (queryCount - 1) * LOOKUP_WIDTH_PER_EXTRA_QUERY_REM,
        maximumLookupWidthRem
      ),
    [maximumLookupWidthRem, queryCount]
  );
  const effectiveLookupWidthRem = clampLookupWidthRem(
    manualLookupWidthRem ?? automaticLookupWidthRem,
    maximumLookupWidthRem
  );

  useEffect(() => {
    const syncMaximumWidth = () => {
      setMaximumLookupWidthRem(getMaximumLookupWidthRem());
    };

    syncMaximumWidth();
    window.addEventListener("resize", syncMaximumWidth);

    return () => {
      window.removeEventListener("resize", syncMaximumWidth);
    };
  }, []);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    const parsedValue = Number(storedValue);

    if (!Number.isFinite(parsedValue)) {
      window.localStorage.removeItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY);
      return;
    }

    setManualLookupWidthRem(clampLookupWidthRem(parsedValue, maximumLookupWidthRem));
  }, [maximumLookupWidthRem]);

  useEffect(() => {
    if (manualLookupWidthRem === null) {
      return;
    }

    const clampedWidth = clampLookupWidthRem(manualLookupWidthRem, maximumLookupWidthRem);

    if (clampedWidth !== manualLookupWidthRem) {
      setManualLookupWidthRem(clampedWidth);
    }
  }, [manualLookupWidthRem, maximumLookupWidthRem]);

  useEffect(() => {
    if (manualLookupWidthRem === null) {
      window.localStorage.removeItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY, String(manualLookupWidthRem));
  }, [manualLookupWidthRem]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-layout-lookup-width",
      `${effectiveLookupWidthRem}rem`
    );
  }, [effectiveLookupWidthRem]);

  const beginResize = (startClientX: number) => {
    const startingWidthRem = effectiveLookupWidthRem;
    const rootFontSize = getRootFontSize();

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = startClientX - event.clientX;
      const nextWidthRem = clampLookupWidthRem(
        startingWidthRem + deltaX / rootFontSize,
        getMaximumLookupWidthRem()
      );
      setManualLookupWidthRem(nextWidthRem);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      className={`app-layout${isSplitViewActive ? " app-layout-split" : ""}`}
      style={
        {
          ["--app-layout-lookup-width" as string]: `${effectiveLookupWidthRem}rem`
        }
      }
    >
      <main className="site-main app-layout-main">{children}</main>
      {isSplitViewActive ? (
        <button
          aria-label="Resize split view"
          className="app-layout-divider"
          onDoubleClick={() => setManualLookupWidthRem(null)}
          onPointerDown={(event) => beginResize(event.clientX)}
          title="Drag to resize. Double-click to reset."
          type="button"
        />
      ) : null}
      <LookupPane />
    </div>
  );
}
