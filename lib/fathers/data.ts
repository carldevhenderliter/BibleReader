import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { FathersWorkMeta, FathersWorkPayload } from "@/lib/fathers/types";

const fathersDir = path.join(process.cwd(), "data", "fathers");
const manifestPath = path.join(fathersDir, "manifest.json");

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

export async function getFathersWorks(): Promise<FathersWorkMeta[]> {
  return readManifest();
}

export async function getFathersWorkBySlug(workSlug: string): Promise<FathersWorkMeta | null> {
  const works = await getFathersWorks();

  return works.find((work) => work.slug === workSlug) ?? null;
}

export async function getFathersWorkPayload(workSlug: string): Promise<FathersWorkPayload | null> {
  return readWorkFile(workSlug);
}
