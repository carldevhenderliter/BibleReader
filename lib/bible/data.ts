import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type {
  BibleVersion,
  BookMeta,
  BookPayload,
  BundledBibleVersion,
  Chapter
} from "@/lib/bible/types";
import { isBundledBibleVersion } from "@/lib/bible/version";

type SourceBook = BookMeta & {
  sourceKey: string;
};

const versionsDir = path.join(process.cwd(), "data", "bible", "versions");
const sourceBooksPath = path.join(process.cwd(), "data", "source", "books.json");

const readSourceBooks = cache(async (): Promise<BookMeta[]> => {
  const file = await readFile(sourceBooksPath, "utf8");
  const books = JSON.parse(file) as SourceBook[];

  return books
    .map(({ sourceKey: _sourceKey, ...book }) => book)
    .sort((left, right) => left.order - right.order);
});

function getVersionDir(version: BundledBibleVersion) {
  return path.join(versionsDir, version);
}

const readBundledBooksFile = cache(async (version: BundledBibleVersion): Promise<BookMeta[]> => {
  const file = await readFile(path.join(getVersionDir(version), "books.json"), "utf8");

  return JSON.parse(file) as BookMeta[];
});

const readBundledBookFile = cache(
  async (version: BundledBibleVersion, bookSlug: string): Promise<BookPayload | null> => {
    try {
      const file = await readFile(
        path.join(getVersionDir(version), "books", `${bookSlug}.json`),
        "utf8"
      );

      return JSON.parse(file) as BookPayload;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }

      throw error;
    }
  }
);

export async function getBooks(version: BibleVersion = DEFAULT_BIBLE_VERSION): Promise<BookMeta[]> {
  if (isBundledBibleVersion(version)) {
    const books = await readBundledBooksFile(version);

    return [...books].sort((left, right) => left.order - right.order);
  }

  return readSourceBooks();
}

export async function getBookBySlug(
  bookSlug: string,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): Promise<BookMeta | null> {
  const books = await getBooks(version);

  return books.find((book) => book.slug === bookSlug) ?? null;
}

export async function getBookPayload(
  bookSlug: string,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): Promise<BookPayload | null> {
  if (!isBundledBibleVersion(version)) {
    return null;
  }

  return readBundledBookFile(version, bookSlug);
}

export async function getChapter(
  bookSlug: string,
  chapterNumber: number,
  version: BibleVersion = DEFAULT_BIBLE_VERSION
): Promise<Chapter | null> {
  const bookPayload = isBundledBibleVersion(version)
    ? await getBookPayload(bookSlug, version)
    : null;

  if (!bookPayload) {
    return null;
  }

  return bookPayload.chapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null;
}
