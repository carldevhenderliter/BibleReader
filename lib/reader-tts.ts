import { READER_TTS_SETTINGS_STORAGE_KEY } from "@/lib/bible/constants";
import type { ReaderTtsSettings, Verse } from "@/lib/bible/types";

export const READER_TTS_STORAGE_KEY = READER_TTS_SETTINGS_STORAGE_KEY;

export const DEFAULT_READER_TTS_SETTINGS: ReaderTtsSettings = {
  voiceURI: null,
  rate: 1,
  pitch: 1
};

const RATE_RANGE = { min: 0.6, max: 1.6 };
const PITCH_RANGE = { min: 0.5, max: 1.5 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function isBrowserTtsSupported() {
  return (
    typeof window !== "undefined" &&
    typeof window.speechSynthesis !== "undefined" &&
    typeof window.SpeechSynthesisUtterance !== "undefined"
  );
}

export function normalizeReaderTtsSettings(value: unknown): ReaderTtsSettings {
  if (!value || typeof value !== "object") {
    return DEFAULT_READER_TTS_SETTINGS;
  }

  const candidate = value as Partial<ReaderTtsSettings>;

  return {
    voiceURI:
      typeof candidate.voiceURI === "string" && candidate.voiceURI.trim().length > 0
        ? candidate.voiceURI
        : null,
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
