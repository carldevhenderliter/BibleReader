#!/usr/bin/env node

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const booksPath = path.join(repoRoot, "data", "source", "books.json");
const strongsLexiconPath = path.join(repoRoot, "data", "bible", "strongs", "lexicon.json");
const outputDir = path.join(repoRoot, "data", "bible", "mt");
const outputBooksDir = path.join(outputDir, "books");
const morphhbPath = process.env.MORPHHB_PACKAGE_PATH ?? "/tmp/morphhb/package/index.js";

const MORPHHB_BOOK_NAME_BY_SLUG = {
  genesis: "Genesis",
  exodus: "Exodus",
  leviticus: "Leviticus",
  numbers: "Numbers",
  deuteronomy: "Deuteronomy",
  joshua: "Joshua",
  judges: "Judges",
  ruth: "Ruth",
  "1-samuel": "I Samuel",
  "2-samuel": "II Samuel",
  "1-kings": "I Kings",
  "2-kings": "II Kings",
  "1-chronicles": "I Chronicles",
  "2-chronicles": "II Chronicles",
  ezra: "Ezra",
  nehemiah: "Nehemiah",
  esther: "Esther",
  job: "Job",
  psalms: "Psalms",
  proverbs: "Proverbs",
  ecclesiastes: "Ecclesiastes",
  "song-of-solomon": "Song of Solomon",
  isaiah: "Isaiah",
  jeremiah: "Jeremiah",
  lamentations: "Lamentations",
  ezekiel: "Ezekiel",
  daniel: "Daniel",
  hosea: "Hosea",
  joel: "Joel",
  amos: "Amos",
  obadiah: "Obadiah",
  jonah: "Jonah",
  micah: "Micah",
  nahum: "Nahum",
  habakkuk: "Habakkuk",
  zephaniah: "Zephaniah",
  haggai: "Haggai",
  zechariah: "Zechariah",
  malachi: "Malachi"
};

function normalizeSpace(value) {
  if (value == null) {
    return "";
  }

  return String(value).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function cleanHebrewSurface(value) {
  return normalizeSpace(value).replaceAll("/", "");
}

function extractHebrewStrongs(rawLemma) {
  const matches = normalizeSpace(rawLemma).match(/H(\d+)/g);

  if (!matches?.length) {
    return null;
  }

  const lastMatch = matches[matches.length - 1];
  const numericValue = Number.parseInt(lastMatch.slice(1), 10);

  return Number.isFinite(numericValue) ? `H${numericValue}` : null;
}

function getPrimaryMorphology(rawMorphology) {
  const segments = normalizeSpace(rawMorphology)
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return segments[segments.length - 1] ?? "";
}

function getHebrewShortGloss(entry) {
  const candidates = [entry?.definition, entry?.outlineUsage]
    .map((value) => normalizeSpace(value))
    .filter(Boolean);

  for (const candidate of candidates) {
    const fragment = candidate
      .split(/[;,/]/)[0]
      ?.replace(/\([^)]*\)/g, "")
      .replace(/\bto\b/gi, "")
      .replace(/\bthe\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (fragment) {
      return fragment;
    }
  }

  return "";
}

function getDecodedMorphology(rawMorphology, entry) {
  const morphology = getPrimaryMorphology(rawMorphology);

  if (!morphology) {
    return entry?.partOfSpeech ? normalizeSpace(entry.partOfSpeech) : undefined;
  }

  return entry?.partOfSpeech ? normalizeSpace(entry.partOfSpeech) : undefined;
}

function buildHebrewToken(word, strongsLexicon) {
  const [rawSurface, rawLemma, rawMorphology] = word;
  const surface = cleanHebrewSurface(rawSurface);
  const strongs = extractHebrewStrongs(rawLemma);
  const lexiconEntry = strongs ? strongsLexicon[strongs] ?? null : null;
  const gloss = getHebrewShortGloss(lexiconEntry);
  const morphology = getPrimaryMorphology(rawMorphology);
  const decodedMorphology = getDecodedMorphology(rawMorphology, lexiconEntry);

  return {
    surface,
    lemma: normalizeSpace(lexiconEntry?.lemma) || surface,
    ...(strongs ? { strongs } : {}),
    ...(morphology ? { morphology } : {}),
    ...(decodedMorphology ? { decodedMorphology } : {}),
    ...(normalizeSpace(lexiconEntry?.transliteration)
      ? { transliteration: normalizeSpace(lexiconEntry?.transliteration) }
      : {}),
    ...(gloss ? { gloss } : {})
  };
}

function buildVerse(words, strongsLexicon, verseNumber) {
  const hebrewTokens = words
    .map((word) => buildHebrewToken(word, strongsLexicon))
    .filter((token) => normalizeSpace(token.surface));

  return {
    number: verseNumber,
    text: hebrewTokens.map((token) => token.surface).join(" "),
    hebrewTokens
  };
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function main() {
  const [booksSource, strongsLexiconSource] = await Promise.all([
    readFile(booksPath, "utf8"),
    readFile(strongsLexiconPath, "utf8")
  ]);
  const sourceBooks = JSON.parse(booksSource);
  const strongsLexicon = JSON.parse(strongsLexiconSource);
  const morphhb = require(morphhbPath);
  const otBooks = sourceBooks.filter((book) => book.testament === "Old");

  await mkdir(outputBooksDir, { recursive: true });
  await writeJson(
    path.join(outputDir, "books.json"),
    otBooks.map(({ sourceKey, ...book }) => book)
  );

  for (const { sourceKey: _sourceKey, ...book } of otBooks) {
    const morphhbBookName = MORPHHB_BOOK_NAME_BY_SLUG[book.slug];
    const morphhbChapters = morphhb[morphhbBookName];

    if (!morphhbBookName || !Array.isArray(morphhbChapters)) {
      throw new Error(`Missing morphhb data for ${book.slug}.`);
    }

    const chapters = morphhbChapters.map((chapterVerses, chapterIndex) => ({
      bookSlug: book.slug,
      chapterNumber: chapterIndex + 1,
      verses: chapterVerses.map((words, verseIndex) =>
        buildVerse(Array.isArray(words) ? words : [], strongsLexicon, verseIndex + 1)
      )
    }));

    await writeJson(path.join(outputBooksDir, `${book.slug}.json`), {
      book,
      chapters
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
