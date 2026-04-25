import type { BookMeta } from "@/lib/bible/types";

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

const CHRONOLOGICAL_NEW_TESTAMENT_ORDER_INDEX = Object.fromEntries(
  CHRONOLOGICAL_NEW_TESTAMENT_ORDER.map((slug, index) => [slug, index])
) as Record<string, number>;

export function getChronologicalNewTestamentBooks<T extends BookMeta>(books: T[]): T[] {
  return books
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
}
