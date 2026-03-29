"use client";

import { getCrossReferenceEntry } from "@/lib/bible/cross-references";
import { searchBible } from "@/lib/bible/search";
import type {
  Bookmark,
  BundledBibleVersion,
  Chapter,
  Highlight,
  LocalBibleAiSource,
  PassageNotebook,
  SearchMatchMode,
  StudySet
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
  notebook: PassageNotebook | null;
  studySets: StudySet[];
  highlights: Highlight[];
  bookmarks: Bookmark[];
};

const MAX_RETRIEVED_SOURCES = 8;
const MAX_CURRENT_PASSAGE_CHARACTERS = 2800;
const MAX_NOTEBOOK_BLOCKS = 4;
const MAX_STUDY_SETS = 2;
const MAX_STUDY_SET_ITEMS = 3;
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

function normalizeQueryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
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

function getCurrentPassageText(chapter: Chapter | null) {
  if (!chapter) {
    return "";
  }

  const combined = chapter.verses
    .map((verse) => `${verse.number}. ${verse.text}`)
    .join("\n");

  if (combined.length <= MAX_CURRENT_PASSAGE_CHARACTERS) {
    return combined;
  }

  return `${combined.slice(0, MAX_CURRENT_PASSAGE_CHARACTERS).trim()}\n[Passage truncated for local AI context]`;
}

function getNotebookContext(notebook: PassageNotebook | null) {
  if (!notebook) {
    return "";
  }

  const parts = [
    notebook.title.trim() ? `Title: ${notebook.title.trim()}` : ""
  ];

  notebook.blocks.slice(0, MAX_NOTEBOOK_BLOCKS).forEach((block, index) => {
    const text = block.text.trim();
    const references = block.references.map((reference) => formatPassageReference(reference)).join(", ");

    if (text) {
      parts.push(`Block ${index + 1} (${block.type}): ${text}`);
    }

    if (references) {
      parts.push(`Block ${index + 1} references: ${references}`);
    }
  });

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
  ).slice(0, 4);
}

function addSource(
  sources: LocalBibleAiSource[],
  nextSource: LocalBibleAiSource | null,
  seenSourceIds: Set<string>
) {
  if (!nextSource || seenSourceIds.has(nextSource.id) || sources.length >= MAX_RETRIEVED_SOURCES) {
    return;
  }

  seenSourceIds.add(nextSource.id);
  sources.push(nextSource);
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

async function getRetrievedSources(
  query: string,
  version: BundledBibleVersion,
  currentPassage: CurrentPassage | null,
  activeStudyVerseNumber: number | null
) {
  const sources: LocalBibleAiSource[] = [];
  const seenSourceIds = new Set<string>();
  const searchQueries = [query, ...getQueryTerms(query)];
  const searchResults = await Promise.all(
    searchQueries.map((searchQuery) => searchBible(searchQuery, version, MATCH_MODE))
  );

  for (const results of searchResults) {
    for (const result of results) {
      if (result.type === "verse") {
        addSource(sources, getSourceFromVerseResult(result), seenSourceIds);
      } else if (result.type === "range") {
        result.verses.forEach((verse) =>
          addSource(
            sources,
            {
              id: verse.id,
              label: verse.label,
              href: verse.href,
              preview: verse.preview,
              bookSlug: result.bookSlug,
              chapterNumber: result.chapterNumber,
              verseNumber: verse.verseNumber
            },
            seenSourceIds
          )
        );
      } else if (result.type === "topic") {
        result.subtopics.forEach((subtopic) => {
          subtopic.verses.forEach((verse) =>
            addSource(sources, getSourceFromVerseResult(verse), seenSourceIds)
          );
        });
      }
    }
  }

  if (currentPassage && activeStudyVerseNumber != null) {
    const crossReferences = await getCrossReferenceEntry(
      version,
      currentPassage.bookSlug,
      currentPassage.chapterNumber,
      activeStudyVerseNumber
    );

    crossReferences?.groups.forEach((group) => {
      group.references.forEach((reference) =>
        addSource(
          sources,
          {
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
          },
          seenSourceIds
        )
      );
    });
  }

  return sources.slice(0, MAX_RETRIEVED_SOURCES);
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
  const sources = await getRetrievedSources(query, version, currentPassage, activeStudyVerseNumber);
  const currentPassageText = getCurrentPassageText(currentChapter);
  const notebookContext = getNotebookContext(notebook);
  const studySetContext = getStudySetContext(studySets);
  const annotationContext = getAnnotationContext(highlights, bookmarks);

  const systemPrompt = [
    "You are a Bible study assistant running entirely inside a Bible reading app.",
    "Answer only from the provided Bible and study context.",
    "Do not use outside knowledge, theology, history, or facts that are not in the provided context.",
    "If the context is insufficient, say that the answer is limited by the available passages.",
    "Write concise study-oriented answers and cite relevant passages in parentheses."
  ].join(" ");

  const userPrompt = [
    `Question: ${query}`,
    `Active translation: ${version.toUpperCase()}`,
    currentPassage
      ? `Current passage: ${currentPassage.bookSlug} ${currentPassage.chapterNumber} (${currentPassage.view})`
      : "",
    currentPassageText ? `Current passage text:\n${currentPassageText}` : "",
    annotationContext ? `Current passage annotations:\n${annotationContext}` : "",
    notebookContext ? `Notebook context:\n${notebookContext}` : "",
    studySetContext ? `Recent study sets:\n${studySetContext}` : "",
    sources.length > 0
      ? `Retrieved Bible sources:\n${sources
          .map((source) => `${source.label}: ${source.preview}`)
          .join("\n")}`
      : "Retrieved Bible sources: none",
    "Answer from the supplied context only, then list the most relevant supporting passages."
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    systemPrompt,
    userPrompt,
    sources
  };
}
