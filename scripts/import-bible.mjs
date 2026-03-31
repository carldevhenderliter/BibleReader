import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bibleDir = path.join(repoRoot, "data", "bible");
const legacyBooksPath = path.join(bibleDir, "books.json");
const legacyBooksDir = path.join(bibleDir, "books");
const versionsDir = path.join(bibleDir, "versions");
const searchDir = path.join(bibleDir, "search");
const strongsDir = path.join(bibleDir, "strongs");
const installedVersionsPath = path.join(bibleDir, "installed-versions.json");
const sourceBooksPath = path.join(repoRoot, "data", "source", "books.json");
const topicsSourcePath = path.join(repoRoot, "data", "source", "topics.json");
const strongsSourceDir = path.join(repoRoot, "data", "source", "strongs-kjv");
const strongsBooksPath = path.join(strongsSourceDir, "books.json");
const strongsLexiconPath = path.join(strongsSourceDir, "lexicon.json");
const nltPdfPath = path.join(repoRoot, "PDF", "New-Living-Translation-NLT.pdf");

const STRONGS_BOOK_NAME_BY_SLUG = {
  "song-of-solomon": "Song of Songs"
};

const NLT_BOOK_CODE_BY_SLUG = {
  genesis: "Gen",
  exodus: "Exo",
  leviticus: "Lev",
  numbers: "Num",
  deuteronomy: "Deu",
  joshua: "Jos",
  judges: "Jdg",
  ruth: "Rut",
  "1-samuel": "1Sa",
  "2-samuel": "2Sa",
  "1-kings": "1Ki",
  "2-kings": "2Ki",
  "1-chronicles": "1Ch",
  "2-chronicles": "2Ch",
  ezra: "Ezr",
  nehemiah: "Neh",
  esther: "Est",
  job: "Job",
  psalms: "Psa",
  proverbs: "Pro",
  ecclesiastes: "Ecc",
  "song-of-solomon": "Sol",
  isaiah: "Isa",
  jeremiah: "Jer",
  lamentations: "Lam",
  ezekiel: "Eze",
  daniel: "Dan",
  hosea: "Hos",
  joel: "Joe",
  amos: "Amo",
  obadiah: "Oba",
  jonah: "Jon",
  micah: "Mic",
  nahum: "Nah",
  habakkuk: "Hab",
  zephaniah: "Zep",
  haggai: "Hag",
  zechariah: "Zec",
  malachi: "Mal",
  matthew: "Mat",
  mark: "Mar",
  luke: "Luk",
  john: "Joh",
  acts: "Act",
  romans: "Rom",
  "1-corinthians": "1Co",
  "2-corinthians": "2Co",
  galatians: "Gal",
  ephesians: "Eph",
  philippians: "Phi",
  colossians: "Col",
  "1-thessalonians": "1Th",
  "2-thessalonians": "2Th",
  "1-timothy": "1Ti",
  "2-timothy": "2Ti",
  titus: "Tit",
  philemon: "Phm",
  hebrews: "Heb",
  james: "Jam",
  "1-peter": "1Pe",
  "2-peter": "2Pe",
  "1-john": "1Jo",
  "2-john": "2Jo",
  "3-john": "3Jo",
  jude: "Jud",
  revelation: "Rev"
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
 * @typedef {{ bookSlug: string, chapterNumber: number, verseNumber: number }} TopicReference
 * @typedef {{ id: string, label: string, references: TopicReference[] }} TopicSourceSubtopic
 * @typedef {{ id: string, label: string, aliases: string[], subtopics: TopicSourceSubtopic[] }} TopicSourceEntry
 * @typedef {{ id: string, label: string, aliases: string[], subtopics: { id: string, label: string, verses: Array<{ version: "web" | "kjv" | "nlt", bookSlug: string, bookName: string, chapterNumber: number, verseNumber: number, text: string, tokens?: VerseToken[] }> }[] }} TopicSearchEntry
 * @typedef {{ id: string, language: "hebrew" | "greek", lemma: string, transliteration: string, definition: string, partOfSpeech: string, rootWord: string, outlineUsage: string }} StrongsEntry
 * @typedef {{ strongsNumber: string, bookSlug: string, bookName: string, chapterNumber: number, verseNumber: number, text: string }} StrongsSearchVerseEntry
 */

async function main() {
  const shouldIncludeNlt = process.argv.includes("--include-nlt");
  const sourceBooks = /** @type {SourceBook[]} */ (
    JSON.parse(await readFile(sourceBooksPath, "utf8"))
  );
  const topicsSource = /** @type {TopicSourceEntry[]} */ (
    JSON.parse(await readFile(topicsSourcePath, "utf8"))
  );

  await mkdir(versionsDir, { recursive: true });

  const webPayloadBySlug = await importWebVersion();
  validateOutput("web", sourceBooks, webPayloadBySlug);

  const kjvPayloadBySlug = await importKjvVersion(sourceBooks);
  validateOutput("kjv", sourceBooks, kjvPayloadBySlug);

  let nltPayloadBySlug = null;

  if (shouldIncludeNlt) {
    nltPayloadBySlug = await importNltVersion(sourceBooks);
    validateOutput("nlt", sourceBooks, nltPayloadBySlug);
  } else {
    await resetNltArtifacts();
  }

  await buildSearchIndex("web", webPayloadBySlug);
  await buildSearchIndex("kjv", kjvPayloadBySlug);
  if (nltPayloadBySlug) {
    await buildSearchIndex("nlt", nltPayloadBySlug);
  }
  await buildStrongsSearchIndex(kjvPayloadBySlug);
  await buildTopicSearchIndex("web", topicsSource, sourceBooks, webPayloadBySlug);
  await buildTopicSearchIndex("kjv", topicsSource, sourceBooks, kjvPayloadBySlug);
  if (nltPayloadBySlug) {
    await buildTopicSearchIndex("nlt", topicsSource, sourceBooks, nltPayloadBySlug);
  }
  await writeInstalledVersions(nltPayloadBySlug ? ["web", "kjv", "nlt"] : ["web", "kjv"]);

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

async function writeInstalledVersions(versions) {
  await writeFile(installedVersionsPath, `${JSON.stringify(versions, null, 2)}\n`);
}

async function resetNltArtifacts() {
  const nltDir = path.join(versionsDir, "nlt");

  await rm(nltDir, { recursive: true, force: true });
  await mkdir(nltDir, { recursive: true });
  await mkdir(searchDir, { recursive: true });
  await writeFile(path.join(nltDir, "books.json"), "[]\n");
  await writeFile(path.join(searchDir, "nlt.json"), "[]\n");
  await writeFile(path.join(searchDir, "topics-nlt.json"), "[]\n");
}

function normalizeNltWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeNltVerseText(value) {
  return normalizeNltWhitespace(
    value
      .replace(/\f/g, " ")
      .replace(/LORD\]/g, "LORD")
      .replace(/\b([A-Za-z]+)-\s+([a-z][A-Za-z-]*)\b/g, "$1$2")
      .replace(/\s+([,;:.!?])/g, "$1")
  );
}

async function extractNltPdfText() {
  try {
    const { stdout } = await execFile("pdftotext", [nltPdfPath, "-"], {
      maxBuffer: 64 * 1024 * 1024
    });

    return stdout;
  } catch (error) {
    const message =
      error && typeof error === "object" && "message" in error ? String(error.message) : "Unknown error";

    throw new Error(`Failed to extract text from the NLT PDF with pdftotext: ${message}`);
  }
}

/**
 * @param {SourceBook[]} sourceBooks
 * @returns {Promise<Map<string, BookPayload>>}
 */
async function importNltVersion(sourceBooks) {
  const nltDir = path.join(versionsDir, "nlt");
  const booksDir = path.join(nltDir, "books");
  const pdfText = await extractNltPdfText();
  const bookByCode = new Map(
    sourceBooks.map((book) => {
      const code = NLT_BOOK_CODE_BY_SLUG[book.slug];

      if (!code) {
        throw new Error(`NLT source mapping is missing ${book.slug}.`);
      }

      return [code, book];
    })
  );

  await rm(nltDir, { recursive: true, force: true });
  await mkdir(booksDir, { recursive: true });

  /** @type {Array<{ bookSlug: string, chapterNumber: number, verseNumber: number, text: string }>} */
  const parsedVerses = [];
  let currentVerse = null;

  const flushCurrentVerse = () => {
    if (!currentVerse) {
      return;
    }

    const text = normalizeNltVerseText(currentVerse.parts.join(" "));

    if (!text) {
      throw new Error(
        `Encountered an empty NLT verse at ${currentVerse.bookSlug} ${currentVerse.chapterNumber}:${currentVerse.verseNumber}.`
      );
    }

    parsedVerses.push({
      bookSlug: currentVerse.bookSlug,
      chapterNumber: currentVerse.chapterNumber,
      verseNumber: currentVerse.verseNumber,
      text
    });
    currentVerse = null;
  };

  for (const rawLine of pdfText.replace(/\r/g, "").split("\n")) {
    const trimmedLine = rawLine.replace(/\f/g, "").trim();

    if (!trimmedLine || trimmedLine === "The Holy Bible" || trimmedLine === "New Living Translation NLT") {
      continue;
    }

    const referenceMatch = rawLine.match(/^(?:\f)?([1-3]?[A-Za-z]{2,6})\s+(\d+):(\d+)\s+(.*)$/);

    if (referenceMatch) {
      flushCurrentVerse();

      const [, bookCode, chapterValue, verseValue, openingText] = referenceMatch;
      const book = bookByCode.get(bookCode);

      if (!book) {
        throw new Error(`Unexpected NLT book code ${bookCode}.`);
      }

      currentVerse = {
        bookSlug: book.slug,
        chapterNumber: Number(chapterValue),
        verseNumber: Number(verseValue),
        parts: [openingText.trim()]
      };
      continue;
    }

    if (currentVerse) {
      currentVerse.parts.push(trimmedLine);
    }
  }

  flushCurrentVerse();

  /** @type {BookMeta[]} */
  const metadata = [];
  /** @type {Map<string, BookPayload>} */
  const payloadBySlug = new Map();

  for (const sourceBook of sourceBooks) {
    /** @type {Chapter[]} */
    const chapters = [];

    for (let chapterNumber = 1; chapterNumber <= sourceBook.chapterCount; chapterNumber += 1) {
      const verses = parsedVerses
        .filter(
          (verse) => verse.bookSlug === sourceBook.slug && verse.chapterNumber === chapterNumber
        )
        .sort((left, right) => left.verseNumber - right.verseNumber)
        .map((verse) => ({
          number: verse.verseNumber,
          text: verse.text
        }));

      if (verses.length === 0) {
        throw new Error(`NLT is missing chapter ${chapterNumber} in ${sourceBook.name}.`);
      }

      chapters.push({
        bookSlug: sourceBook.slug,
        chapterNumber,
        verses
      });
    }

    const payload = {
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

    metadata.push(payload.book);
    payloadBySlug.set(sourceBook.slug, payload);
    await writeFile(path.join(booksDir, `${sourceBook.slug}.json`), `${JSON.stringify(payload, null, 2)}\n`);
  }

  await writeFile(path.join(nltDir, "books.json"), `${JSON.stringify(metadata, null, 2)}\n`);

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
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    ndash: "–",
    mdash: "—",
    quot: '"',
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    hellip: "…"
  };

  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);?/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match)
    .replace(/&#39;/g, "'");
}

/**
 * @param {string} value
 */
function normalizeImportedCopy(value) {
  return value
    .replace(/[ \t]+/g, " ")
    .replace(/\s*([,;:.!?])/g, "$1")
    .replace(/([,;:.!?])(?=[^\s"')\]}\u201d\u2019])/g, "$1 ")
    .replace(/\s*([—–])\s*/g, " $1 ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} text
 */
function sanitizeBracketMarkup(text) {
  return text
    .replace(/\[fn\]/gi, "")
    .replace(/\[\[([\s\S]*?)\]\]/g, "$1")
    .replace(/\[(?![HG]\d+\])([^\[\]]+)\]/g, "$1");
}

/**
 * @param {string} text
 */
function sanitizeTaggedText(text) {
  return normalizeImportedCopy(
    sanitizeBracketMarkup(decodeHtmlEntities(text).replace(/<\/?em>/g, ""))
  );
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
 * @param {"web" | "kjv" | "nlt"} version
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
 * @param {"web" | "kjv" | "nlt"} version
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
        text: verse.text,
        ...(version === "kjv" && verse.tokens ? { tokens: verse.tokens } : {})
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

/**
 * @param {"web" | "kjv" | "nlt"} version
 * @param {TopicSourceEntry[]} topicsSource
 * @param {SourceBook[]} sourceBooks
 * @param {Map<string, BookPayload>} payloadBySlug
 */
async function buildTopicSearchIndex(version, topicsSource, sourceBooks, payloadBySlug) {
  await mkdir(searchDir, { recursive: true });

  const bookOrderBySlug = new Map(sourceBooks.map((book) => [book.slug, book.order]));

  /** @type {TopicSearchEntry[]} */
  const entries = topicsSource.map((topic) => ({
    id: topic.id,
    label: topic.label,
    aliases: topic.aliases,
    subtopics: topic.subtopics.map((subtopic) => ({
      id: subtopic.id,
      label: subtopic.label,
      verses: [...subtopic.references]
        .sort((left, right) => {
          const leftBookOrder = bookOrderBySlug.get(left.bookSlug) ?? Number.MAX_SAFE_INTEGER;
          const rightBookOrder = bookOrderBySlug.get(right.bookSlug) ?? Number.MAX_SAFE_INTEGER;

          if (leftBookOrder !== rightBookOrder) {
            return leftBookOrder - rightBookOrder;
          }

          if (left.chapterNumber !== right.chapterNumber) {
            return left.chapterNumber - right.chapterNumber;
          }

          return left.verseNumber - right.verseNumber;
        })
        .map((reference) => {
          const payload = payloadBySlug.get(reference.bookSlug);
          const chapter = payload?.chapters[reference.chapterNumber - 1];
          const verse = chapter?.verses.find((entry) => entry.number === reference.verseNumber);

          if (!payload || !chapter || !verse) {
            throw new Error(
              `Topic ${topic.id}/${subtopic.id} references missing ${reference.bookSlug} ${reference.chapterNumber}:${reference.verseNumber} in ${version}.`
            );
          }

          return {
            version,
            bookSlug: payload.book.slug,
            bookName: payload.book.name,
            chapterNumber: chapter.chapterNumber,
            verseNumber: verse.number,
            text: verse.text,
            ...(version === "kjv" && verse.tokens ? { tokens: verse.tokens } : {})
          };
        })
    }))
  }));

  await writeFile(
    path.join(searchDir, `topics-${version}.json`),
    `${JSON.stringify(entries, null, 2)}\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
