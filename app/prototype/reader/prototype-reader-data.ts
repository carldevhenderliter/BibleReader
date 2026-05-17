import { getBookBySlug, getBooks, getChapter } from "@/lib/bible/data";
import { getEsvInterlinearChapter } from "@/lib/bible/esv-interlinear";
import { getMasoreticChapter } from "@/lib/bible/masoretic";
import type { BundledBibleVersion } from "@/lib/bible/types";
import {
  getInstalledBundledBibleVersions,
  isInstalledBundledBibleVersion
} from "@/lib/bible/version";
import { isValidChapter } from "@/lib/bible/utils";

function getPrototypeVersion(
  value: string | undefined,
  installedVersions: readonly BundledBibleVersion[]
) {
  if (isInstalledBundledBibleVersion(value) && installedVersions.includes(value)) {
    return value;
  }

  return installedVersions.includes("greek") ? "greek" : installedVersions[0] ?? "web";
}

export async function getPrototypeReaderStaticParams() {
  const books = (await getBooks("web")).filter((book) => book.slug !== "gospel-harmony");

  return books.flatMap((book) =>
    Array.from({ length: book.chapterCount }, (_, index) => ({
      book: book.slug,
      chapter: String(index + 1)
    }))
  );
}

export async function loadPrototypeReaderPage(
  bookSlug = "titus",
  chapterNumber = 1,
  requestedVersion?: string
) {
  const installedVersions = getInstalledBundledBibleVersions();
  const selectedVersion = getPrototypeVersion(requestedVersion, installedVersions);
  const [books, book] = await Promise.all([
    getBooks("web"),
    getBookBySlug(bookSlug, "web")
  ]);
  const filteredBooks = books.filter((candidateBook) => candidateBook.slug !== "gospel-harmony");

  if (!book || !isValidChapter(book, chapterNumber)) {
    return null;
  }

  const [esvInterlinearChapter, masoreticChapter, ...chapterEntries] = await Promise.all([
    getEsvInterlinearChapter(book.slug, chapterNumber),
    getMasoreticChapter(book.slug, chapterNumber),
    ...installedVersions.map(async (version) => [
      version,
      await getChapter(book.slug, chapterNumber, version)
    ] as const)
  ]);
  const chaptersByVersion = Object.fromEntries(chapterEntries);
  const selectedChapter =
    chaptersByVersion[selectedVersion] ??
    chaptersByVersion.greek ??
    chaptersByVersion.web ??
    Object.values(chaptersByVersion).find(Boolean) ??
    null;

  if (!selectedChapter) {
    return null;
  }

  return {
    book,
    books: filteredBooks,
    chapter: selectedChapter,
    chaptersByVersion,
    currentChapter: chapterNumber,
    esvInterlinearChapter,
    installedVersions,
    masoreticChapter,
    selectedVersion
  };
}
