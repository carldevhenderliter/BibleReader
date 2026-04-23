import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  buildFathersGreekUndertextAnnotationRecord,
  isNa1GreekAnnotationWork,
  normalizeFathersGreekUndertextAnnotationFile,
  tokenizeFathersEnglishText
} from "@/lib/fathers/annotations";
import type { FathersWorkMeta, FathersWorkPayload } from "@/lib/fathers/types";

const fathersDir = path.join(process.cwd(), "data", "fathers");
const manifestPath = path.join(fathersDir, "manifest.json");
const annotationsDir = path.join(fathersDir, "annotations");

const readManifest = cache(async (): Promise<FathersWorkMeta[]> => {
  const file = await readFile(manifestPath, "utf8");

  return (JSON.parse(file) as FathersWorkMeta[]).sort((left, right) => left.order - right.order);
});

const readWorkFile = cache(async (workSlug: string): Promise<FathersWorkPayload | null> => {
  try {
    const file = await readFile(path.join(fathersDir, "works", `${workSlug}.json`), "utf8");

    return JSON.parse(file) as FathersWorkPayload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
});

async function readAnnotationFile(workSlug: string) {
  try {
    const file = await readFile(path.join(annotationsDir, `${workSlug}.json`), "utf8");

    return normalizeFathersGreekUndertextAnnotationFile(workSlug, JSON.parse(file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return normalizeFathersGreekUndertextAnnotationFile(workSlug, {
        workSlug,
        annotations: {}
      });
    }

    throw error;
  }
}

export async function getFathersWorks(): Promise<FathersWorkMeta[]> {
  return readManifest();
}

export async function getAuthenticFathersWorks(): Promise<FathersWorkMeta[]> {
  const works = await getFathersWorks();

  return works.filter((work) =>
    work.authenticityStatus === "accepted" || work.authenticityStatus === "fragmentary"
  );
}

export async function getFathersWorkBySlug(workSlug: string): Promise<FathersWorkMeta | null> {
  const works = await getFathersWorks();

  return works.find((work) => work.slug === workSlug) ?? null;
}

export async function getFathersWorkPayload(workSlug: string): Promise<FathersWorkPayload | null> {
  const [payload, manifestWork] = await Promise.all([
    readWorkFile(workSlug),
    getFathersWorkBySlug(workSlug)
  ]);

  if (!payload) {
    return null;
  }

  const payloadWithManifestMeta = manifestWork
    ? {
        ...payload,
        work: {
          ...payload.work,
          ...manifestWork
        }
      }
    : payload;

  if (!isNa1GreekAnnotationWork(workSlug)) {
    return payloadWithManifestMeta;
  }

  const annotationFile = await readAnnotationFile(workSlug);
  const segmentsWithEnglishTokens = payloadWithManifestMeta.segments.map((segment) => ({
    ...segment,
    englishTokens: tokenizeFathersEnglishText(segment.english)
  }));
  const annotationsBySegment = buildFathersGreekUndertextAnnotationRecord(
    segmentsWithEnglishTokens,
    annotationFile.annotations
  );

  return {
    ...payloadWithManifestMeta,
    segments: segmentsWithEnglishTokens.map((segment) => ({
      ...segment,
      greekUndertextAnnotations: annotationsBySegment[segment.id] ?? []
    }))
  };
}
