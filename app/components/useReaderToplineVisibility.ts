"use client";

import { useEffect, useState } from "react";

const REVEAL_AT_TOP_SCROLL_Y = 24;
const HIDE_SCROLL_Y = 72;
const HIDE_DISTANCE_THRESHOLD = 20;
const SHOW_DISTANCE_THRESHOLD = 12;

export function useReaderToplineVisibility(forceVisible = false) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      return;
    }

    let lastScrollY = window.scrollY;
    let accumulatedDownwardDistance = 0;
    let accumulatedUpwardDistance = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= REVEAL_AT_TOP_SCROLL_Y) {
        setIsVisible(true);
        accumulatedDownwardDistance = 0;
        accumulatedUpwardDistance = 0;
      } else if (delta > 0) {
        accumulatedDownwardDistance += delta;
        accumulatedUpwardDistance = 0;

        if (currentScrollY > HIDE_SCROLL_Y && accumulatedDownwardDistance >= HIDE_DISTANCE_THRESHOLD) {
          setIsVisible(false);
          accumulatedDownwardDistance = 0;
        }
      } else if (delta < 0) {
        accumulatedUpwardDistance += Math.abs(delta);
        accumulatedDownwardDistance = 0;

        if (accumulatedUpwardDistance >= SHOW_DISTANCE_THRESHOLD) {
          setIsVisible(true);
          accumulatedUpwardDistance = 0;
        }
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
