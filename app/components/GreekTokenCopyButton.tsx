"use client";

import { useEffect, useRef, useState } from "react";

import type { GreekToken } from "@/lib/bible/types";

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

export function getGreekTokenCopyText(token: GreekToken) {
  const form = token.morphology
    ? `${token.morphology}${token.decodedMorphology ? ` — ${token.decodedMorphology}` : ""}`
    : token.decodedMorphology ?? "unknown form";

  return [token.surface, form].join("\n");
}

type GreekTokenCopyButtonProps = {
  token: GreekToken;
};

export function GreekTokenCopyButton({ token }: GreekTokenCopyButtonProps) {
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
    try {
      await copyPlainText(getGreekTokenCopyText(token));
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
    }, 1600);
  };

  return (
    <button
      aria-label={`Copy Greek word and form for ${token.surface}`}
      className={`verse-greek-token-copy${copyState === "copied" ? " is-copied" : ""}${
        copyState === "error" ? " is-error" : ""
      }`}
      onClick={() => void handleCopy()}
      type="button"
    >
      {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
    </button>
  );
}
