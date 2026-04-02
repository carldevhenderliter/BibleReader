import type { ProgressInfo } from "@huggingface/transformers";

import { getAssetPath } from "@/lib/asset-path";
import { DEFAULT_KOKORO_VOICE, KOKORO_MODEL_ID, getPreferredKokoroDevice } from "@/lib/reader-tts";

type KokoroVoiceMetadata = {
  id: string;
  name: string;
  language: string;
  gender: string;
  traits?: string;
};

type KokoroGenerateOptions = {
  voice: string;
  speed: number;
};

export type LocalKokoroInstance = {
  generate: (text: string, options: KokoroGenerateOptions) => Promise<ArrayBuffer>;
  voices: KokoroVoiceMetadata[];
};

const ENGLISH_KOKORO_VOICES: KokoroVoiceMetadata[] = [
  { id: "af_heart", name: "Heart", language: "en-us", gender: "Female", traits: "❤️" },
  { id: "af_alloy", name: "Alloy", language: "en-us", gender: "Female" },
  { id: "af_aoede", name: "Aoede", language: "en-us", gender: "Female" },
  { id: "af_bella", name: "Bella", language: "en-us", gender: "Female", traits: "🔥" },
  { id: "af_jessica", name: "Jessica", language: "en-us", gender: "Female" },
  { id: "af_kore", name: "Kore", language: "en-us", gender: "Female" },
  { id: "af_nicole", name: "Nicole", language: "en-us", gender: "Female", traits: "🎧" },
  { id: "af_nova", name: "Nova", language: "en-us", gender: "Female" },
  { id: "af_river", name: "River", language: "en-us", gender: "Female" },
  { id: "af_sarah", name: "Sarah", language: "en-us", gender: "Female" },
  { id: "af_sky", name: "Sky", language: "en-us", gender: "Female" },
  { id: "am_adam", name: "Adam", language: "en-us", gender: "Male" },
  { id: "am_echo", name: "Echo", language: "en-us", gender: "Male" },
  { id: "am_eric", name: "Eric", language: "en-us", gender: "Male" },
  { id: "am_fenrir", name: "Fenrir", language: "en-us", gender: "Male" },
  { id: "am_liam", name: "Liam", language: "en-us", gender: "Male" },
  { id: "am_michael", name: "Michael", language: "en-us", gender: "Male" },
  { id: "am_onyx", name: "Onyx", language: "en-us", gender: "Male" },
  { id: "am_puck", name: "Puck", language: "en-us", gender: "Male" },
  { id: "am_santa", name: "Santa", language: "en-us", gender: "Male" },
  { id: "bf_alice", name: "Alice", language: "en-gb", gender: "Female" },
  { id: "bf_emma", name: "Emma", language: "en-gb", gender: "Female", traits: "🚺" },
  { id: "bf_isabella", name: "Isabella", language: "en-gb", gender: "Female" },
  { id: "bf_lily", name: "Lily", language: "en-gb", gender: "Female", traits: "🚺" },
  { id: "bm_daniel", name: "Daniel", language: "en-gb", gender: "Male", traits: "🚹" },
  { id: "bm_fable", name: "Fable", language: "en-gb", gender: "Male", traits: "🚹" },
  { id: "bm_george", name: "George", language: "en-gb", gender: "Male" },
  { id: "bm_lewis", name: "Lewis", language: "en-gb", gender: "Male" }
];

const KOKORO_VOICE_URL_PREFIX = `https://huggingface.co/${KOKORO_MODEL_ID}/resolve/main/voices/`;
const KOKORO_LOAD_TIMEOUT_MS = 45_000;

let isEnvironmentConfigured = false;
let isFetchShimInstalled = false;
let originalFetch: typeof fetch | null = null;

function getKokoroVoiceAssetUrl(voiceFile: string) {
  return getAssetPath(`/kokoro/voices/${voiceFile}`);
}

async function configureKokoroEnvironmentRuntime() {
  if (isEnvironmentConfigured) {
    return;
  }

  const [{ env: transformersEnv }, { env: kokoroEnv }] = await Promise.all([
    import("@huggingface/transformers"),
    import("kokoro-js")
  ]);

  const modelRoot = getAssetPath("/kokoro/model/");
  const wasmRoot = getAssetPath("/kokoro/wasm/");

  transformersEnv.allowRemoteModels = false;
  transformersEnv.allowLocalModels = true;
  transformersEnv.localModelPath = modelRoot;
  transformersEnv.backends.onnx ??= {};
  transformersEnv.backends.onnx.wasm ??= {};
  transformersEnv.backends.onnx.wasm.wasmPaths = wasmRoot;
  kokoroEnv.wasmPaths = wasmRoot;

  isEnvironmentConfigured = true;
}

function getFetchUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function installKokoroFetchShim() {
  if (typeof window === "undefined" || isFetchShimInstalled) {
    return;
  }

  originalFetch = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl = getFetchUrl(input);

    if (requestUrl.startsWith(KOKORO_VOICE_URL_PREFIX)) {
      const voiceFile = requestUrl.slice(KOKORO_VOICE_URL_PREFIX.length);
      return originalFetch!(getKokoroVoiceAssetUrl(voiceFile), init);
    }

    return originalFetch!(input, init);
  }) as typeof fetch;

  isFetchShimInstalled = true;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`${label} timed out`));
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

function normalizeProgressLabel(progress: ProgressInfo) {
  if (progress.status === "ready") {
    return "HD voice ready";
  }

  if (progress.status === "done") {
    return "Finalizing HD voice";
  }

  if (progress.status === "progress") {
    return `Downloading HD voice ${Math.round(progress.progress)}%`;
  }

  return "Downloading HD voice";
}

export function getKokoroVoices() {
  return ENGLISH_KOKORO_VOICES;
}

export async function loadLocalKokoroTts(
  onProgress?: (label: string) => void
): Promise<LocalKokoroInstance> {
  await configureKokoroEnvironmentRuntime();
  installKokoroFetchShim();

  const { KokoroTTS } = await import("kokoro-js");

  const tts = await withTimeout(
    KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
      device: getPreferredKokoroDevice(),
      dtype: "q8",
      progress_callback: (progress) => {
        if (!progress || typeof progress !== "object" || !onProgress) {
          return;
        }

        onProgress(normalizeProgressLabel(progress));
      }
    }),
    KOKORO_LOAD_TIMEOUT_MS,
    "HD voice load"
  );

  return {
    generate: async (text, options) => {
      const output = await tts.generate(text, {
        voice:
          options.voice && ENGLISH_KOKORO_VOICES.some((voice) => voice.id === options.voice)
            ? (options.voice as never)
            : DEFAULT_KOKORO_VOICE,
        speed: options.speed
      });

      return output.toWav();
    },
    voices: ENGLISH_KOKORO_VOICES
  };
}
