import type { BdagArticle, StrongsEntry } from "@/lib/bible/types";

const BDAG_ENTRY_START_PATTERN =
  /^(?<prefix>[\p{Script=Greek}][^\n⟦]{0,120}?)\s+⟦(?<transliteration>[^\n⟧]{1,80})⟧/gmu;

export type BdagMergeResult = {
  mergedLexicon: Record<string, StrongsEntry>;
  totalArticles: number;
  matchedArticles: number;
  ambiguousArticles: number;
  unmatchedArticles: number;
};

function extractHeadword(prefix: string) {
  return prefix.match(/^[\p{Script=Greek}]+/u)?.[0]?.trim() ?? "";
}

function collapseBdagParagraphs(lines: string[]) {
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length === 0) {
      return;
    }

    paragraphs.push(currentParagraph.join(" ").replace(/\s+/g, " ").trim());
    currentParagraph = [];
  };

  for (const line of lines) {
    if (!line) {
      flushParagraph();
      continue;
    }

    currentParagraph.push(line);
  }

  flushParagraph();

  return paragraphs.join("\n\n").trim();
}

function cleanBdagEntryText(rawEntry: string, headword: string) {
  const normalizedHeadword = normalizeBdagGreekHeadword(headword);
  const rawLines = rawEntry.replace(/\f/g, "\n").split("\n");

  if (rawLines.length > 0 && rawLines[0]?.includes("⟦")) {
    rawLines[0] = rawLines[0].replace(/^.*?⟧\s*/, "");
  }

  const normalizedLines = rawLines
    .map((line) => line.trim())
    .filter((line, index) => {
      if (line.length === 0) {
        return true;
      }

      if (line === "A Greek-English Lexicon of the New Testament") {
        return false;
      }

      if (/^\d+$/.test(line)) {
        return false;
      }

      const normalizedLine = normalizeBdagGreekHeadword(line);

      return !(
        normalizedLine.length > 0 &&
        !line.includes(" ") &&
        (
          normalizedLine === normalizedHeadword ||
          (normalizedLine.length >= 3 && normalizedHeadword.startsWith(normalizedLine))
        )
      );
    });

  return collapseBdagParagraphs(normalizedLines);
}

export function normalizeBdagGreekHeadword(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/gu, "σ")
    .replace(/[^\p{Script=Greek}]+/gu, "")
    .toLowerCase();
}

export function normalizeBdagTransliteration(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z]+/gi, "")
    .toLowerCase();
}

export function parseBdagPdfText(sourceText: string) {
  const matches = Array.from(sourceText.matchAll(BDAG_ENTRY_START_PATTERN));
  const articles: BdagArticle[] = [];

  for (const [index, match] of matches.entries()) {
    const prefix = match.groups?.prefix?.trim() ?? "";
    const transliteration = match.groups?.transliteration?.trim() ?? "";
    const headword = extractHeadword(prefix);

    if (!headword || !transliteration) {
      continue;
    }

    const startIndex = match.index ?? 0;
    const endIndex = matches[index + 1]?.index ?? sourceText.length;
    const rawEntry = sourceText.slice(startIndex, endIndex).trim();
    const entry = cleanBdagEntryText(rawEntry, headword);

    if (!entry) {
      continue;
    }

    articles.push({
      headword,
      transliteration,
      entry
    });
  }

  return articles;
}

export function mergeBdagIntoStrongsLexicon(
  lexicon: Record<string, StrongsEntry>,
  articles: BdagArticle[]
): BdagMergeResult {
  const mergedLexicon: Record<string, StrongsEntry> = Object.fromEntries(
    Object.entries(lexicon).map(([id, entry]) => [id, { ...entry }])
  );
  const greekLemmaIndex = new Map<string, string[]>();
  const greekTransliterationIndex = new Map<string, string[]>();
  let matchedArticles = 0;
  let ambiguousArticles = 0;
  let unmatchedArticles = 0;

  for (const entry of Object.values(mergedLexicon)) {
    if (entry.language !== "greek") {
      continue;
    }

    const normalizedLemma = normalizeBdagGreekHeadword(entry.lemma);
    const normalizedTransliteration = normalizeBdagTransliteration(entry.transliteration);

    if (normalizedLemma) {
      greekLemmaIndex.set(normalizedLemma, [
        ...(greekLemmaIndex.get(normalizedLemma) ?? []),
        entry.id
      ]);
    }

    if (normalizedTransliteration) {
      greekTransliterationIndex.set(normalizedTransliteration, [
        ...(greekTransliterationIndex.get(normalizedTransliteration) ?? []),
        entry.id
      ]);
    }
  }

  for (const article of articles) {
    const candidateIds = new Set<string>([
      ...(greekLemmaIndex.get(normalizeBdagGreekHeadword(article.headword)) ?? []),
      ...(greekTransliterationIndex.get(normalizeBdagTransliteration(article.transliteration)) ?? [])
    ]);

    if (candidateIds.size === 0) {
      unmatchedArticles += 1;
      continue;
    }

    if (candidateIds.size > 1) {
      ambiguousArticles += 1;
      continue;
    }

    const strongsNumber = Array.from(candidateIds)[0]!;
    const entry = mergedLexicon[strongsNumber];

    entry.bdagArticles = [...(entry.bdagArticles ?? []), article];
    matchedArticles += 1;
  }

  return {
    mergedLexicon,
    totalArticles: articles.length,
    matchedArticles,
    ambiguousArticles,
    unmatchedArticles
  };
}
