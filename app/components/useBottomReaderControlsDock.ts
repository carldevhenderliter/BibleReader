"use client";

import { useEffect, useState } from "react";

const BOTTOM_READER_CONTROLS_MEDIA_QUERY = "(max-width: 63.99rem)";

function getShouldShowBottomReaderControls() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(BOTTOM_READER_CONTROLS_MEDIA_QUERY).matches
  );
}

export function useBottomReaderControlsDock() {
  const [shouldShowBottomReaderControls, setShouldShowBottomReaderControls] = useState(
    getShouldShowBottomReaderControls
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setShouldShowBottomReaderControls(false);
      return;
    }

    const mediaQuery = window.matchMedia(BOTTOM_READER_CONTROLS_MEDIA_QUERY);
    const handleChange = () => {
      setShouldShowBottomReaderControls(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return shouldShowBottomReaderControls;
}
