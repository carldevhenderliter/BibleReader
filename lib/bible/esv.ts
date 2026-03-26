import { ESV_API_KEY_ENV_NAME } from "@/lib/bible/constants";
import type { BookMeta, Chapter, Verse } from "@/lib/bible/types";

type EsvPassageResponse = {
  passages?: string[];
};

const ESV_PASSAGE_TEXT_URL = "https://api.esv.org/v3/passage/text/";

export function isEsvEnabled(): boolean {
  return Boolean(process.env[ESV_API_KEY_ENV_NAME]?.trim());
}

export function parseEsvChapterText(text: string): Verse[] {
  const normalizedText = text.replace(/\r/g, "").trim();
  const matches = Array.from(normalizedText.matchAll(/\[(\d+)\]\s*/g));

  if (matches.length === 0) {
    return [];
  }

  return matches
    .map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = matches[index + 1]?.index ?? normalizedText.length;
      const number = Number(match[1]);
      const verseText = normalizedText
        .slice(start, end)
        .replace(/\n{2,}/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]{2,}/g, " ")
        .trim();

      return {
        number,
        text: verseText
      };
    })
    .filter((verse) => verse.text.length > 0);
}

export async function getEsvChapter(book: BookMeta, chapterNumber: number): Promise<Chapter> {
  const apiKey = process.env[ESV_API_KEY_ENV_NAME]?.trim();

  if (!apiKey) {
    throw new Error("ESV is not configured.");
  }

  const query = new URLSearchParams({
    q: `${book.name} ${chapterNumber}`,
    "include-passage-references": "false",
    "include-first-verse-numbers": "true",
    "include-verse-numbers": "true",
    "include-footnotes": "false",
    "include-footnote-body": "false",
    "include-headings": "false",
    "include-short-copyright": "false",
    "include-copyright": "false",
    "include-selahs": "false",
    "indent-paragraphs": "0",
    "indent-poetry": "false",
    "indent-poetry-lines": "0",
    "line-length": "0"
  });

  const response = await fetch(`${ESV_PASSAGE_TEXT_URL}?${query.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`
    },
    next: {
      revalidate: 60 * 60 * 24
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to load ESV ${book.name} ${chapterNumber}.`);
  }

  const payload = (await response.json()) as EsvPassageResponse;
  const passageText = payload.passages?.[0]?.trim();

  if (!passageText) {
    throw new Error(`ESV returned no text for ${book.name} ${chapterNumber}.`);
  }

  const verses = parseEsvChapterText(passageText);

  if (verses.length === 0) {
    throw new Error(`ESV text could not be parsed for ${book.name} ${chapterNumber}.`);
  }

  return {
    bookSlug: book.slug,
    chapterNumber,
    verses
  };
}
