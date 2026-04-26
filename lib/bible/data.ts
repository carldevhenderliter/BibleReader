import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

import {
  getChronologicalNewTestamentBooks,
  getChronologicalOldTestamentBooks
} from "@/lib/bible/book-order";
import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import type {
  BibleVersion,
  BookMeta,
  BookPayload,
  BundledBibleVersion,
  Chapter
} from "@/lib/bible/types";
import { GOSPEL_HARMONY_BOOK_META, isGospelHarmonyBookSlug } from "@/lib/gospel-harmony";
import { isBundledBibleVersion } from "@/lib/bible/version";

export {
  getChronologicalNewTestamentBooks,
  getChronologicalOldTestamentBooks
} from "@/lib/bible/book-order";

type SourceBook = BookMeta & {
  sourceKey: string;
};

const versionsDir = path.join(process.cwd(), "data", "bible", "versions");
const sourceBooksPath = path.join(process.cwd(), "data", "source", "books.json");

const NEW_TESTAMENT_COMPOSITION_DATES: Record<string, string> = {
  matthew: "c. 70–90 AD",
  mark: "c. 65–70 AD",
  luke: "c. 70–90 AD",
  john: "c. 90–100 AD",
  acts: "c. 70–90 AD",
  romans: "c. 57 AD",
  "1-corinthians": "c. 53–55 AD",
  "2-corinthians": "c. 55–56 AD",
  galatians: "c. 48–55 AD",
  ephesians: "c. 60–62 AD",
  philippians: "c. 60–62 AD",
  colossians: "c. 60–62 AD",
  "1-thessalonians": "c. 50–51 AD",
  "2-thessalonians": "c. 50–52 AD",
  "1-timothy": "c. 62–100 AD",
  "2-timothy": "c. 64–100 AD",
  titus: "c. 63–100 AD",
  philemon: "c. 60–62 AD",
  hebrews: "c. 60–90 AD",
  james: "c. 45–62 AD",
  "1-peter": "c. 60–65 AD",
  "2-peter": "c. 65–100 AD",
  "1-john": "c. 90–100 AD",
  "2-john": "c. 90–100 AD",
  "3-john": "c. 90–100 AD",
  jude: "c. 65–90 AD",
  revelation: "c. 95–96 AD"
};

function addBookCompositionDates<T extends BookMeta>(books: T[]): T[] {
  return books.map((book) => {
    if (book.testament !== "New") {
      return book;
    }

    const compositionDate = NEW_TESTAMENT_COMPOSITION_DATES[book.slug];

    return compositionDate ? { ...book, compositionDate } : book;
  });
}

function withSpecialBooks<T extends BookMeta>(books: T[]): BookMeta[] {
  const hasHarmony = books.some((book) => isGospelHarmonyBookSlug(book.slug));

  if (hasHarmony) {
    return books;
  }

  return [...books, GOSPEL_HARMONY_BOOK_META];
}

const readSourceBooks = cache(async (): Promise<BookMeta[]> => {
  const file = await readFile(sourceBooksPath, "utf8");
  const books = JSON.parse(file) as SourceBook[];

  return addBookCompositionDates(books)
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

    return withSpecialBooks(addBookCompositionDates(books).sort((left, right) => left.order - right.order));
  }

  return withSpecialBooks(await readSourceBooks());
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
  if (isGospelHarmonyBookSlug(bookSlug)) {
    return null;
  }

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
  if (isGospelHarmonyBookSlug(bookSlug)) {
    return null;
  }

  const bookPayload = isBundledBibleVersion(version)
    ? await getBookPayload(bookSlug, version)
    : null;

  if (!bookPayload) {
    return null;
  }

  return bookPayload.chapters.find((chapter) => chapter.chapterNumber === chapterNumber) ?? null;
}
