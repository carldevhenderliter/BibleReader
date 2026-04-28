"use client";

import type { PropsWithChildren } from "react";

export function ReaderBottomControlsDock({ children }: PropsWithChildren) {
  return (
    <div className="reader-bottom-controls-dock" aria-hidden="false">
      <div className="reader-bottom-controls-dock-inner">{children}</div>
    </div>
  );
}
