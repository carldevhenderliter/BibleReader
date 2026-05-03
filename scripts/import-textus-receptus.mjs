import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const sourceDir = path.join(repoRoot, "data", "source", "textus-receptus", "parsed");
const sourceBooksPath = path.join(repoRoot, "data", "source", "books.json");
const strongsLexiconPath = path.join(repoRoot, "data", "bible", "strongs", "lexicon.json");
const esvBooksDir = path.join(repoRoot, "data", "bible", "versions", "esv", "books");
const trVersionDir = path.join(repoRoot, "data", "bible", "versions", "tr");
const trBooksDir = path.join(trVersionDir, "books");
const searchDir = path.join(repoRoot, "data", "bible", "search");

const FILE_BY_SLUG = {
  matthew: "MT.UTR",
  mark: "MR.UTR",
  luke: "LU.UTR",
  john: "JOH.UTR",
  acts: "AC.UTR",
  romans: "RO.UTR",
  "1-corinthians": "1CO.UTR",
  "2-corinthians": "2CO.UTR",
  galatians: "GA.UTR",
  ephesians: "EPH.UTR",
  philippians: "PHP.UTR",
  colossians: "COL.UTR",
  "1-thessalonians": "1TH.UTR",
  "2-thessalonians": "2TH.UTR",
  "1-timothy": "1TI.UTR",
  "2-timothy": "2TI.UTR",
  titus: "TIT.UTR",
  philemon: "PHM.UTR",
  hebrews: "HEB.UTR",
  james: "JAS.UTR",
  "1-peter": "1PE.UTR",
  "2-peter": "2PE.UTR",
  "1-john": "1JO.UTR",
  "2-john": "2JO.UTR",
  "3-john": "3JO.UTR",
  jude: "JUDE.UTR",
  revelation: "RE.UTR"
};

const GREEK_CHAR_BY_ASCII = {
  a: "α",
  b: "β",
  g: "γ",
  d: "δ",
  e: "ε",
  z: "ζ",
  h: "η",
  q: "θ",
  i: "ι",
  k: "κ",
  l: "λ",
  m: "μ",
  n: "ν",
  x: "ξ",
  o: "ο",
  p: "π",
  r: "ρ",
  s: "σ",
  t: "τ",
  u: "υ",
  f: "φ",
  c: "χ",
  y: "ψ",
  w: "ω",
  v: "ς"
};

const TOKEN_PATTERN = /([A-Za-z]+)\s+(\d+)(?:\s+\d+)?\s+\{([^}]+)\}/g;

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function transliteratedGreekToUnicode(value) {
  const ascii = value.trim().toLowerCase();
  let result = "";

  for (let index = 0; index < ascii.length; index += 1) {
    const char = ascii[index];

    if (char === "s" && index === ascii.length - 1) {
      result += "ς";
      continue;
    }

    result += GREEK_CHAR_BY_ASCII[char] ?? char;
  }

  return result;
}

function getStrongsGloss(entry) {
  return entry?.outlineUsage?.trim() || entry?.definition?.trim() || "";
}

function buildEsvTranslationMap(esvBookPayload) {
  return new Map(
    esvBookPayload.chapters.map((chapter) => [
      chapter.chapterNumber,
      new Map(chapter.verses.map((verse) => [verse.number, verse.text]))
    ])
  );
}

function parseVerseBodies(sourceText) {
  const lines = sourceText.split(/\r?\n/);
  const verses = [];
  let currentReference = null;
  let currentBody = [];

  const flushCurrent = () => {
    if (!currentReference) {
      return;
    }

    verses.push({
      chapterNumber: currentReference.chapterNumber,
      verseNumber: currentReference.verseNumber,
      body: normalizeWhitespace(currentBody.join(" "))
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const referenceMatch = line.match(/^(\d+):(\d+)\s+(.+)$/);

    if (referenceMatch) {
      flushCurrent();
      currentReference = {
        chapterNumber: Number(referenceMatch[1]),
        verseNumber: Number(referenceMatch[2])
      };
      currentBody = [referenceMatch[3]];
      continue;
    }

    if (currentReference && line.trim()) {
      currentBody.push(line.trim());
    }
  }

  flushCurrent();
  return verses;
}

function parseGreekTokens(body, strongsLexicon) {
  const greekTokens = [];

  for (const match of body.matchAll(TOKEN_PATTERN)) {
    const transliteratedSurface = match[1];
    const strongsNumber = `G${Number(match[2])}`;
    const morphology = match[3];
    const strongsEntry = strongsLexicon[strongsNumber] ?? null;

    greekTokens.push({
      surface: transliteratedGreekToUnicode(transliteratedSurface),
      lemma: strongsEntry?.lemma ?? transliteratedGreekToUnicode(transliteratedSurface),
      strongs: strongsNumber,
      morphology,
      transliteration: strongsEntry?.transliteration || transliteratedSurface.toLowerCase(),
      gloss: getStrongsGloss(strongsEntry),
      entryKey: strongsNumber
    });
  }

  return greekTokens;
}

function buildVerseText(greekTokens) {
  return greekTokens.map((token) => token.surface).join(" ").trim();
}

function buildSearchEntries(book, chapters) {
  return chapters.flatMap((chapter) =>
    chapter.verses.map((verse) => ({
      version: "tr",
      bookSlug: book.slug,
      bookName: book.name,
      chapterNumber: chapter.chapterNumber,
      verseNumber: verse.number,
      text: verse.text,
      translationText: verse.translationText,
      greekTokens: verse.greekTokens,
      greekEntryKeys: Array.from(
        new Set(
          (verse.greekTokens ?? [])
            .map((token) => token.entryKey ?? token.strongs ?? token.lemma)
            .filter(Boolean)
        )
      )
    }))
  );
}

async function main() {
  const [sourceBooks, strongsLexicon] = await Promise.all([
    readFile(sourceBooksPath, "utf8").then((value) => JSON.parse(value)),
    readFile(strongsLexiconPath, "utf8").then((value) => JSON.parse(value))
  ]);
  const trBooks = sourceBooks
    .filter((book) => book.testament === "New" && FILE_BY_SLUG[book.slug])
    .map(({ sourceKey, ...book }) => book);

  await rm(trVersionDir, { recursive: true, force: true });
  await mkdir(trBooksDir, { recursive: true });

  const searchEntries = [];

  for (const book of trBooks) {
    const [sourceText, esvBookPayload] = await Promise.all([
      readFile(path.join(sourceDir, FILE_BY_SLUG[book.slug]), "utf8"),
      readFile(path.join(esvBooksDir, `${book.slug}.json`), "utf8").then((value) => JSON.parse(value))
    ]);
    const esvTranslationMap = buildEsvTranslationMap(esvBookPayload);
    const parsedVerses = parseVerseBodies(sourceText);
    const chaptersByNumber = new Map();

    for (const parsedVerse of parsedVerses) {
      const greekTokens = parseGreekTokens(parsedVerse.body, strongsLexicon);
      const chapter = chaptersByNumber.get(parsedVerse.chapterNumber) ?? {
        bookSlug: book.slug,
        chapterNumber: parsedVerse.chapterNumber,
        verses: []
      };
      const translationText =
        esvTranslationMap.get(parsedVerse.chapterNumber)?.get(parsedVerse.verseNumber) ?? "";

      chapter.verses.push({
        number: parsedVerse.verseNumber,
        text: buildVerseText(greekTokens),
        translationText,
        greekTokens
      });
      chaptersByNumber.set(parsedVerse.chapterNumber, chapter);
    }

    const chapters = [...chaptersByNumber.values()].sort(
      (left, right) => left.chapterNumber - right.chapterNumber
    );
    const bookPayload = {
      book,
      chapters
    };

    searchEntries.push(...buildSearchEntries(book, chapters));
    await writeFile(
      path.join(trBooksDir, `${book.slug}.json`),
      `${JSON.stringify(bookPayload)}\n`
    );
  }

  await writeFile(path.join(trVersionDir, "books.json"), `${JSON.stringify(trBooks)}\n`);
  await writeFile(path.join(searchDir, "tr.json"), `${JSON.stringify(searchEntries)}\n`);
}

await main();
