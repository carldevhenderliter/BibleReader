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
const strongsDir = path.join(bibleDir, "strongs");
const sourceBooksPath = path.join(repoRoot, "data", "source", "books.json");
const strongsSourceDir = path.join(repoRoot, "data", "source", "strongs-kjv");
const strongsBooksPath = path.join(strongsSourceDir, "books.json");
const strongsLexiconPath = path.join(strongsSourceDir, "lexicon.json");

const STRONGS_BOOK_NAME_BY_SLUG = {
  "song-of-solomon": "Song of Songs"
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
 * @typedef {{ text: string, strongsNumbers?: string[] }} VerseToken
 * @typedef {{ bookSlug: string; chapterNumber: number; verses: Verse[] }} Chapter
 * @typedef {{ book: BookMeta; chapters: Chapter[] }} BookPayload
 * @typedef {{ id: string, language: "hebrew" | "greek", lemma: string, transliteration: string, definition: string, partOfSpeech: string, rootWord: string, outlineUsage: string }} StrongsEntry
 * @typedef {{ strongsNumber: string, bookSlug: string, bookName: string, chapterNumber: number, verseNumber: number, text: string }} StrongsSearchVerseEntry
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
  await buildStrongsSearchIndex(kjvPayloadBySlug);

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
  const strongsManifest = /** @type {{ books: Record<string, string>[] }} */ (
    JSON.parse(await readFile(strongsBooksPath, "utf8"))
  );
  const lexicon = /** @type {Record<string, unknown>} */ (
    JSON.parse(await readFile(strongsLexiconPath, "utf8"))
  );
  const sourceCodeByName = new Map(
    strongsManifest.books.flatMap((entry) => {
      const [name, code] = Object.entries(entry)[0] ?? [];
      return name && code ? [[name, code]] : [];
    })
  );

  await rm(kjvDir, { recursive: true, force: true });
  await mkdir(booksDir, { recursive: true });
  /** @type {BookMeta[]} */
  const metadata = [];
  /** @type {Map<string, BookPayload>} */
  const payloadBySlug = new Map();

  for (const sourceBook of sourceBooks) {
    const sourceName = STRONGS_BOOK_NAME_BY_SLUG[sourceBook.slug] ?? sourceBook.name;
    const sourceCode = sourceCodeByName.get(sourceName);

    if (!sourceCode) {
      throw new Error(`KJV Strongs source is missing ${sourceBook.name}.`);
    }

    const rawBookText = await readFile(path.join(strongsSourceDir, `${sourceCode}.json`), "utf8");
    const verseTextByReference = extractEnglishVerses(rawBookText);
    const payload = transformKjvBook(sourceBook, sourceCode, verseTextByReference);

    metadata.push(payload.book);
    payloadBySlug.set(payload.book.slug, payload);
    await writeFile(path.join(booksDir, `${sourceBook.slug}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  }

  await writeFile(path.join(kjvDir, "books.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  await writeStrongsLexicon(lexicon);

  return payloadBySlug;
}

/**
 * @param {string} value
 */
function decodeHtmlEntities(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * @param {string} text
 */
function sanitizeTaggedText(text) {
  return decodeHtmlEntities(text).replace(/<\/?em>/g, "");
}

/**
 * @param {string} text
 * @returns {VerseToken[]}
 */
function parseVerseTokens(text) {
  const sanitizedText = sanitizeTaggedText(text);
  const tokens = [];
  const tagGroupPattern = /(?:\[(?:H|G)\d+\])+/g;
  let cursor = 0;

  for (const match of sanitizedText.matchAll(tagGroupPattern)) {
    const index = match.index ?? 0;
    const segmentText = sanitizedText.slice(cursor, index);
    const strongsNumbers = Array.from(match[0].matchAll(/\[(H|G)\d+\]/g), ([tag]) =>
      tag.slice(1, -1)
    );

    if (segmentText) {
      tokens.push(
        strongsNumbers.length > 0
          ? {
              text: segmentText,
              strongsNumbers
            }
          : {
              text: segmentText
            }
      );
    }

    cursor = index + match[0].length;
  }

  const remainder = sanitizedText.slice(cursor);

  if (remainder) {
    tokens.push({ text: remainder });
  }

  return tokens;
}

/**
 * @param {VerseToken[]} tokens
 */
function getPlainVerseText(tokens) {
  return tokens.map((token) => token.text).join("").replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * @param {string} rawBookText
 */
function extractEnglishVerses(rawBookText) {
  /** @type {Map<string, string>} */
  const verseTextByReference = new Map();
  const versePattern =
    /"([^"]+\|\d+\|\d+)":\s*\{\s*"en":\s*"((?:\\.|[^"\\])*)",\s*"bg":/g;

  for (const match of rawBookText.matchAll(versePattern)) {
    const reference = match[1];
    const encodedText = match[2];

    if (!reference || !encodedText) {
      continue;
    }

    verseTextByReference.set(reference, JSON.parse(`"${encodedText}"`));
  }

  return verseTextByReference;
}

/**
 * @param {SourceBook} sourceBook
 * @param {string} sourceCode
 * @param {Map<string, string>} verseTextByReference
 * @returns {BookPayload}
 */
function transformKjvBook(sourceBook, sourceCode, verseTextByReference) {
  /** @type {Chapter[]} */
  const chapters = [];

  for (let chapterNumber = 1; chapterNumber <= sourceBook.chapterCount; chapterNumber += 1) {
    const verses = Array.from(verseTextByReference.entries())
      .filter(([reference]) => reference.startsWith(`${sourceCode}|${chapterNumber}|`))
      .sort(([left], [right]) => {
        const leftVerseNumber = Number(left.split("|").at(-1));
        const rightVerseNumber = Number(right.split("|").at(-1));

        return leftVerseNumber - rightVerseNumber;
      })
      .map(([key, rawVerseText]) => {
        const verseNumber = Number(key.split("|").at(-1));
        const tokens = parseVerseTokens(rawVerseText);

        return {
          number: verseNumber,
          text: getPlainVerseText(tokens),
          tokens
        };
      })
      .filter((verse) => verse.text.length > 0);

    if (verses.length === 0) {
      throw new Error(`${sourceBook.name} is missing chapter ${chapterNumber} in KJV.`);
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
 * @param {Record<string, unknown>} lexicon
 */
async function writeStrongsLexicon(lexicon) {
  await mkdir(strongsDir, { recursive: true });

  /** @type {Record<string, StrongsEntry>} */
  const normalizedLexicon = {};

  for (const [id, value] of Object.entries(lexicon)) {
    if (!/^([HG])\d+$/.test(id) || !value || typeof value !== "object") {
      continue;
    }

    const entry = /** @type {{
     * Hb_word?: string;
     * Gk_word?: string;
     * transliteration?: string;
     * strongs_def?: string;
     * part_of_speech?: string;
     * root_word?: string;
     * outline_usage?: string;
     * }} */ (value);

    normalizedLexicon[id] = {
      id,
      language: id.startsWith("H") ? "hebrew" : "greek",
      lemma: decodeHtmlEntities(entry.Hb_word ?? entry.Gk_word ?? "").trim(),
      transliteration: decodeHtmlEntities(entry.transliteration ?? "").trim(),
      definition: decodeHtmlEntities(entry.strongs_def ?? "").trim(),
      partOfSpeech: decodeHtmlEntities(entry.part_of_speech ?? "").trim(),
      rootWord: decodeHtmlEntities(entry.root_word ?? "").trim(),
      outlineUsage: decodeHtmlEntities(entry.outline_usage ?? "").trim()
    };
  }

  await writeFile(path.join(strongsDir, "lexicon.json"), `${JSON.stringify(normalizedLexicon, null, 2)}\n`);
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

/**
 * @param {Map<string, BookPayload>} payloadBySlug
 */
async function buildStrongsSearchIndex(payloadBySlug) {
  await mkdir(searchDir, { recursive: true });

  const entries = Array.from(payloadBySlug.values()).flatMap((payload) =>
    payload.chapters.flatMap((chapter) =>
      chapter.verses.flatMap((verse) => {
        const strongsNumbers = Array.from(
          new Set(
            (verse.tokens ?? []).flatMap((token) => token.strongsNumbers ?? [])
          )
        );

        return strongsNumbers.map(
          /** @returns {StrongsSearchVerseEntry} */
          (strongsNumber) => ({
            strongsNumber,
            bookSlug: payload.book.slug,
            bookName: payload.book.name,
            chapterNumber: chapter.chapterNumber,
            verseNumber: verse.number,
            text: verse.text
          })
        );
      })
    )
  );

  await writeFile(
    path.join(searchDir, "strongs-kjv.json"),
    `${JSON.stringify(entries, null, 2)}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
