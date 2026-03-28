"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

import { LookupPane } from "@/app/components/LookupPane";
import { useLookup } from "@/app/components/LookupProvider";

const SPLIT_LAYOUT_WIDTH_STORAGE_KEY = "bible-reader.split-layout-width-rem";
const MIN_LOOKUP_WIDTH_REM = 22;
const MAX_LOOKUP_WIDTH_REM = 52;
const DEFAULT_LOOKUP_WIDTH_REM = 24;
const LOOKUP_WIDTH_PER_EXTRA_QUERY_REM = 14;

function clampLookupWidthRem(value: number) {
  return Math.min(MAX_LOOKUP_WIDTH_REM, Math.max(MIN_LOOKUP_WIDTH_REM, value));
}

function getRootFontSize() {
  return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function AppSplitLayout({ children }: PropsWithChildren) {
  const { isDesktop, queryParts } = useLookup();
  const [manualLookupWidthRem, setManualLookupWidthRem] = useState<number | null>(null);

  const queryCount = Math.max(queryParts.length, 1);
  const automaticLookupWidthRem = useMemo(
    () =>
      clampLookupWidthRem(
        DEFAULT_LOOKUP_WIDTH_REM + (queryCount - 1) * LOOKUP_WIDTH_PER_EXTRA_QUERY_REM
      ),
    [queryCount]
  );
  const effectiveLookupWidthRem = manualLookupWidthRem ?? automaticLookupWidthRem;

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

    setManualLookupWidthRem(clampLookupWidthRem(parsedValue));
  }, []);

  useEffect(() => {
    if (manualLookupWidthRem === null) {
      window.localStorage.removeItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY, String(manualLookupWidthRem));
  }, [manualLookupWidthRem]);

  const beginResize = (startClientX: number) => {
    const startingWidthRem = effectiveLookupWidthRem;
    const rootFontSize = getRootFontSize();

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = startClientX - event.clientX;
      const nextWidthRem = clampLookupWidthRem(startingWidthRem + deltaX / rootFontSize);
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
      className="app-layout"
      style={
        {
          ["--app-layout-lookup-width" as string]: `${effectiveLookupWidthRem}rem`
        }
      }
    >
      <main className="site-main app-layout-main">{children}</main>
      {isDesktop ? (
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
