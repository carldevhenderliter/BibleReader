import type { Verse } from "@/lib/bible/types";
import {
  buildChapterSpeechText,
  DEFAULT_READER_TTS_SETTINGS,
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
        rate: 3,
        pitch: -1
      })
    ).toEqual({
      voiceURI: "voice-1",
      rate: 1.6,
      pitch: 0.5
    });
    expect(normalizeReaderTtsSettings(null)).toEqual(DEFAULT_READER_TTS_SETTINGS);
  });
});
