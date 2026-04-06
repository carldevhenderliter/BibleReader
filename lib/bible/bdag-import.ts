import type { BdagArticle, BdagSummary, StrongsEntry } from "@/lib/bible/types";

const BDAG_ENTRY_START_PATTERN =
  /^([\p{Script=Greek}][^\n⟦]{0,120}?)\s+⟦([^\n⟧]{1,80})⟧/gmu;

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

function cleanSummaryText(value: string) {
  return value
    .replace(/\([^)]{0,200}\)/g, " ")
    .replace(/\b(?:Hom|Hdt|Jos|Diod|Philo|Just|Polyb|Ael|Test[A-Za-z]+|PGM|LXX|Papias|Herm\.?|AcPl|IG|OGI|SEG|POxy|BGU|P[FILOT][A-Za-z0-9]+)/g, " ")
    .replace(/\b(?:Mt|Mk|Lk|Jn?|Ac|Ro|1 Cor|2 Cor|Gal|Eph|Phil|Col|1 Th|2 Th|1 Ti|2 Ti|Tit|Phlm|Hb|Js|1 Pt|2 Pt|1J|2J|3J|Jude|Rv)\b\.?/g, " ")
    .replace(/\b\d+(?::\d+)?(?:[a-z])?\b/g, " ")
    .replace(/[\p{Script=Greek}]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*([,;:.!?])\s*/g, "$1 ")
    .replace(/\s+/g, " ")
    .replace(/^[,;:.!?()\[\]\-–—\s]+/g, "")
    .replace(/[,;:.!?()\[\]\-–—\s]+$/g, "")
    .trim();
}

function sentenceCase(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function takeLeadSentence(value: string) {
  const normalized = value.replace(/\n+/g, " ").trim();
  const sentence = normalized.match(/^(.{20,260}?[.?!])(?:\s|$)/)?.[1] ?? normalized.slice(0, 220);

  return cleanSummaryText(sentence);
}

function uniquePhrases(phrases: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const phrase of phrases) {
    const normalized = phrase.toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    results.push(phrase);
  }

  return results;
}

function extractOutlinePhrases(outlineUsage: string) {
  return uniquePhrases(
    outlineUsage
      .split(/[;,]|\s{2,}/)
      .map((part) => cleanSummaryText(part))
      .filter((part) => {
        const wordCount = part.split(/\s+/).filter(Boolean).length;

        if (wordCount === 0 || wordCount > 9) {
          return false;
        }

        return !/^(?:of|and|or|the|a|an|to|in|on|with|for|from|by|cp|opp|misc)$/i.test(part);
      })
  );
}

function toNaturalList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0]!;
  }

  if (values.length === 2) {
    return `${values[0]} or ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, or ${values[values.length - 1]}`;
}

function buildPlainMeaning(articleEntry: string, strongsEntry: StrongsEntry) {
  const outlinePhrases = extractOutlinePhrases(strongsEntry.outlineUsage);
  const definitionLead = takeLeadSentence(strongsEntry.definition);
  const articleLead = takeLeadSentence(
    articleEntry.replace(/^\([^)]{0,250}\)\.?\s*/, "").replace(/^\d+\s*[a-z]?\s*/, "")
  );

  if (outlinePhrases.length >= 2) {
    return `Usually means ${toNaturalList(outlinePhrases.slice(0, 3))}.`;
  }

  if (definitionLead && definitionLead.split(/\s+/).length >= 3) {
    return `${sentenceCase(definitionLead)}.`;
  }

  return `${sentenceCase(articleLead)}.`;
}

function buildCommonUse(articleEntry: string, strongsEntry: StrongsEntry, plainMeaning: string) {
  const articleLead = takeLeadSentence(
    articleEntry
      .replace(/^\([^)]{0,250}\)\.?\s*/, "")
      .replace(/^\d+\s*[a-z]?\s*/, "")
      .replace(/^[a-zα-ω]\s+/i, "")
  );
  const outlinePhrases = extractOutlinePhrases(strongsEntry.outlineUsage);
  const fallbackUse = outlinePhrases.slice(3, 6);

  if (
    articleLead &&
    articleLead.length > 30 &&
    !plainMeaning.toLowerCase().includes(articleLead.toLowerCase().slice(0, 18))
  ) {
    return `${sentenceCase(articleLead)}.`;
  }

  if (fallbackUse.length > 0) {
    return `It can also refer to ${toNaturalList(fallbackUse)}.`;
  }

  return undefined;
}

function buildNtNote(articleEntry: string, strongsEntry: StrongsEntry) {
  const ntMatch =
    strongsEntry.outlineUsage.match(/In John,\s*([^.;]+)/i) ??
    articleEntry.match(/In John[’']?s? writings?,?\s*([^.;]+)/i) ??
    articleEntry.match(/New Testament[^.]{0,140}\./i);

  if (!ntMatch) {
    return undefined;
  }

  const extracted = cleanSummaryText(
    Array.isArray(ntMatch) ? ntMatch[1] ?? ntMatch[0] ?? "" : String(ntMatch)
  );

  if (!extracted) {
    return undefined;
  }

  if (/^denotes?\b/i.test(extracted)) {
    return `In the New Testament, it ${extracted}.`;
  }

  const normalizedExtracted = extracted.charAt(0).toLowerCase() + extracted.slice(1);

  return `In the New Testament, ${normalizedExtracted}.`;
}

function summarizeBdagArticle(articleEntry: string, strongsEntry: StrongsEntry): BdagSummary {
  const plainMeaning = buildPlainMeaning(articleEntry, strongsEntry);
  const commonUse = buildCommonUse(articleEntry, strongsEntry, plainMeaning);
  const ntNote = buildNtNote(articleEntry, strongsEntry);

  return {
    plainMeaning,
    commonUse,
    ntNote
  };
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
    const prefix = match[1]?.trim() ?? "";
    const transliteration = match[2]?.trim() ?? "";
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
      entry,
      summary: {
        plainMeaning: ""
      }
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

    const summarizedArticle: BdagArticle = {
      ...article,
      summary: summarizeBdagArticle(article.entry, entry)
    };

    entry.bdagArticles = [...(entry.bdagArticles ?? []), summarizedArticle];
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
