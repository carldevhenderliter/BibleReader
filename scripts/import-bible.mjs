import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bibleDir = path.join(repoRoot, "data", "bible");
const legacyBooksPath = path.join(bibleDir, "books.json");
const legacyBooksDir = path.join(bibleDir, "books");
const versionsDir = path.join(bibleDir, "versions");
const searchDir = path.join(bibleDir, "search");
const sourceBooksPath = path.join(repoRoot, "data", "source", "books.json");
const kjvVersesPath = path.join(repoRoot, "node_modules", "kjv", "json", "verses-1769.json");

const KJV_BOOK_NAME_BY_SLUG = {
  "song-of-solomon": "Solomon's Song"
};

/**
 * @typedef {{
 *   name: string;
 *   slug: string;
 *   sourceKey: string;
 *   abbreviation: string;
 *   testament: "Old" | "New";
 *   chapterCount: number;
 *   order: number;
 * }} SourceBook
 */

/**
 * @typedef {{
 *   slug: string;
 *   name: string;
 *   abbreviation: string;
 *   testament: "Old" | "New";
 *   chapterCount: number;
 *   order: number;
 * }} BookMeta
 */

/**
 * @typedef {{ number: number; text: string }} Verse
 * @typedef {{ bookSlug: string; chapterNumber: number; verses: Verse[] }} Chapter
 * @typedef {{ book: BookMeta; chapters: Chapter[] }} BookPayload
 */

async function main() {
  const sourceBooks = /** @type {SourceBook[]} */ (
    JSON.parse(await readFile(sourceBooksPath, "utf8"))
  );

  await mkdir(versionsDir, { recursive: true });

  const webPayloadBySlug = await importWebVersion();
  validateOutput("web", sourceBooks, webPayloadBySlug);

  const kjvPayloadBySlug = await importKjvVersion(sourceBooks);
  validateOutput("kjv", sourceBooks, kjvPayloadBySlug);

  await buildSearchIndex("web", webPayloadBySlug);
  await buildSearchIndex("kjv", kjvPayloadBySlug);

  console.log(`Imported bundled versions into ${path.relative(repoRoot, versionsDir)}.`);
}

/**
 * @returns {Promise<Map<string, BookPayload>>}
 */
async function importWebVersion() {
  const webDir = path.join(versionsDir, "web");

  await rm(webDir, { recursive: true, force: true });
  await mkdir(webDir, { recursive: true });
  await cp(legacyBooksDir, path.join(webDir, "books"), { recursive: true });
  await cp(legacyBooksPath, path.join(webDir, "books.json"));

  const metadata = /** @type {BookMeta[]} */ (
    JSON.parse(await readFile(path.join(webDir, "books.json"), "utf8"))
  );
  /** @type {Map<string, BookPayload>} */
  const payloadBySlug = new Map();

  for (const book of metadata) {
    const payload = /** @type {BookPayload} */ (
      JSON.parse(await readFile(path.join(webDir, "books", `${book.slug}.json`), "utf8"))
    );

    payloadBySlug.set(book.slug, payload);
  }

  return payloadBySlug;
}

/**
 * @param {SourceBook[]} sourceBooks
 * @returns {Promise<Map<string, BookPayload>>}
 */
async function importKjvVersion(sourceBooks) {
  const kjvDir = path.join(versionsDir, "kjv");
  const booksDir = path.join(kjvDir, "books");

  await rm(kjvDir, { recursive: true, force: true });
  await mkdir(booksDir, { recursive: true });

  const verses = /** @type {Record<string, string>} */ (
    JSON.parse(await readFile(kjvVersesPath, "utf8"))
  );
  const groupedVerses = groupKjvVerses(verses);
  /** @type {BookMeta[]} */
  const metadata = [];
  /** @type {Map<string, BookPayload>} */
  const payloadBySlug = new Map();

  for (const sourceBook of sourceBooks) {
    const bookName = KJV_BOOK_NAME_BY_SLUG[sourceBook.slug] ?? sourceBook.name;
    const chapterMap = groupedVerses.get(bookName);

    if (!chapterMap) {
      throw new Error(`KJV source is missing ${sourceBook.name}.`);
    }

    const payload = transformKjvBook(sourceBook, chapterMap);

    metadata.push(payload.book);
    payloadBySlug.set(payload.book.slug, payload);
    await writeFile(path.join(booksDir, `${sourceBook.slug}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  }

  await writeFile(path.join(kjvDir, "books.json"), `${JSON.stringify(metadata, null, 2)}\n`);

  return payloadBySlug;
}

/**
 * @param {Record<string, string>} verses
 */
function groupKjvVerses(verses) {
  /** @type {Map<string, Map<number, Map<number, string>>>} */
  const grouped = new Map();

  for (const [reference, text] of Object.entries(verses)) {
    const match = reference.match(/^(.*) (\d+):(\d+)$/);

    if (!match) {
      continue;
    }

    const [, bookName, chapterValue, verseValue] = match;
    const chapterNumber = Number(chapterValue);
    const verseNumber = Number(verseValue);

    let chapterMap = grouped.get(bookName);

    if (!chapterMap) {
      chapterMap = new Map();
      grouped.set(bookName, chapterMap);
    }

    let verseMap = chapterMap.get(chapterNumber);

    if (!verseMap) {
      verseMap = new Map();
      chapterMap.set(chapterNumber, verseMap);
    }

    verseMap.set(verseNumber, normalizeKjvVerseText(text));
  }

  return grouped;
}

/**
 * @param {SourceBook} sourceBook
 * @param {Map<number, Map<number, string>>} chapterMap
 * @returns {BookPayload}
 */
function transformKjvBook(sourceBook, chapterMap) {
  /** @type {Chapter[]} */
  const chapters = [];

  for (let chapterNumber = 1; chapterNumber <= sourceBook.chapterCount; chapterNumber += 1) {
    const verseMap = chapterMap.get(chapterNumber);

    if (!verseMap) {
      throw new Error(`${sourceBook.name} is missing chapter ${chapterNumber} in KJV.`);
    }

    const verses = Array.from(verseMap.entries())
      .sort(([left], [right]) => left - right)
      .map(([number, text]) => ({
        number,
        text
      }))
      .filter((verse) => verse.text.length > 0);

    if (verses.length === 0) {
      throw new Error(`${sourceBook.name} ${chapterNumber} has no verses in KJV.`);
    }

    chapters.push({
      bookSlug: sourceBook.slug,
      chapterNumber,
      verses
    });
  }

  return {
    book: {
      slug: sourceBook.slug,
      name: sourceBook.name,
      abbreviation: sourceBook.abbreviation,
      testament: sourceBook.testament,
      chapterCount: sourceBook.chapterCount,
      order: sourceBook.order
    },
    chapters
  };
}

/**
 * @param {string} text
 */
function normalizeKjvVerseText(text) {
  return text.replace(/^#\s*/, "").replace(/\r/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * @param {"web" | "kjv"} version
 * @param {SourceBook[]} sourceBooks
 * @param {Map<string, BookPayload>} payloadBySlug
 */
function validateOutput(version, sourceBooks, payloadBySlug) {
  if (payloadBySlug.size !== sourceBooks.length) {
    throw new Error(`Expected ${sourceBooks.length} ${version} books, received ${payloadBySlug.size}.`);
  }

  const genesis = payloadBySlug.get("genesis");
  const revelation = payloadBySlug.get("revelation");

  if (!genesis?.chapters[0]?.verses.length) {
    throw new Error(`${version} Genesis 1 did not resolve correctly.`);
  }

  if (!revelation?.chapters[21]?.verses.length) {
    throw new Error(`${version} Revelation 22 did not resolve correctly.`);
  }

  for (const sourceBook of sourceBooks) {
    const payload = payloadBySlug.get(sourceBook.slug);

    if (!payload) {
      throw new Error(`${version} is missing ${sourceBook.name}.`);
    }

    if (payload.chapters.length !== sourceBook.chapterCount) {
      throw new Error(
        `${version} ${sourceBook.name} chapter count mismatch: expected ${sourceBook.chapterCount}, received ${payload.chapters.length}.`
      );
    }

    if (payload.chapters.some((chapter) => chapter.verses.length === 0)) {
      throw new Error(`${version} contains an empty chapter in ${sourceBook.name}.`);
    }
  }
}

/**
 * @param {"web" | "kjv"} version
 * @param {Map<string, BookPayload>} payloadBySlug
 */
async function buildSearchIndex(version, payloadBySlug) {
  await mkdir(searchDir, { recursive: true });

  const entries = Array.from(payloadBySlug.values()).flatMap((payload) =>
    payload.chapters.flatMap((chapter) =>
      chapter.verses.map((verse) => ({
        version,
        bookSlug: payload.book.slug,
        bookName: payload.book.name,
        chapterNumber: chapter.chapterNumber,
        verseNumber: verse.number,
        text: verse.text
      }))
    )
  );

  await writeFile(path.join(searchDir, `${version}.json`), `${JSON.stringify(entries, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
