"use client";

import type {
  InitProgressCallback,
  InitProgressReport,
  MLCEngineInterface
} from "@mlc-ai/web-llm";

const LOCAL_BIBLE_AI_MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const SPLIT_VIEW_MEDIA_QUERY = "(min-width: 64rem)";

export type LocalBibleAiAvailability = {
  isSupported: boolean;
  reason: string;
};

let enginePromise: Promise<MLCEngineInterface> | null = null;
let activeEngine: MLCEngineInterface | null = null;

function isTouchMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iPad|iPhone|Android/i.test(navigator.userAgent ?? "");
}

function isDesktopViewport() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(SPLIT_VIEW_MEDIA_QUERY).matches;
}

export function getLocalBibleAiAvailability(): LocalBibleAiAvailability {
  if (typeof window === "undefined") {
    return {
      isSupported: false,
      reason: "AI is only available in the browser."
    };
  }

  if (isTouchMobileDevice() || !isDesktopViewport()) {
    return {
      isSupported: false,
      reason: "Local AI is desktop-first right now."
    };
  }

  if (typeof navigator === "undefined" || !("gpu" in navigator)) {
    return {
      isSupported: false,
      reason: "WebGPU is not available in this browser."
    };
  }

  return {
    isSupported: true,
    reason: ""
  };
}

export async function loadLocalBibleAi(
  onProgress?: InitProgressCallback
): Promise<MLCEngineInterface> {
  const availability = getLocalBibleAiAvailability();

  if (!availability.isSupported) {
    throw new Error(availability.reason);
  }

  if (activeEngine) {
    if (onProgress) {
      onProgress({
        progress: 1,
        text: "Model ready.",
        timeElapsed: 0
      });
    }

    return activeEngine;
  }

  if (!enginePromise) {
    enginePromise = import("@mlc-ai/web-llm")
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(LOCAL_BIBLE_AI_MODEL_ID, {
          initProgressCallback: onProgress
        })
      )
      .then((engine) => {
        activeEngine = engine;
        return engine;
      })
      .catch((error) => {
        enginePromise = null;
        throw error;
      });
  }

  return enginePromise;
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item) {
          return String(item.text ?? "");
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

export async function generateLocalBibleAiAnswer({
  systemPrompt,
  userPrompt
}: {
  systemPrompt: string;
  userPrompt: string;
}) {
  const engine = await loadLocalBibleAi();
  const completion = await engine.chat.completions.create({
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: userPrompt
      }
    ],
    temperature: 0.2,
    max_tokens: 420
  });

  return normalizeMessageContent(completion.choices[0]?.message?.content);
}

export function normalizeLocalBibleAiProgress(report: InitProgressReport | null) {
  if (!report) {
    return {
      progress: 0,
      label: ""
    };
  }

  return {
    progress: Math.max(0, Math.min(1, report.progress)),
    label: report.text.trim()
  };
}

export async function unloadLocalBibleAi() {
  if (!activeEngine) {
    enginePromise = null;
    return;
  }

  await activeEngine.unload();
  activeEngine = null;
  enginePromise = null;
}

export function resetLocalBibleAiForTests() {
  activeEngine = null;
  enginePromise = null;
}
