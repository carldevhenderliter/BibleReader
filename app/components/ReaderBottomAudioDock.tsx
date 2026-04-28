"use client";

import type { PropsWithChildren } from "react";

export function ReaderBottomAudioDock({ children }: PropsWithChildren) {
  return (
    <div className="reader-bottom-audio-dock" aria-hidden="false">
      <div className="reader-bottom-audio-dock-inner">{children}</div>
    </div>
  );
}
