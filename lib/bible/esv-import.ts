import type { BookMeta, BookPayload, Chapter, Verse } from "@/lib/bible/types";
import { normalizeEsvSourceBookName, parseEsvSourceVerse } from "@/lib/bible/esv";

type SourceBook = BookMeta & {
  sourceKey: string;
};

export type EsvSourceToken =
  | string
  | [string]
  | [string, string | null | undefined]
  | [string, string | null | undefined, string | null | undefined]
  | [string, string | null | undefined, string | null | undefined, string | null | undefined];

export type EsvSourceBooks = Record<string, EsvSourceToken[][][]>;

const ESV_BOOK_NAME_ALIASES: Record<string, string> = {
  revelation: "revelation of john"
};

export function parseEsvSourceBooks(
  sourceBooks: SourceBook[],
  sourceBookMap: EsvSourceBooks
): Map<string, BookPayload> {
  const sourceBookByNormalizedName = new Map(
    Object.entries(sourceBookMap).map(([bookName, chapters]) => [
      normalizeEsvSourceBookName(bookName),
      chapters
    ])
  );

  const payloadBySlug = new Map<string, BookPayload>();

  for (const sourceBook of sourceBooks) {
    const normalizedBookName = normalizeEsvSourceBookName(sourceBook.name);
    const sourceChapters =
      sourceBookByNormalizedName.get(normalizedBookName) ??
      sourceBookByNormalizedName.get(ESV_BOOK_NAME_ALIASES[normalizedBookName] ?? "");

    if (!sourceChapters) {
      throw new Error(`ESV source is missing ${sourceBook.name}.`);
    }

    if (sourceChapters.length !== sourceBook.chapterCount) {
      throw new Error(
        `ESV ${sourceBook.name} chapter count mismatch: expected ${sourceBook.chapterCount}, received ${sourceChapters.length}.`
      );
    }

    const chapters: Chapter[] = sourceChapters.map((sourceChapter, chapterIndex) => {
      const verses: Verse[] = sourceChapter.map((sourceVerse, verseIndex) => {
        const text = parseEsvSourceVerse(sourceVerse);

        if (!text) {
          throw new Error(
            `Encountered an empty ESV verse at ${sourceBook.slug} ${chapterIndex + 1}:${verseIndex + 1}.`
          );
        }

        return {
          number: verseIndex + 1,
          text
        };
      });

      if (verses.length === 0) {
        throw new Error(`ESV is missing ${sourceBook.name} chapter ${chapterIndex + 1}.`);
      }

      return {
        bookSlug: sourceBook.slug,
        chapterNumber: chapterIndex + 1,
        verses
      };
    });

    payloadBySlug.set(sourceBook.slug, {
      book: {
        slug: sourceBook.slug,
        name: sourceBook.name,
        abbreviation: sourceBook.abbreviation,
        testament: sourceBook.testament,
        chapterCount: sourceBook.chapterCount,
        order: sourceBook.order
      },
      chapters
    });
  }

  return payloadBySlug;
}
