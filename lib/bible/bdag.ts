import type { BdagArticle } from "@/lib/bible/types";

export type FormattedBdagArticle = {
  headwordLine: string;
  plainMeaning: string;
  commonUse?: string;
  ntNote?: string;
  keyTerms: string[];
  fullArticle: string;
};

function cleanPhrase(value: string) {
  return value
    .replace(/\([^)]{0,200}\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[,;:.()\[\]\-–—\s]+/g, "")
    .replace(/[,;:.()\[\]\-–—\s]+$/g, "")
    .trim();
}

function uniquePhrases(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const cleaned = cleanPhrase(value);
    const normalized = cleaned.toLowerCase();

    if (!cleaned || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(cleaned);
  }

  return result;
}

function extractKeyTerms(...sources: Array<string | undefined>) {
  const phrases = uniquePhrases(
    sources
      .filter((source): source is string => Boolean(source?.trim()))
      .flatMap((source) =>
        source
          .replace(/^Usually means\s+/i, "")
          .replace(/^It can also refer to\s+/i, "")
          .replace(/^In the New Testament,\s*/i, "")
          .replace(/\bor\b/gi, ",")
          .split(/[;,]|\.\s+/)
      )
      .flatMap((phrase) => phrase.split(/\s{2,}/))
      .map((phrase) => cleanPhrase(phrase))
      .filter((phrase) => {
        const wordCount = phrase.split(/\s+/).filter(Boolean).length;

        return wordCount > 0 && wordCount <= 6;
      })
  );

  return phrases.slice(0, 8);
}

export function formatBdagArticle(article: BdagArticle): FormattedBdagArticle {
  const summary = article.summary ?? { plainMeaning: article.entry };

  return {
    headwordLine: `${article.headword} (${article.transliteration})`,
    plainMeaning: summary.plainMeaning || article.entry,
    commonUse: summary.commonUse,
    ntNote: summary.ntNote,
    keyTerms: extractKeyTerms(summary.plainMeaning, summary.commonUse, summary.ntNote),
    fullArticle: article.entry
  };
}
