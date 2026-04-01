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
  isKokoroTtsSupported,
  KOKORO_MODEL_ID,
  normalizeReaderTtsSettings,
  READER_TTS_STORAGE_KEY
} from "@/lib/reader-tts";

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
  hasSource: boolean;
  isSupported: boolean;
  kokoroProgressLabel: string | null;
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
  ) => Promise<ArrayBuffer>;
  voices: ReaderTtsKokoroVoice[];
};

const ReaderTtsContext = createContext<ReaderTtsContextValue | null>(null);

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
  const [isKokoroSupported, setIsKokoroSupported] = useState(false);
  const [kokoroVoices, setKokoroVoices] = useState<ReaderTtsKokoroVoice[]>([]);
  const [settings, setSettings] = useState(DEFAULT_READER_TTS_SETTINGS);
  const [status, setStatus] = useState<ReaderTtsStatus>("idle");
  const [activeEngine, setActiveEngine] = useState<ReaderTtsEngine | null>(null);
  const [kokoroStatus, setKokoroStatus] = useState<ReaderTtsKokoroStatus>("unavailable");
  const [kokoroProgressLabel, setKokoroProgressLabel] = useState<string | null>(null);
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
  const kokoroInstanceRef = useRef<KokoroInstance | null>(null);
  const kokoroLoadPromiseRef = useRef<Promise<KokoroInstance | null> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const kokoroSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const kokoroAudioBufferRef = useRef<AudioBuffer | null>(null);
  const kokoroStartTimeRef = useRef(0);
  const kokoroPausedAtRef = useRef(0);
  const suppressKokoroEndedRef = useRef(false);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    activeEngineRef.current = activeEngine;
  }, [activeEngine]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const stopKokoroSource = useCallback(() => {
    if (!kokoroSourceNodeRef.current) {
      return;
    }

    suppressKokoroEndedRef.current = true;
    kokoroSourceNodeRef.current.stop();
    kokoroSourceNodeRef.current.disconnect();
    kokoroSourceNodeRef.current = null;
  }, []);

  const clearKokoroPlayback = useCallback(() => {
    stopKokoroSource();
    kokoroAudioBufferRef.current = null;
    kokoroPausedAtRef.current = 0;
    kokoroStartTimeRef.current = 0;
  }, [stopKokoroSource]);

  const getAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    const context = audioContextRef.current ?? new AudioContextCtor();
    audioContextRef.current = context;

    if (context.state === "suspended") {
      await context.resume();
    }

    return context;
  }, []);

  const cancelPlaybackOutput = useCallback(() => {
    clearKokoroPlayback();
  }, [clearKokoroPlayback]);

  useEffect(() => {
    const kokoroSupport = isKokoroTtsSupported();

    setIsKokoroSupported(kokoroSupport);
    setKokoroStatus(kokoroSupport ? "idle" : "unavailable");
    setKokoroProgressLabel(null);

    try {
      const stored = window.localStorage.getItem(READER_TTS_STORAGE_KEY);

      if (stored) {
        setSettings(normalizeReaderTtsSettings(JSON.parse(stored)));
      }
    } catch {
      window.localStorage.removeItem(READER_TTS_STORAGE_KEY);
    }

    return () => {
      cancelPlaybackOutput();
    };
  }, [cancelPlaybackOutput]);

  useEffect(() => {
    if (!isKokoroSupported) {
      return;
    }

    window.localStorage.setItem(READER_TTS_STORAGE_KEY, JSON.stringify(settings));
  }, [isKokoroSupported, settings]);

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
    setKokoroProgressLabel("Downloading HD voice");

    kokoroLoadPromiseRef.current = import("kokoro-js")
      .then(async ({ KokoroTTS }) => {
        const tts = await KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
          device: getPreferredKokoroDevice(),
          dtype: "q8",
          progress_callback: (progress) => {
            if (!progress || typeof progress !== "object") {
              return;
            }

            const progressValue =
              typeof progress.progress === "number" ? `${Math.round(progress.progress)}%` : null;
            const statusLabel =
              typeof progress.status === "string" && progress.status.length > 0
                ? progress.status
                : "Downloading HD voice";

            setKokoroProgressLabel(
              progressValue ? `${statusLabel} ${progressValue}` : statusLabel
            );
          }
        });

        const instance: KokoroInstance = {
          generate: async (text, options) => {
            const output = await tts.generate(
              text,
              options as Parameters<typeof tts.generate>[1]
            );
            return output.toWav();
          },
          voices: mapKokoroVoices(tts.voices as Record<string, KokoroVoiceEntry>)
        };

        kokoroInstanceRef.current = instance;
        setKokoroVoices(instance.voices);
        setKokoroStatus("ready");
        setKokoroProgressLabel("HD voice ready");
        return instance;
      })
      .catch(() => {
        kokoroLoadPromiseRef.current = null;
        setKokoroStatus("error");
        setKokoroProgressLabel("HD voice download failed");
        return null;
      });

    return kokoroLoadPromiseRef.current;
  }, [isKokoroSupported]);

  useEffect(() => {
    if (!isKokoroSupported) {
      return;
    }

    void ensureKokoroStarted();
  }, [ensureKokoroStarted, isKokoroSupported]);

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
        const audioContext = await getAudioContext();

        if (!audioContext) {
          return false;
        }

        const voiceId =
          settings.kokoroVoice && engine.voices.some((voice) => voice.id === settings.kokoroVoice)
            ? settings.kokoroVoice
            : DEFAULT_KOKORO_VOICE;
        const wavBuffer = await engine.generate(chapterText, {
          voice: voiceId,
          speed: settings.rate
        });

        if (playbackId !== playbackIdRef.current) {
          return false;
        }

        cancelPlaybackOutput();
        suppressKokoroEndedRef.current = false;
        const decodedBuffer = await audioContext.decodeAudioData(wavBuffer.slice(0));
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = decodedBuffer;
        sourceNode.connect(audioContext.destination);
        sourceNode.onended = () => {
          if (suppressKokoroEndedRef.current) {
            suppressKokoroEndedRef.current = false;
            return;
          }

          if (playbackId !== playbackIdRef.current) {
            return;
          }

          kokoroSourceNodeRef.current = null;
          kokoroAudioBufferRef.current = null;
          kokoroPausedAtRef.current = 0;
          kokoroStartTimeRef.current = 0;
          handleChapterFinished(chapterNumber, activeSource);
        };

        kokoroAudioBufferRef.current = decodedBuffer;
        kokoroSourceNodeRef.current = sourceNode;
        kokoroPausedAtRef.current = 0;
        kokoroStartTimeRef.current = audioContext.currentTime;
        sourceNode.start(0, 0);

        activeSource.scrollToChapter?.(chapterNumber);
        setActiveChapterNumber(chapterNumber);
        setActiveEngine("kokoro");
        setStatus("playing");
        return true;
      } catch {
        if (playbackId !== playbackIdRef.current) {
          return false;
        }

        stop();
        setStatus("error");
        return false;
      }
    },
    [
      cancelPlaybackOutput,
      ensureKokoroStarted,
      getAudioContext,
      handleChapterFinished,
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

      if (!isKokoroSupported) {
        setStatus("error");
        return;
      }

      if (kokoroStatus !== "loading") {
        setStatus("loading");
      }
      await playKokoroChapter(chapterNumber, chapter.text, activeSource, playbackId);
    },
    [isKokoroSupported, kokoroStatus, playKokoroChapter, stop]
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
    if (!isKokoroSupported || !sourceRef.current) {
      return;
    }

    void getAudioContext();

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
  }, [getAudioContext, isKokoroSupported, playChapter, version]);

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
      const audioContext = audioContextRef.current;
      const audioBuffer = kokoroAudioBufferRef.current;

      if (!audioContext || !audioBuffer) {
        return;
      }

      kokoroPausedAtRef.current += audioContext.currentTime - kokoroStartTimeRef.current;
      stopKokoroSource();
      setStatus("paused");
      return;
    }

  }, [stopKokoroSource]);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") {
      return;
    }

    if (activeEngineRef.current === "kokoro") {
      const audioContext = audioContextRef.current;
      const audioBuffer = kokoroAudioBufferRef.current;

      if (!audioContext || !audioBuffer) {
        return;
      }

      try {
        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(audioContext.destination);
        sourceNode.onended = () => {
          if (suppressKokoroEndedRef.current) {
            suppressKokoroEndedRef.current = false;
            return;
          }

          const currentSource = sourceRef.current;
          const currentSession = sessionRef.current;

          if (!currentSource || !currentSession) {
            return;
          }

          kokoroSourceNodeRef.current = null;
          kokoroAudioBufferRef.current = null;
          kokoroPausedAtRef.current = 0;
          kokoroStartTimeRef.current = 0;
          handleChapterFinished(currentSession.chapterNumber, currentSource);
        };

        kokoroSourceNodeRef.current = sourceNode;
        kokoroStartTimeRef.current = audioContext.currentTime;
        sourceNode.start(0, kokoroPausedAtRef.current);
        setStatus("playing");
      } catch {
        stop();
        setStatus("error");
      }
      return;
    }

  }, [handleChapterFinished, stop]);

  const value = useMemo<ReaderTtsContextValue>(
    () => ({
      activeChapterNumber,
      activeEngine,
      hasSource: source !== null,
      isSupported: isKokoroSupported,
      kokoroProgressLabel,
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
      isKokoroSupported,
      kokoroProgressLabel,
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
