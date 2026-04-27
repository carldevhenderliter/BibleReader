"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

async function copyPlainText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Copy command failed.");
  }
}

function getReadableText(target: HTMLElement | null) {
  if (!target) {
    return "";
  }

  const text =
    typeof target.innerText === "string" && target.innerText.trim().length > 0
      ? target.innerText
      : target.textContent ?? "";

  return text.trim();
}

type ReaderCopyButtonProps = {
  targetRef: RefObject<HTMLElement | null>;
};

export function ReaderCopyButton({ targetRef }: ReaderCopyButtonProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    const text = getReadableText(targetRef.current);

    if (!text) {
      setCopyState("error");
      return;
    }

    try {
      await copyPlainText(text);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimeoutRef.current = null;
    }, 1800);
  };

  return (
    <button className="reader-inline-button" onClick={() => void handleCopy()} type="button">
      {copyState === "copied"
        ? "Copied!"
        : copyState === "error"
          ? "Copy failed"
          : "Copy text"}
    </button>
  );
}
