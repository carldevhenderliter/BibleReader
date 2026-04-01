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
import type { ReaderTtsSettings, ReaderTtsStatus } from "@/lib/bible/types";
import { getChapterHref } from "@/lib/bible/utils";
import {
  DEFAULT_READER_TTS_SETTINGS,
  isBrowserTtsSupported,
  normalizeReaderTtsSettings,
  READER_TTS_STORAGE_KEY
} from "@/lib/reader-tts";

type ReaderTtsVoice = {
  voiceURI: string;
  name: string;
  lang: string;
  isDefault: boolean;
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
  hasSource: boolean;
  isSupported: boolean;
  setReadingSource: (source: ReaderTtsSource | null) => void;
  settings: ReaderTtsSettings;
  status: ReaderTtsStatus;
  stop: () => void;
  pause: () => void;
  play: () => void;
  resume: () => void;
  updateSettings: (updates: Partial<ReaderTtsSettings>) => void;
  voices: ReaderTtsVoice[];
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

export function ReaderTtsProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { version } = useReaderVersion();
  const [isSupported, setIsSupported] = useState(false);
  const [voices, setVoices] = useState<ReaderTtsVoice[]>([]);
  const [settings, setSettings] = useState(DEFAULT_READER_TTS_SETTINGS);
  const [status, setStatus] = useState<ReaderTtsStatus>("idle");
  const [activeChapterNumber, setActiveChapterNumber] = useState<number | null>(null);
  const [source, setSource] = useState<ReaderTtsSource | null>(null);
  const sessionRef = useRef<ReaderTtsSession | null>(null);
  const sourceRef = useRef<ReaderTtsSource | null>(null);
  const statusRef = useRef<ReaderTtsStatus>("idle");
  const utteranceIdRef = useRef(0);
  const awaitingRouteChapterRef = useRef<number | null>(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  useEffect(() => {
    if (!isBrowserTtsSupported()) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    try {
      const stored = window.localStorage.getItem(READER_TTS_STORAGE_KEY);

      if (stored) {
        setSettings(normalizeReaderTtsSettings(JSON.parse(stored)));
      }
    } catch {
      window.localStorage.removeItem(READER_TTS_STORAGE_KEY);
    }

    const speechSynthesis = window.speechSynthesis;

    const updateVoices = () => {
      setVoices(speechSynthesis.getVoices().map(getVoiceSnapshot));
    };

    updateVoices();

    speechSynthesis.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      speechSynthesis.cancel();
      speechSynthesis.removeEventListener?.("voiceschanged", updateVoices);
    };
  }, []);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    window.localStorage.setItem(READER_TTS_STORAGE_KEY, JSON.stringify(settings));
  }, [isSupported, settings]);

  const stop = useCallback(() => {
    if (isBrowserTtsSupported()) {
      utteranceIdRef.current += 1;
      window.speechSynthesis.cancel();
    }

    awaitingRouteChapterRef.current = null;
    sessionRef.current = null;
    setActiveChapterNumber(null);
    setStatus("idle");
  }, []);

  const speakChapter = useCallback(
    (chapterNumber: number, nextSource?: ReaderTtsSource | null) => {
      if (!isBrowserTtsSupported()) {
        setStatus("error");
        return;
      }

      const activeSource = nextSource ?? sourceRef.current;
      const chapter = activeSource?.chapters.find((entry) => entry.chapterNumber === chapterNumber);
      const session = sessionRef.current;

      if (!activeSource || !chapter || !session) {
        stop();
        return;
      }

      utteranceIdRef.current += 1;
      const utteranceId = utteranceIdRef.current;

      window.speechSynthesis.cancel();

      const utterance = new window.SpeechSynthesisUtterance(chapter.text);
      const selectedVoice =
        settings.voiceURI !== null
          ? window.speechSynthesis
              .getVoices()
              .find((voice) => voice.voiceURI === settings.voiceURI) ?? null
          : null;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = settings.rate;
      utterance.pitch = settings.pitch;
      utterance.onend = () => {
        if (utteranceId !== utteranceIdRef.current) {
          return;
        }

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
          speakChapter(nextChapterNumber, activeSource);
          return;
        }

        awaitingRouteChapterRef.current = nextChapterNumber;
        sessionRef.current = {
          ...activeSession,
          chapterNumber: nextChapterNumber
        };
        router.push(getChapterHref(activeSession.bookSlug, nextChapterNumber, version));
      };
      utterance.onerror = () => {
        if (utteranceId !== utteranceIdRef.current) {
          return;
        }

        stop();
        setStatus("error");
      };

      activeSource.scrollToChapter?.(chapterNumber);
      setActiveChapterNumber(chapterNumber);
      setStatus("playing");
      window.speechSynthesis.speak(utterance);
    },
    [router, settings.pitch, settings.rate, settings.voiceURI, stop, version]
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

    if (session.view !== "chapter") {
      return;
    }

    const expectedChapterNumber = awaitingRouteChapterRef.current;

    if (expectedChapterNumber !== null) {
      if (source.currentChapterNumber !== expectedChapterNumber) {
        return;
      }

      awaitingRouteChapterRef.current = null;
      speakChapter(expectedChapterNumber, source);
      return;
    }

    if (statusRef.current === "playing" || statusRef.current === "paused") {
      if (source.currentChapterNumber !== session.chapterNumber) {
        stop();
      }
    }
  }, [source, speakChapter, stop, version]);

  const play = useCallback(() => {
    if (!isSupported || !sourceRef.current) {
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
    speakChapter(nextSession.chapterNumber, sourceRef.current);
  }, [isSupported, speakChapter, version]);

  const pause = useCallback(() => {
    if (!isBrowserTtsSupported() || statusRef.current !== "playing") {
      return;
    }

    window.speechSynthesis.pause();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    if (!isBrowserTtsSupported() || statusRef.current !== "paused") {
      return;
    }

    window.speechSynthesis.resume();
    setStatus("playing");
  }, []);

  const value = useMemo<ReaderTtsContextValue>(
    () => ({
      activeChapterNumber,
      hasSource: source !== null,
      isSupported,
      setReadingSource: setSource,
      settings,
      status,
      stop,
      pause,
      play,
      resume,
      updateSettings: (updates) => {
        setSettings((current) => normalizeReaderTtsSettings({ ...current, ...updates }));
      },
      voices
    }),
    [activeChapterNumber, isSupported, pause, play, resume, settings, source, status, stop, voices]
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
