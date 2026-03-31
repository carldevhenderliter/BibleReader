import type { BookMeta, BookPayload, Chapter, Verse } from "@/lib/bible/types";

type SourceBook = BookMeta & {
  sourceKey: string;
};

type ParsedVerse = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
};

const NLT_BOOK_CODE_BY_SLUG: Record<string, string> = {
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

const HEADER_LINES = new Set(["The Holy Bible", "New Living Translation NLT"]);
const REFERENCE_PATTERN = /^(?:\f)?([1-3]?[A-Za-z]{2,6})\s+(\d+):(\d+)\s+(.*)$/;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeNltVerseText(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\f/g, " ")
      .replace(/LORD\]/g, "LORD")
      .replace(/\b([A-Za-z]+)-\s+([a-z][A-Za-z-]*)\b/g, "$1$2")
      .replace(/\s+([,;:.!?])/g, "$1")
  );
}

export function getNltBookCodeBySlug(bookSlug: string) {
  return NLT_BOOK_CODE_BY_SLUG[bookSlug] ?? null;
}

export function parseNltPdfText(text: string, sourceBooks: SourceBook[]): Map<string, BookPayload> {
  const bookByCode = new Map(
    sourceBooks.map((book) => {
      const code = getNltBookCodeBySlug(book.slug);

      if (!code) {
        throw new Error(`Missing NLT code mapping for ${book.slug}.`);
      }

      return [code, book] as const;
    })
  );

  /** @type {ParsedVerse[]} */
  const parsedVerses: ParsedVerse[] = [];
  let currentVerse:
    | {
        bookSlug: string;
        chapterNumber: number;
        verseNumber: number;
        parts: string[];
      }
    | null = null;

  const flushCurrentVerse = () => {
    if (!currentVerse) {
      return;
    }

    const textValue = normalizeNltVerseText(currentVerse.parts.join(" "));

    if (!textValue) {
      throw new Error(
        `Encountered an empty NLT verse at ${currentVerse.bookSlug} ${currentVerse.chapterNumber}:${currentVerse.verseNumber}.`
      );
    }

    parsedVerses.push({
      bookSlug: currentVerse.bookSlug,
      chapterNumber: currentVerse.chapterNumber,
      verseNumber: currentVerse.verseNumber,
      text: textValue
    });

    currentVerse = null;
  };

  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const trimmedLine = rawLine.replace(/\f/g, "").trim();

    if (!trimmedLine || HEADER_LINES.has(trimmedLine)) {
      continue;
    }

    const referenceMatch = rawLine.match(REFERENCE_PATTERN);

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

  const verseMap = new Map<string, ParsedVerse>();

  for (const verse of parsedVerses) {
    const key = `${verse.bookSlug}:${verse.chapterNumber}:${verse.verseNumber}`;

    if (verseMap.has(key)) {
      throw new Error(`Duplicate NLT verse reference ${key}.`);
    }

    verseMap.set(key, verse);
  }

  const payloadBySlug = new Map<string, BookPayload>();

  for (const sourceBook of sourceBooks) {
    const chapters: Chapter[] = [];

    for (let chapterNumber = 1; chapterNumber <= sourceBook.chapterCount; chapterNumber += 1) {
      const verses: Verse[] = Array.from(verseMap.values())
        .filter(
          (verse) => verse.bookSlug === sourceBook.slug && verse.chapterNumber === chapterNumber
        )
        .sort((left, right) => left.verseNumber - right.verseNumber)
        .map((verse) => ({
          number: verse.verseNumber,
          text: verse.text
        }));

      if (verses.length === 0) {
        throw new Error(`NLT is missing ${sourceBook.name} chapter ${chapterNumber}.`);
      }

      chapters.push({
        bookSlug: sourceBook.slug,
        chapterNumber,
        verses
      });
    }

    payloadBySlug.set(sourceBook.slug, {
      book: {
        slug: sourceBook.slug,
        name: sourceBook.name,
        abbreviation: sourceBook.abbreviation,
        testament: sourceBook.testament,
        chapterCount: sourceBook.chapterCount,
        order: sourceBook.order
      },
      chapters
    });
  }

  return payloadBySlug;
}
