import type { BookMeta, Testament } from "@/lib/bible/types";

export type BibleBookOrderMode =
  | "canonical"
  | "chronological-old-testament"
  | "chronological-new-testament";

export const BIBLE_BOOK_ORDER_STORAGE_KEY = "bible-reader.book-order";

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

export const NEW_TESTAMENT_BOOK_SLUGS = [
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1-corinthians",
  "2-corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1-thessalonians",
  "2-thessalonians",
  "1-timothy",
  "2-timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1-peter",
  "2-peter",
  "1-john",
  "2-john",
  "3-john",
  "jude",
  "revelation",
  "gospel-harmony"
] as const;

const NEW_TESTAMENT_BOOK_SLUG_SET = new Set<string>(NEW_TESTAMENT_BOOK_SLUGS);

const CHRONOLOGICAL_OLD_TESTAMENT_ORDER_INDEX = Object.fromEntries(
  CHRONOLOGICAL_OLD_TESTAMENT_ORDER.map((slug, index) => [slug, index])
) as Record<string, number>;

const CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX = Object.fromEntries(
  CHRONOLOGICAL_NEW_TESTAMENT_ORDER.map((slug, index) => [slug, index])
) as Record<string, number>;

export function getBookTestamentBySlug(bookSlug: string): Testament {
  return NEW_TESTAMENT_BOOK_SLUG_SET.has(bookSlug) ? "New" : "Old";
}

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

export function normalizeBibleBookOrderMode(
  value: string | null | undefined
): BibleBookOrderMode {
  if (
    value === "chronological-old-testament" ||
    value === "chronological-new-testament"
  ) {
    return value;
  }

  if (value === "chronological") {
    return "chronological-new-testament";
  }

  return "canonical";
}

export function getNextBookForOrderMode<T extends BookMeta>(
  books: T[],
  currentBookSlug: string,
  mode: BibleBookOrderMode
): T | null {
  const orderedBooks = getBooksForOrderMode(books, mode);
  const currentBookIndex = orderedBooks.findIndex((book) => book.slug === currentBookSlug);

  if (currentBookIndex === -1 || currentBookIndex >= orderedBooks.length - 1) {
    return null;
  }

  return orderedBooks[currentBookIndex + 1] ?? null;
}
