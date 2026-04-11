import manifestData from "@/data/fathers/manifest.json";
import type {
  FathersLemmaMatch,
  FathersWorkMeta,
  FathersWorkPayload
} from "@/lib/fathers/types";

const fathersWorkLoaders: Record<string, () => Promise<FathersWorkPayload>> = {
  "1-clement": async () =>
    (await import("@/data/fathers/works/1-clement.json")).default as FathersWorkPayload,
  "2-clement": async () =>
    (await import("@/data/fathers/works/2-clement.json")).default as FathersWorkPayload,
  barnabas: async () =>
    (await import("@/data/fathers/works/barnabas.json")).default as FathersWorkPayload,
  didache: async () =>
    (await import("@/data/fathers/works/didache.json")).default as FathersWorkPayload,
  "ignatius-ephesians": async () =>
    (await import("@/data/fathers/works/ignatius-ephesians.json")).default as FathersWorkPayload,
  "ignatius-magnesians": async () =>
    (await import("@/data/fathers/works/ignatius-magnesians.json")).default as FathersWorkPayload,
  "ignatius-philadelphians": async () =>
    (await import("@/data/fathers/works/ignatius-philadelphians.json")).default as FathersWorkPayload,
  "ignatius-polycarp": async () =>
    (await import("@/data/fathers/works/ignatius-polycarp.json")).default as FathersWorkPayload,
  "ignatius-romans": async () =>
    (await import("@/data/fathers/works/ignatius-romans.json")).default as FathersWorkPayload,
  "ignatius-smyrnaeans": async () =>
    (await import("@/data/fathers/works/ignatius-smyrnaeans.json")).default as FathersWorkPayload,
  "ignatius-trallians": async () =>
    (await import("@/data/fathers/works/ignatius-trallians.json")).default as FathersWorkPayload,
  "polycarp-to-philippians": async () =>
    (await import("@/data/fathers/works/polycarp-to-philippians.json"))
      .default as FathersWorkPayload,
  "shepherd-of-hermas": async () =>
    (await import("@/data/fathers/works/shepherd-of-hermas.json")).default as FathersWorkPayload
};

let manifestPromise: Promise<FathersWorkMeta[]> | null = null;
const workPayloadPromises = new Map<string, Promise<FathersWorkPayload | null>>();

export function normalizeFathersGreekText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitGreekSentences(value: string) {
  return value
    .split(/(?<=[.;·;!?])/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitEnglishSentences(value: string) {
  return value
    .split(/(?<=[.!?;:])/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getSentenceContext(
  greek: string,
  english: string,
  normalizedLemma: string
): { greekContext: string; englishContext: string } {
  const greekSentences = splitGreekSentences(greek);
  const englishSentences = splitEnglishSentences(english);

  const matchedIndex = greekSentences.findIndex((sentence) =>
    normalizeFathersGreekText(sentence).split(" ").includes(normalizedLemma)
  );

  if (matchedIndex === -1) {
    return { greekContext: greek, englishContext: english };
  }

  return {
    greekContext: greekSentences[matchedIndex] ?? greek,
    englishContext:
      englishSentences[matchedIndex] ??
      englishSentences[Math.min(matchedIndex, Math.max(0, englishSentences.length - 1))] ??
      english
  };
}

async function getFathersManifest() {
  if (!manifestPromise) {
    manifestPromise = Promise.resolve(
      ([...manifestData] as FathersWorkMeta[]).sort((left, right) => left.order - right.order)
    );
  }

  return manifestPromise;
}

async function getFathersWorkPayloadForSearch(workSlug: string) {
  const existingPromise = workPayloadPromises.get(workSlug);

  if (existingPromise) {
    return existingPromise;
  }

  const loadWork = fathersWorkLoaders[workSlug];
  const nextPromise = loadWork ? loadWork().catch(() => null) : Promise.resolve(null);

  workPayloadPromises.set(workSlug, nextPromise);

  return nextPromise;
}

export async function findFathersSegmentsByGreekLemma(lemma: string): Promise<FathersLemmaMatch[]> {
  const normalizedLemma = normalizeFathersGreekText(lemma);

  if (!normalizedLemma) {
    return [];
  }

  const works = await getFathersManifest();
  const matches: FathersLemmaMatch[] = [];

  for (const work of works) {
    const payload = await getFathersWorkPayloadForSearch(work.slug);

    if (!payload) {
      continue;
    }

    for (const segment of payload.segments) {
      if (!segment.greekTokens.includes(normalizedLemma)) {
        continue;
      }

      matches.push({
        workSlug: work.slug,
        workTitle: work.title,
        segmentId: segment.id,
        ref: segment.ref,
        label: segment.label,
        greek: segment.greek,
        english: segment.english,
        ...getSentenceContext(segment.greek, segment.english, normalizedLemma)
      });
    }
  }

  return matches;
}
