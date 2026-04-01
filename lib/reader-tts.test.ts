import type { Verse } from "@/lib/bible/types";
import {
  buildChapterSpeechText,
  DEFAULT_READER_TTS_SETTINGS,
  isKokoroTtsSupported,
  normalizeReaderTtsSettings
} from "@/lib/reader-tts";

describe("reader tts helpers", () => {
  it("builds chapter speech copy from verse text without verse numbers", () => {
    const verses: Verse[] = [
      { number: 1, text: "In the beginning, God created the heavens and the earth." },
      { number: 2, text: "The earth was formless and empty." }
    ];

    expect(buildChapterSpeechText("Genesis", 1, verses)).toBe(
      "Genesis chapter 1. In the beginning, God created the heavens and the earth. The earth was formless and empty."
    );
  });

  it("normalizes persisted tts settings", () => {
    expect(
      normalizeReaderTtsSettings({
        voiceURI: "voice-1",
        kokoroVoice: "af_bella",
        rate: 3,
        pitch: -1
      })
    ).toEqual({
      browserVoiceURI: "voice-1",
      kokoroVoice: "af_bella",
      rate: 1.6,
      pitch: 0.5
    });
    expect(normalizeReaderTtsSettings(null)).toEqual(DEFAULT_READER_TTS_SETTINGS);
  });

  it("requires audio and object-url support for kokoro playback", () => {
    expect(isKokoroTtsSupported()).toBe(false);

    Object.defineProperty(window, "Audio", {
      configurable: true,
      writable: true,
      value: class MockAudio {}
    });
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: () => "blob:kokoro"
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: () => {}
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"
    });

    expect(isKokoroTtsSupported()).toBe(true);
  });
});
