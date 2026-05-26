import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  getBookBySlug,
  getBooks,
  getChapter,
  getChronologicalNewTestamentBooks,
  getChronologicalOldTestamentBooks
} from "@/lib/bible/data";

const SBLGNT_FILE_BY_SLUG = {
  matthew: "61-Mt-morphgnt.txt",
  mark: "62-Mk-morphgnt.txt",
  luke: "63-Lk-morphgnt.txt",
  john: "64-Jn-morphgnt.txt",
  acts: "65-Ac-morphgnt.txt",
  romans: "66-Ro-morphgnt.txt",
  "1-corinthians": "67-1Co-morphgnt.txt",
  "2-corinthians": "68-2Co-morphgnt.txt",
  galatians: "69-Ga-morphgnt.txt",
  ephesians: "70-Eph-morphgnt.txt",
  philippians: "71-Php-morphgnt.txt",
  colossians: "72-Col-morphgnt.txt",
  "1-thessalonians": "73-1Th-morphgnt.txt",
  "2-thessalonians": "74-2Th-morphgnt.txt",
  "1-timothy": "75-1Ti-morphgnt.txt",
  "2-timothy": "76-2Ti-morphgnt.txt",
  titus: "77-Tit-morphgnt.txt",
  philemon: "78-Phm-morphgnt.txt",
  hebrews: "79-Heb-morphgnt.txt",
  james: "80-Jas-morphgnt.txt",
  "1-peter": "81-1Pe-morphgnt.txt",
  "2-peter": "82-2Pe-morphgnt.txt",
  "1-john": "83-1Jn-morphgnt.txt",
  "2-john": "84-2Jn-morphgnt.txt",
  "3-john": "85-3Jn-morphgnt.txt",
  jude: "86-Jud-morphgnt.txt",
  revelation: "87-Re-morphgnt.txt"
} as const;

const SBLGNT_CRITICAL_MARKS_PATTERN = /[⸀-⸟]/gu;
const SBLGNT_SURFACE_PUNCTUATION_PATTERN = /([,.;·;.!?]+)$/u;

type GreekInterlinearPayload = {
  chapters: Array<{
    chapterNumber: number;
    verses: Array<{
      number: number;
      tokens?: Array<{ surface?: string }>;
    }>;
  }>;
};

function cleanSblgntField(value: string) {
  return value.normalize("NFC").replace(SBLGNT_CRITICAL_MARKS_PATTERN, "").replace(/[()]/g, "").trim();
}

function getSblgntSurface(value: string) {
  const cleaned = cleanSblgntField(value);
  const match = cleaned.match(SBLGNT_SURFACE_PUNCTUATION_PATTERN);

  return match ? cleaned.slice(0, -match[1].length).trimEnd() : cleaned;
}

async function readSblgntSourceSurfaces(fileName: string) {
  const file = await readFile(path.join(process.cwd(), "data", "source", "sblgnt", fileName), "utf8");
  const surfacesByReference = new Map<string, string[]>();

  for (const rawLine of file.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const parts = line.split(/\s+/);
    const reference = parts[0] ?? "";

    if (parts.length < 7 || !/^\d{6}$/.test(reference)) {
      continue;
    }

    const referenceKey = `${Number(reference.slice(2, 4))}:${Number(reference.slice(4, 6))}`;
    const surface = getSblgntSurface(parts[3] ?? "");

    if (!surface) {
      continue;
    }

    surfacesByReference.set(referenceKey, [...(surfacesByReference.get(referenceKey) ?? []), surface]);
  }

  return surfacesByReference;
}

describe("bible data", () => {
  it("loads bundled books for WEB, KJV, ESV, TR, and Hebrew", async () => {
    const [webBooks, kjvBooks, esvBooks, trBooks, mtBooks] = await Promise.all([
      getBooks("web"),
      getBooks("kjv"),
      getBooks("esv"),
      getBooks("tr"),
      getBooks("mt")
    ]);

    expect(webBooks).toHaveLength(67);
    expect(kjvBooks).toHaveLength(67);
    expect(esvBooks).toHaveLength(67);
    expect(webBooks[0]?.slug).toBe("genesis");
    expect(webBooks[0]?.compositionDate).toBeUndefined();
    expect(webBooks.find((book) => book.slug === "matthew")?.compositionDate).toBe("c. 70–90 AD");
    expect(kjvBooks.find((book) => book.slug === "revelation")?.compositionDate).toBe("c. 95–96 AD");
    expect(kjvBooks.at(-1)?.slug).toBe("gospel-harmony");
    expect(esvBooks[0]?.slug).toBe("genesis");
    expect(esvBooks.at(-1)?.name).toBe("Gospel Harmony");
    expect(trBooks[0]?.slug).toBe("matthew");
    expect(trBooks.find((book) => book.slug === "matthew")?.compositionDate).toBe("c. 70–90 AD");
    expect(trBooks.at(-1)?.slug).toBe("gospel-harmony");
    expect(mtBooks[0]?.slug).toBe("genesis");
    expect(mtBooks[38]?.slug).toBe("malachi");
    expect(mtBooks.at(-1)?.slug).toBe("gospel-harmony");
  });

  it("loads Genesis 1 from KJV", async () => {
    const [book, chapter] = await Promise.all([
      getBookBySlug("genesis", "kjv"),
      getChapter("genesis", 1, "kjv")
    ]);

    expect(book?.name).toBe("Genesis");
    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.text).toContain("In the beginning God created");
    expect(chapter?.verses[0]?.tokens?.[0]?.strongsNumbers).toContain("H7225");
  });

  it("removes KJV footnote markers and unwraps readable bracketed headings", async () => {
    const [corinthians, psalms] = await Promise.all([
      getChapter("1-corinthians", 16, "kjv"),
      getChapter("psalms", 3, "kjv")
    ]);

    expect(corinthians?.verses.at(-1)?.text).toBe(
      "My love be with you all in Christ Jesus. Amen."
    );
    expect(corinthians?.verses.at(-1)?.tokens?.some((token) => /\[fn\]/i.test(token.text))).toBe(
      false
    );
    expect(psalms?.verses[0]?.text.startsWith("A Psalm of David, when he fled from Absalom his son.")).toBe(true);
    expect(psalms?.verses[0]?.text.includes("[[")).toBe(false);
    expect(psalms?.verses[0]?.text.includes("]]")).toBe(false);
  });

  it("loads Revelation 22 from WEB", async () => {
    const chapter = await getChapter("revelation", 22, "web");

    expect(chapter?.chapterNumber).toBe(22);
    expect(chapter?.verses.length).toBeGreaterThan(0);
  });

  it("loads Genesis 1 from bundled ESV", async () => {
    const chapter = await getChapter("genesis", 1, "esv");

    expect(chapter?.chapterNumber).toBe(1);
    expect(chapter?.verses[0]?.text).toContain("In the beginning, God created the heavens");
    expect(chapter?.verses[0]?.tokens).toBeUndefined();
  });

  it("loads Matthew 1 from bundled Textus Receptus and omits Old Testament books", async () => {
    const [matthew, genesis] = await Promise.all([
      getChapter("matthew", 1, "tr"),
      getChapter("genesis", 1, "tr")
    ]);

    expect(matthew?.chapterNumber).toBe(1);
    expect(matthew?.verses[0]?.text).toContain("βιβλος γενεσεως ιησου χριστου");
    expect(matthew?.verses[0]?.translationText).toContain("The book of the genealogy of Jesus Christ");
    expect(matthew?.verses[0]?.greekTokens?.[0]?.strongs).toBe("G976");
    expect(genesis).toBeNull();
  });

  it("keeps SBLGNT proper-name tokens with critical marks in Matthew 1:5", async () => {
    const chapter = await getChapter("matthew", 1, "greek");
    const verse = chapter?.verses.find((entry) => entry.number === 5);
    const tokens = verse?.greekTokens ?? [];

    expect(tokens.filter((token) => token.surface === "Βόες")).toEqual([
      expect.objectContaining({ lemma: "Βόες", strongs: "G1003", morphology: "N-ASM" }),
      expect.objectContaining({ lemma: "Βόες", strongs: "G1003", morphology: "N-NSM" })
    ]);
    expect(tokens.filter((token) => token.surface === "Ἰωβὴδ")).toEqual([
      expect.objectContaining({ lemma: "Ἰωβήδ", strongs: "G5601", morphology: "N-ASM" }),
      expect.objectContaining({ lemma: "Ἰωβήδ", strongs: "G5601", morphology: "N-NSM" })
    ]);
  });

  it("keeps every SBLGNT source word in the generated Greek interlinear data", async () => {
    const mismatches: string[] = [];

    for (const [bookSlug, sourceFileName] of Object.entries(SBLGNT_FILE_BY_SLUG)) {
      const [sourceSurfacesByReference, interlinearFile] = await Promise.all([
        readSblgntSourceSurfaces(sourceFileName),
        readFile(
          path.join(process.cwd(), "data", "bible", "interlinear", "esv", "base", `${bookSlug}.json`),
          "utf8"
        )
      ]);
      const interlinearPayload = JSON.parse(interlinearFile) as GreekInterlinearPayload;

      for (const chapter of interlinearPayload.chapters) {
        for (const verse of chapter.verses) {
          const referenceKey = `${chapter.chapterNumber}:${verse.number}`;
          const sourceSurfaces = sourceSurfacesByReference.get(referenceKey) ?? [];
          const generatedSurfaces = (verse.tokens ?? []).map((token) => token.surface ?? "");

          if (
            sourceSurfaces.length !== generatedSurfaces.length ||
            sourceSurfaces.some((surface, index) => surface !== generatedSurfaces[index])
          ) {
            mismatches.push(
              `${bookSlug} ${referenceKey}: source ${sourceSurfaces.length}, generated ${generatedSurfaces.length}`
            );
          }
        }
      }
    }

    expect(mismatches).toEqual([]);
  });

  it("loads Genesis 1 from bundled Hebrew and omits New Testament books", async () => {
    const [genesis, matthew] = await Promise.all([
      getChapter("genesis", 1, "mt"),
      getChapter("matthew", 1, "mt")
    ]);

    expect(genesis?.chapterNumber).toBe(1);
    expect(genesis?.verses[0]?.text).toContain("בראשית");
    expect(genesis?.verses[0]?.hebrewTokens?.[0]).toMatchObject({
      surface: "בראשית",
      strongs: "H7225"
    });
    expect(matthew).toBeNull();
  });

  it("returns New Testament books in the configured chronological order", async () => {
    const books = await getBooks("web");
    const chronologicalBooks = getChronologicalNewTestamentBooks(books);

    expect(chronologicalBooks).toHaveLength(28);
    expect(chronologicalBooks.slice(0, 7).map((book) => book.slug)).toEqual([
      "james",
      "galatians",
      "1-thessalonians",
      "2-thessalonians",
      "1-corinthians",
      "2-corinthians",
      "romans"
    ]);
    expect(chronologicalBooks.slice(-6).map((book) => book.slug)).toEqual([
      "john",
      "1-john",
      "2-john",
      "3-john",
      "revelation",
      "gospel-harmony"
    ]);
  });

  it("returns Old Testament books in the configured chronological order", async () => {
    const books = await getBooks("web");
    const chronologicalBooks = getChronologicalOldTestamentBooks(books);

    expect(chronologicalBooks).toHaveLength(39);
    expect(chronologicalBooks.slice(0, 7).map((book) => book.slug)).toEqual([
      "genesis",
      "job",
      "exodus",
      "leviticus",
      "numbers",
      "deuteronomy",
      "joshua"
    ]);
    expect(chronologicalBooks.slice(-5).map((book) => book.slug)).toEqual([
      "ezra",
      "nehemiah",
      "haggai",
      "zechariah",
      "malachi"
    ]);
  });
});
