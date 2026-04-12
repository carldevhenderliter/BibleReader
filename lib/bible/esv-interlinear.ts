import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { getBookBySlug } from "@/lib/bible/data";
import type {
  EsvInterlinearBookPayload,
  EsvInterlinearChapter,
  EsvInterlinearDisplayChapter,
  EsvInterlinearOverrideBookPayload,
  EsvInterlinearOverrideChapter
} from "@/lib/bible/types";

const interlinearDir = path.join(process.cwd(), "data", "bible", "interlinear", "esv");
const baseDir = path.join(interlinearDir, "base");
const overridesDir = path.join(interlinearDir, "overrides");

const readBaseBookFile = cache(
  async (directory: string, bookSlug: string): Promise<EsvInterlinearBookPayload | null> => {
    try {
      const file = await readFile(path.join(directory, `${bookSlug}.json`), "utf8");

      return JSON.parse(file) as EsvInterlinearBookPayload;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }
);

const readOverrideBookFile = cache(
  async (bookSlug: string): Promise<EsvInterlinearOverrideBookPayload | null> => {
    try {
      const file = await readFile(path.join(overridesDir, `${bookSlug}.json`), "utf8");

      return JSON.parse(file) as EsvInterlinearOverrideBookPayload;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }
);

function mergeInterlinearChapter(
  baseChapter: EsvInterlinearChapter,
  overrideChapter: EsvInterlinearOverrideChapter | null
): EsvInterlinearDisplayChapter {
  const overrideByVerse = new Map(
    (overrideChapter?.verses ?? []).map((verse) => [verse.number, verse.overrideGreek?.trim() ?? ""])
  );

  return {
    bookSlug: baseChapter.bookSlug,
    chapterNumber: baseChapter.chapterNumber,
    verses: baseChapter.verses.map((verse) => {
      const overrideGreek = overrideByVerse.get(verse.number);

      return {
        number: verse.number,
        baseGreek: verse.baseGreek,
        tokens: verse.tokens,
        overrideGreek: overrideGreek ? overrideGreek : undefined,
        greek: overrideGreek || verse.baseGreek
      };
    })
  };
}

export async function getEsvInterlinearBook(
  bookSlug: string
): Promise<EsvInterlinearDisplayChapter[] | null> {
  const book = await getBookBySlug(bookSlug, "esv");

  if (!book || book.testament !== "New") {
    return null;
  }

  const [baseBook, overrideBook] = await Promise.all([
    readBaseBookFile(baseDir, bookSlug),
    readOverrideBookFile(bookSlug)
  ]);

  if (!baseBook) {
    return null;
  }

  const overrideByChapter = new Map(
    (overrideBook?.chapters ?? []).map((chapter) => [chapter.chapterNumber, chapter])
  );

  return baseBook.chapters.map((chapter) =>
    mergeInterlinearChapter(chapter, overrideByChapter.get(chapter.chapterNumber) ?? null)
  );
}

export async function getEsvInterlinearChapter(
  bookSlug: string,
  chapterNumber: number
): Promise<EsvInterlinearDisplayChapter | null> {
  const chapters = await getEsvInterlinearBook(bookSlug);

  if (!chapters) {
    return null;
  }

  return chapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null;
}
