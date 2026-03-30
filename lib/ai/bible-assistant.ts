"use client";

import { getCrossReferenceEntry } from "@/lib/bible/cross-references";
import { searchBible } from "@/lib/bible/search";
import type {
  BibleSearchResult,
  Bookmark,
  BookMeta,
  BundledBibleVersion,
  Chapter,
  Highlight,
  LocalBibleAiSource,
  NotebookDocument,
  SearchMatchMode,
  StudySet,
  Verse
} from "@/lib/bible/types";
import { getChapterHref } from "@/lib/bible/utils";
import { formatPassageReference } from "@/lib/study-workspace";

type CurrentPassage = {
  bookSlug: string;
  chapterNumber: number;
  view: "chapter" | "book";
};

type BibleAiContextInput = {
  query: string;
  version: BundledBibleVersion;
  currentPassage: CurrentPassage | null;
  currentChapter: Chapter | null;
  activeStudyVerseNumber: number | null;
  notebook: NotebookDocument | null;
  studySets: StudySet[];
  highlights: Highlight[];
  bookmarks: Bookmark[];
};

type RankedSource = {
  source: LocalBibleAiSource;
  score: number;
};

const MAX_RETRIEVED_SOURCES = 5;
const MAX_KEYWORD_SEARCHES = 4;
const MAX_NOTEBOOK_BLOCKS = 4;
const MAX_STUDY_SETS = 2;
const MAX_STUDY_SET_ITEMS = 3;
const SECONDARY_CONTEXT_WINDOW = 1;
const MAX_SECONDARY_CONTEXT_VERSES = 2;
const MAX_SECONDARY_CONTEXT_CHARACTERS = 360;
const MATCH_MODE: SearchMatchMode = "partial";
const QUERY_STOP_WORDS = new Set([
  "about",
  "after",
  "and",
  "are",
  "does",
  "from",
  "have",
  "into",
  "that",
  "the",
  "them",
  "they",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would"
]);
const INSUFFICIENT_CONTEXT_COPY =
  "The available local Bible context is limited for this question. Answer only if the primary sources support it clearly.";
let referenceBookVariantsPromise: Promise<string[]> | null = null;

function normalizeQueryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHighlightedVerseHref(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  version: BundledBibleVersion
) {
  const href = getChapterHref(bookSlug, chapterNumber, version);
  const [pathname, searchValue] = href.split("?");
  const searchParams = new URLSearchParams(searchValue ?? "");
  searchParams.set("highlight", String(verseNumber));
  const serialized = searchParams.toString();

  return serialized ? `${pathname}?${serialized}` : pathname;
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}…`;
}

function getNotebookContext(notebook: NotebookDocument | null) {
  if (!notebook) {
    return "";
  }

  const parts = [
    notebook.title.trim() ? `Title: ${notebook.title.trim()}` : "",
    notebook.content.trim() ? `Note: ${notebook.content.trim()}` : ""
  ];
  const references = notebook.references
    .slice(0, MAX_NOTEBOOK_BLOCKS)
    .map((reference) => formatPassageReference(reference))
    .join(", ");

  if (references) {
    parts.push(`References: ${references}`);
  }

  return parts.filter(Boolean).join("\n");
}

function getStudySetContext(studySets: StudySet[]) {
  return studySets
    .slice(0, MAX_STUDY_SETS)
    .map((studySet) => {
      const items = studySet.items
        .slice(0, MAX_STUDY_SET_ITEMS)
        .map((reference) => formatPassageReference(reference))
        .join(", ");

      return items ? `${studySet.name}: ${items}` : studySet.name;
    })
    .join("\n");
}

function getAnnotationContext(highlights: Highlight[], bookmarks: Bookmark[]) {
  const lines: string[] = [];

  if (highlights.length > 0) {
    lines.push(
      `Highlights: ${highlights
        .map((highlight) =>
          highlight.label.trim()
            ? `${highlight.verseNumber} (${highlight.color}, ${highlight.label.trim()})`
            : `${highlight.verseNumber} (${highlight.color})`
        )
        .join(", ")}`
    );
  }

  if (bookmarks.length > 0) {
    lines.push(
      `Bookmarks: ${bookmarks
        .map((bookmark) =>
          bookmark.verseNumber != null
            ? bookmark.label.trim()
              ? `${bookmark.verseNumber} (${bookmark.label.trim()})`
              : String(bookmark.verseNumber)
            : bookmark.label.trim()
              ? `chapter (${bookmark.label.trim()})`
              : "chapter"
        )
        .join(", ")}`
    );
  }

  return lines.join("\n");
}

function getQueryTerms(query: string) {
  const normalized = normalizeQueryValue(query);

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((term) => term.trim())
        .filter((term) => term.length > 2 && !QUERY_STOP_WORDS.has(term))
    )
  ).slice(0, 6);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadReferenceBookVariants() {
  if (!referenceBookVariantsPromise) {
    referenceBookVariantsPromise = import("@/data/bible/versions/web/books.json").then(({ default: books }) =>
      Array.from(
        new Set(
          (books as BookMeta[])
            .flatMap((book) => [book.name, book.abbreviation, book.slug.replace(/-/g, " ")])
            .map((value) => value.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => right.length - left.length)
    );
  }

  return referenceBookVariantsPromise;
}

async function getReferenceQueries(query: string) {
  const bookVariants = await loadReferenceBookVariants();
  const matches = new Set<string>();

  bookVariants.forEach((bookVariant) => {
    const pattern = new RegExp(`\\b${escapeRegExp(bookVariant)}\\s+\\d+(?::\\d+(?:-\\d+)?)?\\b`, "gi");

    for (const match of query.matchAll(pattern)) {
      const value = match[0]?.trim();

      if (value) {
        matches.add(value);
      }
    }
  });

  return Array.from(matches);
}

function getSourceFromVerseResult(result: {
  id: string;
  label: string;
  href: string;
  preview: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
}): LocalBibleAiSource {
  return {
    id: result.id,
    label: result.label,
    href: result.href,
    preview: result.preview,
    bookSlug: result.bookSlug,
    chapterNumber: result.chapterNumber,
    verseNumber: result.verseNumber
  };
}

function getTermOverlapScore(text: string, queryTerms: string[]) {
  const normalizedText = normalizeQueryValue(text);
  let score = 0;

  queryTerms.forEach((term) => {
    if (normalizedText.includes(term)) {
      score += 12;
    }
  });

  return score;
}

function countTermOverlaps(text: string, queryTerms: string[]) {
  const normalizedText = normalizeQueryValue(text);

  return queryTerms.reduce((count, term) => {
    return normalizedText.includes(term) ? count + 1 : count;
  }, 0);
}

function getCurrentPassageRelevanceBoost(
  source: LocalBibleAiSource,
  currentPassage: CurrentPassage | null,
  activeStudyVerseNumber: number | null
) {
  if (
    !currentPassage ||
    currentPassage.bookSlug !== source.bookSlug ||
    currentPassage.chapterNumber !== source.chapterNumber
  ) {
    return 0;
  }

  if (activeStudyVerseNumber != null && source.verseNumber != null) {
    const distance = Math.abs(source.verseNumber - activeStudyVerseNumber);
    return Math.max(0, 4 - distance);
  }

  return 1;
}

function addRankedSource(
  candidates: Map<string, RankedSource>,
  source: LocalBibleAiSource,
  score: number
) {
  if (score <= 0) {
    return;
  }

  const existing = candidates.get(source.id);

  if (!existing || score > existing.score) {
    candidates.set(source.id, {
      source,
      score
    });
  }
}

function getVerseResultSources(result: Extract<BibleSearchResult, { type: "verse" | "range" | "topic" }>) {
  if (result.type === "verse") {
    return [getSourceFromVerseResult(result)];
  }

  if (result.type === "range") {
    return result.verses.map((verse) => ({
      id: verse.id,
      label: verse.label,
      href: verse.href,
      preview: verse.preview,
      bookSlug: result.bookSlug,
      chapterNumber: result.chapterNumber,
      verseNumber: verse.verseNumber
    }));
  }

  return result.subtopics.flatMap((subtopic) =>
    subtopic.verses.map((verse) => getSourceFromVerseResult(verse))
  );
}

function getRankedSearchSources(
  results: BibleSearchResult[],
  query: string,
  queryTerms: string[],
  currentPassage: CurrentPassage | null,
  activeStudyVerseNumber: number | null
) {
  const normalizedQuery = normalizeQueryValue(query);
  const candidates = new Map<string, RankedSource>();

  results.forEach((result) => {
    if (result.type !== "verse" && result.type !== "range" && result.type !== "topic") {
      return;
    }

    const sources = getVerseResultSources(result);

    sources.forEach((source) => {
      const sourceText = `${source.label} ${source.preview}`;
      const overlapCount = countTermOverlaps(sourceText, queryTerms);
      let score = getTermOverlapScore(sourceText, queryTerms) + overlapCount * 6;

      if (normalizedQuery.includes(normalizeQueryValue(source.label))) {
        score += 55;
      }

      if (
        source.preview.length > 0 &&
        normalizeQueryValue(source.preview).includes(normalizedQuery) &&
        normalizedQuery.length > 3
      ) {
        score += 30;
      }

      score += getCurrentPassageRelevanceBoost(source, currentPassage, activeStudyVerseNumber);

      if (
        currentPassage?.bookSlug === source.bookSlug &&
        currentPassage.chapterNumber === source.chapterNumber &&
        overlapCount > 0
      ) {
        score += 24;
      }

      if (result.type === "topic") {
        score += overlapCount > 0 ? 12 : 6;
      } else if (result.type === "verse") {
        score += 8;
      } else if (result.type === "range") {
        score += 4;
      }

      addRankedSource(candidates, source, score);
    });
  });

  return candidates;
}

async function getRetrievedSources(
  query: string,
  version: BundledBibleVersion,
  currentPassage: CurrentPassage | null,
  activeStudyVerseNumber: number | null
) {
  const queryTerms = getQueryTerms(query);
  const referenceQueries = await getReferenceQueries(query);
  const searchQueries = Array.from(
    new Set([query, ...referenceQueries, ...queryTerms.slice(0, MAX_KEYWORD_SEARCHES)])
  ).filter(Boolean);
  const searchResults = await Promise.all(
    searchQueries.map((searchQuery) => searchBible(searchQuery, version, MATCH_MODE))
  );
  const rankedCandidates = new Map<string, RankedSource>();

  searchResults.forEach((results, index) => {
    const searchQuery = searchQueries[index] ?? query;
    const ranked = getRankedSearchSources(
      results,
      searchQuery,
      queryTerms,
      currentPassage,
      activeStudyVerseNumber
    );

    ranked.forEach((entry, id) => {
      const scoreBoost = searchQuery === query ? 24 : Math.max(4, 16 - index * 2);
      addRankedSource(rankedCandidates, entry.source, entry.score + scoreBoost);
      if (!rankedCandidates.has(id)) {
        rankedCandidates.set(id, entry);
      }
    });
  });

  if (currentPassage && activeStudyVerseNumber != null) {
    const crossReferences = await getCrossReferenceEntry(
      version,
      currentPassage.bookSlug,
      currentPassage.chapterNumber,
      activeStudyVerseNumber
    );

    crossReferences?.groups.forEach((group) => {
      group.references.forEach((reference) => {
        const source: LocalBibleAiSource = {
          id: `cross-ref:${group.id}:${reference.id}`,
          label: formatPassageReference(reference),
          href: buildHighlightedVerseHref(
            reference.bookSlug,
            reference.chapterNumber,
            reference.verseNumber ?? 1,
            reference.version
          ),
          preview: reference.text,
          bookSlug: reference.bookSlug,
          chapterNumber: reference.chapterNumber,
          verseNumber: reference.verseNumber
        };
        const score = getTermOverlapScore(`${source.label} ${source.preview}`, queryTerms);

        if (score > 0) {
          addRankedSource(rankedCandidates, source, score + 4);
        }
      });
    });
  }

  return Array.from(rankedCandidates.values())
    .sort((left, right) => right.score - left.score || left.source.label.localeCompare(right.source.label))
    .slice(0, MAX_RETRIEVED_SOURCES)
    .map((entry) => entry.source);
}

function getSecondaryPassageVerses(
  chapter: Chapter | null,
  queryTerms: string[],
  activeStudyVerseNumber: number | null
) {
  if (!chapter) {
    return [];
  }

  if (activeStudyVerseNumber != null) {
    return chapter.verses
      .filter(
      (verse) =>
        verse.number >= activeStudyVerseNumber - SECONDARY_CONTEXT_WINDOW &&
        verse.number <= activeStudyVerseNumber + SECONDARY_CONTEXT_WINDOW
      )
      .slice(0, MAX_SECONDARY_CONTEXT_VERSES);
  }

  const rankedVerses = [...chapter.verses]
    .map((verse) => ({
      verse,
      score: getTermOverlapScore(verse.text, queryTerms)
    }))
    .sort((left, right) => right.score - left.score || left.verse.number - right.verse.number);

  const matchingVerses = rankedVerses.filter((entry) => entry.score > 0).slice(0, MAX_SECONDARY_CONTEXT_VERSES);

  if (matchingVerses.length > 0) {
    return matchingVerses
      .map((entry) => entry.verse)
      .sort((left, right) => left.number - right.number);
  }

  return chapter.verses.slice(0, Math.min(MAX_SECONDARY_CONTEXT_VERSES, chapter.verses.length));
}

function getSecondaryPassageContext(
  chapter: Chapter | null,
  queryTerms: string[],
  activeStudyVerseNumber: number | null
) {
  const verses = getSecondaryPassageVerses(chapter, queryTerms, activeStudyVerseNumber);

  if (verses.length === 0) {
    return "";
  }

  return clampText(
    verses.map((verse) => `${verse.number}. ${verse.text}`).join("\n"),
    MAX_SECONDARY_CONTEXT_CHARACTERS
  );
}

export async function buildBibleAiPrompt({
  query,
  version,
  currentPassage,
  currentChapter,
  activeStudyVerseNumber,
  notebook,
  studySets,
  highlights,
  bookmarks
}: BibleAiContextInput) {
  const queryTerms = getQueryTerms(query);
  const sources = await getRetrievedSources(query, version, currentPassage, activeStudyVerseNumber);
  const secondaryPassageContext = getSecondaryPassageContext(
    currentChapter,
    queryTerms,
    activeStudyVerseNumber
  );
  const notebookContext = getNotebookContext(notebook);
  const studySetContext = getStudySetContext(studySets);
  const annotationContext = getAnnotationContext(highlights, bookmarks);

  const systemPrompt = [
    "You are a Bible study assistant running entirely inside a Bible reading app.",
    "Answer only from the provided Bible and study context.",
    "Prioritize the user's question over the currently open chapter.",
    "Do not summarize the current chapter unless the question specifically asks for that.",
    "If the provided passages do not support a confident answer, say the available context is limited.",
    "Answer the question first, not the chapter generally.",
    "Respond in 2 to 4 concise sentences, then include a final line that starts with 'Sources:' and lists the most relevant passage labels."
  ].join(" ");

  const userPrompt = [
    `Question:\n${query}`,
    `Active translation:\n${version.toUpperCase()}`,
    sources.length > 0
      ? `Primary Bible sources:\n${sources
          .map((source) => `${source.label}: ${source.preview}`)
          .join("\n")}`
      : `Primary Bible sources:\nNone found from the current local search context.\n${INSUFFICIENT_CONTEXT_COPY}`,
    secondaryPassageContext
      ? `Secondary passage context:\n${secondaryPassageContext}`
      : "",
    [annotationContext, notebookContext, studySetContext].filter(Boolean).length > 0
      ? `User study notes:\n${[annotationContext, notebookContext, studySetContext]
          .filter(Boolean)
          .join("\n")}`
      : "",
    [
      "Instructions:",
      "1. Answer the question directly from the primary Bible sources first.",
      "2. Use secondary passage context only if it helps clarify the answer.",
      "3. Do not summarize the open chapter unless the question asks for it.",
      `4. If the sources are not enough, say: "${INSUFFICIENT_CONTEXT_COPY}"`,
      "5. End with a line formatted exactly as 'Sources: Passage, Passage'."
    ].join("\n")
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    sources
  };
}
