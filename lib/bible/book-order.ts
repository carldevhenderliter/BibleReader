import type { BookMeta } from "@/lib/bible/types";

export type BibleBookOrderMode =
  | "canonical"
  | "chronological-old-testament"
  | "chronological-new-testament";

export const CHRONOLOGICAL_OLD_TESTAMENT_ORDER = [
  "genesis",
  "job",
  "exodus",
  "leviticus",
  "numbers",
  "deuteronomy",
  "joshua",
  "judges",
  "ruth",
  "1-samuel",
  "2-samuel",
  "psalms",
  "song-of-solomon",
  "proverbs",
  "ecclesiastes",
  "1-kings",
  "2-kings",
  "1-chronicles",
  "2-chronicles",
  "obadiah",
  "joel",
  "jonah",
  "amos",
  "hosea",
  "isaiah",
  "micah",
  "nahum",
  "zephaniah",
  "habakkuk",
  "jeremiah",
  "lamentations",
  "ezekiel",
  "daniel",
  "esther",
  "ezra",
  "nehemiah",
  "haggai",
  "zechariah",
  "malachi"
] as const;

export const CHRONOLOGICAL_NEW_TESTAMENT_ORDER = [
  "james",
  "galatians",
  "1-thessalonians",
  "2-thessalonians",
  "1-corinthians",
  "2-corinthians",
  "romans",
  "mark",
  "ephesians",
  "colossians",
  "philemon",
  "philippians",
  "luke",
  "acts",
  "1-timothy",
  "titus",
  "hebrews",
  "1-peter",
  "2-peter",
  "2-timothy",
  "jude",
  "matthew",
  "john",
  "1-john",
  "2-john",
  "3-john",
  "revelation"
] as const;

const CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX = Object.fromEntries(
  CHRONOLOGICAL_OLD_TESTAMENT_ORDER.map((slug, index) => [slug, index])
) as Record<string, number>;

const CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX = Object.fromEntries(
  CHRONOLOGICAL_NEW_TESTAMENT_ORDER.map((slug, index) => [slug, index])
) as Record<string, number>;

export function getChronologicalOldTestamentBooks<T extends BookMeta>(books: T[]): T[] {
  const orderedBooks = books
    .filter(
      (book) =>
        book.testament === "Old" &&
        typeof CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX[book.slug] === "number"
    )
    .sort(
      (left, right) =>
        CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX[left.slug] -
        CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX[right.slug]
    );
  const remainingBooks = books
    .filter(
      (book) =>
        book.testament === "Old" &&
        typeof CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX[book.slug] !== "number"
    )
    .sort((left, right) => left.order - right.order);

  return [...orderedBooks, ...remainingBooks];
}

export function getChronologicalNewTestamentBooks<T extends BookMeta>(books: T[]): T[] {
  const orderedBooks = books
    .filter(
      (book) =>
        book.testament === "New" &&
        typeof CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX[book.slug] === "number"
    )
    .sort(
      (left, right) =>
        CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX[left.slug] -
        CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX[right.slug]
    );
  const remainingBooks = books
    .filter(
      (book) =>
        book.testament === "New" &&
        typeof CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX[book.slug] !== "number"
    )
    .sort((left, right) => left.order - right.order);

  return [...orderedBooks, ...remainingBooks];
}

export function getBooksForOrderMode<T extends BookMeta>(
  books: T[],
  mode: BibleBookOrderMode
): T[] {
  if (mode === "chronological-old-testament") {
    return [
      ...getChronologicalOldTestamentBooks(books),
      ...books.filter((book) => book.testament === "New")
    ];
  }

  if (mode === "chronological-new-testament") {
    return [
      ...books.filter((book) => book.testament === "Old"),
      ...getChronologicalNewTestamentBooks(books)
    ];
  }

  return books;
}
