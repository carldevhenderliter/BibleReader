"use client";

import { useEffect, useState } from "react";

const REVEAL_AT_TOP_SCROLL_Y = 24;
const HIDE_SCROLL_Y = 96;
const SCROLL_DELTA_THRESHOLD = 8;

export function useReaderToplineVisibility(forceVisible = false) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      return;
    }

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= REVEAL_AT_TOP_SCROLL_Y) {
        setIsVisible(true);
      } else if (delta > SCROLL_DELTA_THRESHOLD && currentScrollY > HIDE_SCROLL_Y) {
        setIsVisible(false);
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [forceVisible]);

  return isVisible;
}
