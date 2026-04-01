import { READER_TTS_SETTINGS_STORAGE_KEY } from "@/lib/bible/constants";
import type { ReaderTtsSettings, Verse } from "@/lib/bible/types";

export const READER_TTS_STORAGE_KEY = READER_TTS_SETTINGS_STORAGE_KEY;
export const KOKORO_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
export const DEFAULT_KOKORO_VOICE = "af_heart";

export const DEFAULT_READER_TTS_SETTINGS: ReaderTtsSettings = {
  kokoroVoice: DEFAULT_KOKORO_VOICE,
  rate: 1,
  pitch: 1
};

const RATE_RANGE = { min: 0.6, max: 1.6 };
const PITCH_RANGE = { min: 0.5, max: 1.5 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isKokoroTtsSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.Blob !== "undefined" &&
    (typeof window.AudioContext !== "undefined" ||
      typeof (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !==
        "undefined") &&
    !/Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent)
  );
}

export function getPreferredKokoroDevice() {
  if (typeof navigator !== "undefined" && "gpu" in navigator) {
    return "webgpu" as const;
  }

  return "wasm" as const;
}

export function normalizeReaderTtsSettings(value: unknown): ReaderTtsSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_READER_TTS_SETTINGS;
  }

  const candidate = value as Partial<ReaderTtsSettings> & {
    voiceURI?: string | null;
  };

  return {
    kokoroVoice:
      typeof candidate.kokoroVoice === "string" && candidate.kokoroVoice.trim().length > 0
        ? candidate.kokoroVoice
        : DEFAULT_READER_TTS_SETTINGS.kokoroVoice,
    rate:
      typeof candidate.rate === "number"
        ? clamp(candidate.rate, RATE_RANGE.min, RATE_RANGE.max)
        : DEFAULT_READER_TTS_SETTINGS.rate,
    pitch:
      typeof candidate.pitch === "number"
        ? clamp(candidate.pitch, PITCH_RANGE.min, PITCH_RANGE.max)
        : DEFAULT_READER_TTS_SETTINGS.pitch
  };
}

export function buildChapterSpeechText(bookName: string, chapterNumber: number, verses: Verse[]) {
  const body = verses
    .map((verse) => verse.text.trim())
    .filter((text) => text.length > 0)
    .join(" ");

  return `${bookName} chapter ${chapterNumber}. ${body}`.trim();
}
