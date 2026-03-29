"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { getStrongsEntries } from "@/lib/bible/strongs";
import type { StrongsEntry } from "@/lib/bible/types";

type ActiveStrongsToken = {
  rect: DOMRect;
  strongsNumbers: string[];
  text: string;
};

type StrongsPopoverProps = {
  activeToken: ActiveStrongsToken | null;
  onClose: () => void;
};

const MOBILE_POPOVER_MEDIA_QUERY = "(max-width: 47.99rem)";

function getIsMobilePopover() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(MOBILE_POPOVER_MEDIA_QUERY).matches
  );
}

export function StrongsPopover({ activeToken, onClose }: StrongsPopoverProps) {
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [isMobile, setIsMobile] = useState(() => getIsMobilePopover());

  useEffect(() => {
    if (!activeToken) {
      setEntries([]);
      return;
    }

    let isCancelled = false;

    void getStrongsEntries(activeToken.strongsNumbers).then((nextEntries) => {
      if (!isCancelled) {
        setEntries(nextEntries);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeToken]);

  useEffect(() => {
    if (!activeToken || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_POPOVER_MEDIA_QUERY);
    const syncMode = () => {
      setIsMobile(mediaQuery.matches);
    };

    syncMode();
    mediaQuery.addEventListener("change", syncMode);

    return () => {
      mediaQuery.removeEventListener("change", syncMode);
    };
  }, [activeToken]);

  useEffect(() => {
    if (!activeToken) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleViewportChange = () => {
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeToken, onClose]);

  const desktopStyle = useMemo(() => {
    if (!activeToken || isMobile) {
      return undefined;
    }

    const maxWidth = 360;
    const viewportPadding = 12;
    const desiredLeft = activeToken.rect.left;
    const left = Math.min(
      Math.max(viewportPadding, desiredLeft),
      window.innerWidth - maxWidth - viewportPadding
    );
    const top = Math.min(
      activeToken.rect.bottom + 10,
      window.innerHeight - 340
    );

    return {
      left: `${left}px`,
      top: `${Math.max(viewportPadding, top)}px`,
      width: `${maxWidth}px`
    };
  }, [activeToken, isMobile]);

  if (!activeToken || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <button
        aria-label="Close Strongs details"
        className="strongs-popover-backdrop"
        onClick={onClose}
        type="button"
      />
      <aside
        className={`strongs-popover${isMobile ? " strongs-popover-mobile" : ""}`}
        role="dialog"
        style={desktopStyle}
      >
        <div className="strongs-popover-header">
          <div>
            <p className="eyebrow">Strongs Study</p>
            <h3 className="strongs-popover-title">{activeToken.text.trim() || "Tagged word"}</h3>
          </div>
          <button className="strongs-popover-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="strongs-popover-body">
          {entries.length === 0 ? (
            <p className="strongs-popover-empty">No Strongs entry details are available for this token.</p>
          ) : (
            entries.map((entry) => (
              <article className="strongs-entry-card" key={entry.id}>
                <div className="strongs-entry-header">
                  <span className="strongs-entry-number">{entry.id}</span>
                  <span className="strongs-entry-language">
                    {entry.language === "hebrew" ? "Hebrew" : "Greek"}
                  </span>
                </div>
                <p className="strongs-entry-lemma">{entry.lemma}</p>
                {entry.transliteration ? (
                  <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
                ) : null}
                {entry.partOfSpeech ? (
                  <p className="strongs-entry-meta">Part of speech: {entry.partOfSpeech}</p>
                ) : null}
                {entry.definition ? (
                  <p className="strongs-entry-copy">{entry.definition}</p>
                ) : null}
                {entry.outlineUsage ? (
                  <p className="strongs-entry-copy">{entry.outlineUsage}</p>
                ) : null}
                {entry.rootWord ? (
                  <p className="strongs-entry-meta">Root word: {entry.rootWord}</p>
                ) : null}
              </article>
            ))
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}
