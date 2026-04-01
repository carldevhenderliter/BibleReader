"use client";

import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type {
  ReaderTtsEngine,
  ReaderTtsKokoroStatus,
  ReaderTtsSettings,
  ReaderTtsStatus
} from "@/lib/bible/types";
import { getChapterHref } from "@/lib/bible/utils";
import {
  DEFAULT_KOKORO_VOICE,
  DEFAULT_READER_TTS_SETTINGS,
  getPreferredKokoroDevice,
  isBrowserTtsSupported,
  isKokoroTtsSupported,
  KOKORO_MODEL_ID,
  normalizeReaderTtsSettings,
  READER_TTS_STORAGE_KEY
} from "@/lib/reader-tts";

type ReaderTtsVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
};

type ReaderTtsKokoroVoice = {
  id: string;
  name: string;
  language: string;
  gender: string;
  traits?: string;
};

type ReaderTtsSourceChapter = {
  chapterNumber: number;
  text: string;
};

type ReaderTtsSource = {
  bookSlug: string;
  bookName: string;
  chapterCount: number;
  currentChapterNumber: number;
  chapters: ReaderTtsSourceChapter[];
  view: "chapter" | "book";
  scrollToChapter?: (chapterNumber: number) => void;
};

type ReaderTtsSession = {
  bookSlug: string;
  chapterCount: number;
  chapterNumber: number;
  view: "chapter" | "book";
  version: string;
};

type ReaderTtsContextValue = {
  activeChapterNumber: number | null;
  activeEngine: ReaderTtsEngine | null;
  browserVoices: ReaderTtsVoice[];
  hasSource: boolean;
  isSupported: boolean;
  kokoroStatus: ReaderTtsKokoroStatus;
  kokoroVoices: ReaderTtsKokoroVoice[];
  pause: () => void;
  play: () => void;
  resume: () => void;
  setReadingSource: (source: ReaderTtsSource | null) => void;
  settings: ReaderTtsSettings;
  status: ReaderTtsStatus;
  stop: () => void;
  updateSettings: (updates: Partial<ReaderTtsSettings>) => void;
};

type KokoroVoiceEntry = {
  name: string;
  language: string;
  gender: string;
  traits?: string;
};

type KokoroInstance = {
  generate: (
    text: string,
    options: {
      voice: string;
      speed: number;
    }
  ) => Promise<Blob>;
  voices: ReaderTtsKokoroVoice[];
};

const ReaderTtsContext = createContext<ReaderTtsContextValue | null>(null);

function getVoiceSnapshot(voice: SpeechSynthesisVoice): ReaderTtsVoice {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    isDefault: voice.default
  };
}

function mapKokoroVoices(sourceVoices: Record<string, KokoroVoiceEntry>) {
  return Object.entries(sourceVoices).map(([id, voice]) => ({
    id,
    name: voice.name,
    language: voice.language,
    gender: voice.gender,
    traits: voice.traits
  }));
}

export function ReaderTtsProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const [isBrowserSupported, setIsBrowserSupported] = useState(false);
  const [isKokoroSupported, setIsKokoroSupported] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<ReaderTtsVoice[]>([]);
  const [kokoroVoices, setKokoroVoices] = useState<ReaderTtsKokoroVoice[]>([]);
  const [settings, setSettings] = useState(DEFAULT_READER_TTS_SETTINGS);
  const [status, setStatus] = useState<ReaderTtsStatus>("idle");
  const [activeEngine, setActiveEngine] = useState<ReaderTtsEngine | null>(null);
  const [kokoroStatus, setKokoroStatus] = useState<ReaderTtsKokoroStatus>("unavailable");
  const [activeChapterNumber, setActiveChapterNumber] = useState<number | null>(null);
  const [source, setSource] = useState<ReaderTtsSource | null>(null);
  const sessionRef = useRef<ReaderTtsSession | null>(null);
  const sourceRef = useRef<ReaderTtsSource | null>(null);
  const statusRef = useRef<ReaderTtsStatus>("idle");
  const activeEngineRef = useRef<ReaderTtsEngine | null>(null);
  const playChapterRef = useRef<(chapterNumber: number, nextSource?: ReaderTtsSource | null) => void>(
    () => {}
  );
  const playbackIdRef = useRef(0);
  const awaitingRouteChapterRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const kokoroInstanceRef = useRef<KokoroInstance | null>(null);
  const kokoroLoadPromiseRef = useRef<Promise<KokoroInstance | null> | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    activeEngineRef.current = activeEngine;
  }, [activeEngine]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const releaseAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;

    if (audioUrlRef.current) {
      window.URL.revokeObjectURL?.(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const cancelBrowserSpeech = useCallback(() => {
    if (isBrowserTtsSupported()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const cancelPlaybackOutput = useCallback(() => {
    cancelBrowserSpeech();
    releaseAudio();
  }, [cancelBrowserSpeech, releaseAudio]);

  useEffect(() => {
    const browserSupport = isBrowserTtsSupported();
    const kokoroSupport = isKokoroTtsSupported();

    setIsBrowserSupported(browserSupport);
    setIsKokoroSupported(kokoroSupport);
    setKokoroStatus(kokoroSupport ? "idle" : "unavailable");

    try {
      const stored = window.localStorage.getItem(READER_TTS_STORAGE_KEY);

      if (stored) {
        setSettings(normalizeReaderTtsSettings(JSON.parse(stored)));
      }
    } catch {
      window.localStorage.removeItem(READER_TTS_STORAGE_KEY);
    }

    if (!browserSupport) {
      return () => {
        cancelPlaybackOutput();
      };
    }

    const speechSynthesis = window.speechSynthesis;

    const updateVoices = () => {
      setBrowserVoices(speechSynthesis.getVoices().map(getVoiceSnapshot));
    };

    updateVoices();
    speechSynthesis.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      cancelPlaybackOutput();
      speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
    };
  }, [cancelPlaybackOutput]);

  useEffect(() => {
    if (!isBrowserSupported && !isKokoroSupported) {
      return;
    }

    window.localStorage.setItem(READER_TTS_STORAGE_KEY, JSON.stringify(settings));
  }, [isBrowserSupported, isKokoroSupported, settings]);

  const stop = useCallback(() => {
    playbackIdRef.current += 1;
    awaitingRouteChapterRef.current = null;
    sessionRef.current = null;
    cancelPlaybackOutput();
    setActiveChapterNumber(null);
    setActiveEngine(null);
    setStatus("idle");
  }, [cancelPlaybackOutput]);

  const handleChapterFinished = useCallback(
    (chapterNumber: number, activeSource: ReaderTtsSource) => {
      const activeSession = sessionRef.current;

      if (!activeSession || activeSession.chapterNumber !== chapterNumber) {
        return;
      }

      const nextChapterNumber = chapterNumber + 1;

      if (nextChapterNumber > activeSession.chapterCount) {
        stop();
        return;
      }

      if (activeSession.view === "book") {
        sessionRef.current = {
          ...activeSession,
          chapterNumber: nextChapterNumber
        };
        activeSource.scrollToChapter?.(nextChapterNumber);
        void playChapterRef.current(nextChapterNumber, activeSource);
        return;
      }

      awaitingRouteChapterRef.current = nextChapterNumber;
      sessionRef.current = {
        ...activeSession,
        chapterNumber: nextChapterNumber
      };
      router.push(getChapterHref(activeSession.bookSlug, nextChapterNumber, version));
    },
    [router, stop, version]
  );

  const ensureKokoroStarted = useCallback(() => {
    if (!isKokoroSupported) {
      return Promise.resolve(null);
    }

    if (kokoroInstanceRef.current) {
      return Promise.resolve(kokoroInstanceRef.current);
    }

    if (kokoroLoadPromiseRef.current) {
      return kokoroLoadPromiseRef.current;
    }

    setKokoroStatus("loading");

    kokoroLoadPromiseRef.current = import("kokoro-js")
      .then(async ({ KokoroTTS }) => {
        const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
          device: getPreferredKokoroDevice(),
          dtype: "q8"
        });

        const instance: KokoroInstance = {
          generate: async (text, options) => {
            const output = await tts.generate(
              text,
              options as Parameters<typeof tts.generate>[1]
            );
            return output.toBlob();
          },
          voices: mapKokoroVoices(tts.voices as Record<string, KokoroVoiceEntry>)
        };

        kokoroInstanceRef.current = instance;
        setKokoroVoices(instance.voices);
        setKokoroStatus("ready");
        return instance;
      })
      .catch(() => {
        kokoroLoadPromiseRef.current = null;
        setKokoroStatus("error");
        return null;
      });

    return kokoroLoadPromiseRef.current;
  }, [isKokoroSupported]);

  const playBrowserChapter = useCallback(
    (
      chapterNumber: number,
      chapterText: string,
      activeSource: ReaderTtsSource,
      playbackId: number
    ) => {
      if (!isBrowserTtsSupported()) {
        return false;
      }

      cancelPlaybackOutput();

      const utterance = new window.SpeechSynthesisUtterance(chapterText);
      const selectedVoice =
        settings.browserVoiceURI !== null
          ? window.speechSynthesis
              .getVoices()
              .find((voice) => voice.voiceURI === settings.browserVoiceURI) ?? null
          : null;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.onend = () => {
        if (playbackId !== playbackIdRef.current) {
          return;
        }

        handleChapterFinished(chapterNumber, activeSource);
      };
      utterance.onerror = () => {
        if (playbackId !== playbackIdRef.current) {
          return;
        }

        stop();
        setStatus("error");
      };

      activeSource.scrollToChapter?.(chapterNumber);
      setActiveChapterNumber(chapterNumber);
      setActiveEngine("browser");
      setStatus("playing");
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [cancelPlaybackOutput, handleChapterFinished, settings.browserVoiceURI, settings.pitch, settings.rate, stop]
  );

  const playKokoroChapter = useCallback(
    async (
      chapterNumber: number,
      chapterText: string,
      activeSource: ReaderTtsSource,
      playbackId: number
    ) => {
      const engine = kokoroInstanceRef.current ?? (await ensureKokoroStarted());

      if (!engine) {
        return false;
      }

      try {
        const voiceId =
          settings.kokoroVoice && engine.voices.some((voice) => voice.id === settings.kokoroVoice)
            ? settings.kokoroVoice
            : DEFAULT_KOKORO_VOICE;
        const blob = await engine.generate(chapterText, {
          voice: voiceId,
          speed: settings.rate
        });

        if (playbackId !== playbackIdRef.current) {
          return false;
        }

        cancelPlaybackOutput();

        const url = window.URL.createObjectURL(blob);
        const audio = new window.Audio(url);
        audioUrlRef.current = url;
        audioRef.current = audio;
        audio.onended = () => {
          if (playbackId !== playbackIdRef.current) {
            return;
          }

          releaseAudio();
          handleChapterFinished(chapterNumber, activeSource);
        };
        audio.onerror = () => {
          if (playbackId !== playbackIdRef.current) {
            return;
          }

          releaseAudio();

          if (isBrowserSupported) {
            playBrowserChapter(chapterNumber, chapterText, activeSource, playbackId);
            return;
          }

          stop();
          setStatus("error");
        };

        activeSource.scrollToChapter?.(chapterNumber);
        setActiveChapterNumber(chapterNumber);
        setActiveEngine("kokoro");
        setStatus("playing");
        await audio.play();
        return true;
      } catch {
        if (playbackId !== playbackIdRef.current) {
          return false;
        }

        if (isBrowserSupported) {
          return playBrowserChapter(chapterNumber, chapterText, activeSource, playbackId);
        }

        stop();
        setStatus("error");
        return false;
      }
    },
    [
      cancelPlaybackOutput,
      ensureKokoroStarted,
      handleChapterFinished,
      isBrowserSupported,
      playBrowserChapter,
      releaseAudio,
      settings.kokoroVoice,
      settings.rate,
      stop
    ]
  );

  const playChapter = useCallback(
    async (chapterNumber: number, nextSource?: ReaderTtsSource | null) => {
      const activeSource = nextSource ?? sourceRef.current;
      const chapter = activeSource?.chapters.find((entry) => entry.chapterNumber === chapterNumber);
      const session = sessionRef.current;

      if (!activeSource || !chapter || !session) {
        stop();
        return;
      }

      playbackIdRef.current += 1;
      const playbackId = playbackIdRef.current;
      const shouldTryKokoro = isKokoroSupported;

      if (shouldTryKokoro && !kokoroInstanceRef.current) {
        void ensureKokoroStarted();
      }

      if (shouldTryKokoro && kokoroInstanceRef.current) {
        setStatus("loading");
        const startedKokoro = await playKokoroChapter(
          chapterNumber,
          chapter.text,
          activeSource,
          playbackId
        );

        if (startedKokoro) {
          return;
        }
      }

      if (isBrowserSupported) {
        playBrowserChapter(chapterNumber, chapter.text, activeSource, playbackId);
        return;
      }

      if (shouldTryKokoro) {
        setStatus("loading");
        await playKokoroChapter(chapterNumber, chapter.text, activeSource, playbackId);
        return;
      }

      setStatus("error");
    },
    [ensureKokoroStarted, isBrowserSupported, isKokoroSupported, playBrowserChapter, playKokoroChapter, stop]
  );

  useEffect(() => {
    const session = sessionRef.current;

    if (!source || !session) {
      return;
    }

    if (session.bookSlug !== source.bookSlug || session.version !== version) {
      stop();
      return;
    }

    if (session.view === "book") {
      if (statusRef.current !== "idle" && source.currentChapterNumber !== session.chapterNumber) {
        stop();
      }
      return;
    }

    const expectedChapterNumber = awaitingRouteChapterRef.current;

    if (expectedChapterNumber !== null) {
      if (source.currentChapterNumber !== expectedChapterNumber) {
        return;
      }

      awaitingRouteChapterRef.current = null;
      void playChapter(expectedChapterNumber, source);
      return;
    }

    if (statusRef.current !== "idle" && source.currentChapterNumber !== session.chapterNumber) {
      stop();
    }
  }, [playChapter, source, stop, version]);

  const play = useCallback(() => {
    if ((!isBrowserSupported && !isKokoroSupported) || !sourceRef.current) {
      return;
    }

    const nextSession = {
      bookSlug: sourceRef.current.bookSlug,
      chapterCount: sourceRef.current.chapterCount,
      chapterNumber: sourceRef.current.currentChapterNumber,
      view: sourceRef.current.view,
      version
    } satisfies ReaderTtsSession;

    awaitingRouteChapterRef.current = null;
    sessionRef.current = nextSession;
    void playChapter(nextSession.chapterNumber, sourceRef.current);
  }, [isBrowserSupported, isKokoroSupported, playChapter, version]);

  useEffect(() => {
    playChapterRef.current = (chapterNumber, nextSource) => {
      void playChapter(chapterNumber, nextSource);
    };
  }, [playChapter]);

  const pause = useCallback(() => {
    if (statusRef.current !== "playing") {
      return;
    }

    if (activeEngineRef.current === "kokoro") {
      audioRef.current?.pause();
      setStatus("paused");
      return;
    }

    if (!isBrowserTtsSupported()) {
      return;
    }

    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") {
      return;
    }

    if (activeEngineRef.current === "kokoro") {
      const audio = audioRef.current;

      if (!audio) {
        return;
      }

      void audio
        .play()
        .then(() => {
          setStatus("playing");
        })
        .catch(() => {
          stop();
          setStatus("error");
        });
      return;
    }

    if (!isBrowserTtsSupported()) {
      return;
    }

    window.speechSynthesis.resume();
    setStatus("playing");
  }, [stop]);

  const value = useMemo<ReaderTtsContextValue>(
    () => ({
      activeChapterNumber,
      activeEngine,
      browserVoices,
      hasSource: source !== null,
      isSupported: isBrowserSupported || isKokoroSupported,
      kokoroStatus,
      kokoroVoices,
      pause,
      play,
      resume,
      setReadingSource: setSource,
      settings,
      status,
      stop,
      updateSettings: (updates) => {
        setSettings((current) => normalizeReaderTtsSettings({ ...current, ...updates }));
      }
    }),
    [
      activeChapterNumber,
      activeEngine,
      browserVoices,
      isBrowserSupported,
      isKokoroSupported,
      kokoroStatus,
      kokoroVoices,
      pause,
      play,
      resume,
      settings,
      source,
      status,
      stop
    ]
  );

  return <ReaderTtsContext.Provider value={value}>{children}</ReaderTtsContext.Provider>;
}

export function useReaderTts() {
  const context = useContext(ReaderTtsContext);

  if (!context) {
    throw new Error("useReaderTts must be used within ReaderTtsProvider.");
  }

  return context;
}
