import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import type { BookMeta, BookPayload, Chapter } from "@/lib/bible/types";

const masoreticDir = path.join(process.cwd(), "data", "bible", "mt");

const readMasoreticBooksFile = cache(async (): Promise<BookMeta[]> => {
  const file = await readFile(path.join(masoreticDir, "books.json"), "utf8");

  return JSON.parse(file) as BookMeta[];
});

const readMasoreticBookFile = cache(async (bookSlug: string): Promise<BookPayload | null> => {
  try {
    const file = await readFile(path.join(masoreticDir, "books", `${bookSlug}.json`), "utf8");

    return JSON.parse(file) as BookPayload;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw error;
  }
});

export async function getMasoreticBooks() {
  const books = await readMasoreticBooksFile();

  return [...books].sort((left, right) => left.order - right.order);
}

export async function getMasoreticBookPayload(bookSlug: string) {
  return readMasoreticBookFile(bookSlug);
}

export async function getMasoreticChapter(bookSlug: string, chapterNumber: number): Promise<Chapter | null> {
  const payload = await getMasoreticBookPayload(bookSlug);

  if (!payload) {
    return null;
  }

  return payload.chapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null;
}
