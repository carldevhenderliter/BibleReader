import type { BookMeta } from "@/lib/bible/types";
import {
  getBookHref,
  getBookChapterHref,
  getBookHighlightedVerseHref,
  getBookHighlightedVerseRangeHref,
  getChapterHref,
  getChapterLinks,
  getReadingHref,
  isValidChapter,
  parseChapterParam
} from "@/lib/bible/utils";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  },
  {
    slug: "exodus",
    name: "Exodus",
    abbreviation: "Exod",
    testament: "Old",
    chapterCount: 40,
    order: 2
  },
  {
    slug: "revelation",
    name: "Revelation",
    abbreviation: "Rev",
    testament: "New",
    chapterCount: 22,
    order: 66
  }
];

describe("bible utils", () => {
  it("parses valid chapter parameters", () => {
    expect(parseChapterParam("1")).toBe(1);
    expect(parseChapterParam("22")).toBe(22);
  });

  it("rejects invalid chapter parameters", () => {
    expect(parseChapterParam("0")).toBeNull();
    expect(parseChapterParam("-1")).toBeNull();
    expect(parseChapterParam("genesis")).toBeNull();
  });

  it("creates chapter and book hrefs", () => {
    expect(getChapterHref("genesis", 1)).toBe("/read/genesis/1");
    expect(getBookHref("genesis")).toBe("/read/genesis");
    expect(getBookChapterHref("genesis", 3)).toBe("/read/genesis?chapter=3");
    expect(getBookHighlightedVerseHref("genesis", 1, 2)).toBe(
      "/read/genesis?highlightChapter=1&highlight=2"
    );
    expect(getBookHighlightedVerseRangeHref("genesis", 1, 2, 4)).toBe(
      "/read/genesis?highlightChapter=1&highlightStart=2&highlightEnd=4"
    );
    expect(getChapterHref("genesis", 1, "kjv")).toBe("/read/genesis/1?version=kjv");
    expect(getBookHref("genesis", "kjv")).toBe("/read/genesis?version=kjv");
    expect(getBookChapterHref("genesis", 3, "kjv")).toBe("/read/genesis?version=kjv&chapter=3");
    expect(getBookHighlightedVerseHref("genesis", 1, 2, "kjv")).toBe(
      "/read/genesis?version=kjv&highlightChapter=1&highlight=2"
    );
  });

  it("returns previous and next chapter links across books", () => {
    expect(getChapterLinks(books, books[0], 1)).toEqual({
      previous: null,
      next: {
        href: "/read/genesis/2",
        label: "Genesis 2"
      }
    });

    expect(getChapterLinks(books, books[0], 50)).toEqual({
      previous: {
        href: "/read/genesis/49",
        label: "Genesis 49"
      },
      next: {
        href: "/read/exodus/1",
        label: "Exodus 1"
      }
    });

    expect(getChapterLinks(books, books[2], 22)).toEqual({
      previous: {
        href: "/read/revelation/21",
        label: "Revelation 21"
      },
      next: null
    });

    expect(getChapterLinks(books, books[0], 50, "kjv")).toEqual({
      previous: {
        href: "/read/genesis/49?version=kjv",
        label: "Genesis 49"
      },
      next: {
        href: "/read/exodus/1?version=kjv",
        label: "Exodus 1"
      }
    });
  });

  it("validates chapter bounds", () => {
    expect(isValidChapter(books[0], 1)).toBe(true);
    expect(isValidChapter(books[0], 51)).toBe(false);
  });

  it("builds continue-reading hrefs", () => {
    expect(getReadingHref({ book: "john", chapter: 3, view: "chapter", version: "web" })).toBe(
      "/read/john/3"
    );
    expect(getReadingHref({ book: "john", chapter: 3, view: "book", version: "web" })).toBe(
      "/read/john"
    );
    expect(getReadingHref({ book: "john", chapter: 3, view: "chapter", version: "kjv" })).toBe(
      "/read/john/3?version=kjv"
    );
  });
});
