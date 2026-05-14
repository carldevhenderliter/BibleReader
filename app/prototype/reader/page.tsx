import { ReaderPrototypePageContent } from "@/app/components/ReaderPrototypePageContent";
import { getBooks, getChapter } from "@/lib/bible/data";
import type { BundledBibleVersion } from "@/lib/bible/types";
import {
  getInstalledBundledBibleVersions,
  isInstalledBundledBibleVersion
} from "@/lib/bible/version";

function getPrototypeVersion(
  value: string | undefined,
  installedVersions: readonly BundledBibleVersion[]
) {
  if (isInstalledBundledBibleVersion(value)) {
    return value;
  }

  return installedVersions.includes("greek") ? "greek" : installedVersions[0] ?? "web";
}

function getPrototypeChapterNumber(value: string | undefined, chapterCount: number) {
  const parsedValue = value && /^\d+$/.test(value) ? Number(value) : 1;

  if (!Number.isFinite(parsedValue)) {
    return 1;
  }

  return Math.min(Math.max(parsedValue, 1), chapterCount);
}

export default async function ReaderPrototypePage() {
  const installedVersions = getInstalledBundledBibleVersions();
  const selectedVersion = getPrototypeVersion(undefined, installedVersions);
  const books = (await getBooks("web")).filter((book) => book.slug !== "gospel-harmony");
  const fallbackBook = books.find((book) => book.slug === "titus") ?? books[0] ?? null;
  const book = fallbackBook;

  if (!book) {
    return null;
  }

  const chapterNumber = getPrototypeChapterNumber(undefined, book.chapterCount);
  const chapterEntries = await Promise.all(
    installedVersions.map(async (version) => [
      version,
      await getChapter(book.slug, chapterNumber, version)
    ] as const)
  );
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

  return (
    <ReaderPrototypePageContent
      book={book}
      books={books}
      chapter={selectedChapter}
      chaptersByVersion={chaptersByVersion}
      currentChapter={chapterNumber}
      installedVersions={installedVersions}
      selectedVersion={selectedVersion}
    />
  );
}
