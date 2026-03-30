import {
  ACTIVE_NOTEBOOK_STORAGE_KEY,
  PASSAGE_NOTEBOOK_STORAGE_KEY
} from "@/lib/bible/constants";
import type {
  NotebookDocument,
  PassageReference,
  BundledBibleVersion
} from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

export { ACTIVE_NOTEBOOK_STORAGE_KEY, PASSAGE_NOTEBOOK_STORAGE_KEY };

export type NotebookDocumentStorage = Record<string, NotebookDocument>;

type LegacyNotebookBlock = {
  id?: string;
  type?: "paragraph" | "list";
  text?: string;
  references?: unknown[];
};

type LegacyPassageNotebook = {
  version?: BundledBibleVersion;
  bookSlug?: string;
  chapterNumber?: number;
  title?: string;
  blocks?: LegacyNotebookBlock[];
  updatedAt?: string;
};

export function createNotebookDocument(title = ""): NotebookDocument {
  return {
    id: `notebook:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    title,
    content: "",
    references: [],
    updatedAt: new Date().toISOString()
  };
}

function slugifyNotebookId(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "notebook";
}

function formatFallbackTitle(bookSlug: string, chapterNumber: number) {
  const bookLabel = bookSlug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return `${bookLabel} ${chapterNumber} notes`;
}

function normalizePassageReference(value: unknown): PassageReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reference = value as Partial<PassageReference>;

  if (
    (reference.version !== "web" && reference.version !== "kjv") ||
    typeof reference.bookSlug !== "string" ||
    typeof reference.chapterNumber !== "number"
  ) {
    return null;
  }

  if (reference.verseNumber != null && typeof reference.verseNumber !== "number") {
    return null;
  }

  if (reference.endVerseNumber != null && typeof reference.endVerseNumber !== "number") {
    return null;
  }

  return createPassageReference({
    version: reference.version,
    bookSlug: reference.bookSlug,
    chapterNumber: reference.chapterNumber,
    verseNumber: reference.verseNumber,
    endVerseNumber: reference.endVerseNumber,
    label: typeof reference.label === "string" ? reference.label : "",
    sourceType:
      reference.sourceType === "bookmark" ||
      reference.sourceType === "manual" ||
      reference.sourceType === "topic" ||
      reference.sourceType === "search"
        ? reference.sourceType
        : "manual"
  });
}

function normalizeNotebookDocument(id: string, value: Partial<NotebookDocument>): NotebookDocument | null {
  if (typeof value.title !== "string" || typeof value.content !== "string") {
    return null;
  }

  const references = Array.isArray(value.references)
    ? value.references
        .map((reference) => normalizePassageReference(reference))
        .filter((reference): reference is PassageReference => reference !== null)
    : [];

  return {
    id,
    title: value.title,
    content: value.content,
    references: Array.from(new Map(references.map((reference) => [reference.id, reference])).values()),
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : new Date(0).toISOString()
  };
}

function normalizeLegacyNotebook(id: string, value: LegacyPassageNotebook): NotebookDocument | null {
  if (
    (value.version !== "web" && value.version !== "kjv") ||
    typeof value.bookSlug !== "string" ||
    typeof value.chapterNumber !== "number" ||
    !Array.isArray(value.blocks)
  ) {
    return null;
  }

  const blocks = value.blocks.reduce<Array<{ text: string; references: PassageReference[] }>>(
    (items, block) => {
      if (!block || typeof block !== "object" || typeof block.text !== "string") {
        return items;
      }

      const text = block.text.trim();
      const references = Array.isArray(block.references)
        ? block.references
            .map((reference) => normalizePassageReference(reference))
            .filter((reference): reference is PassageReference => reference !== null)
        : [];

      if (!text && references.length === 0) {
        return items;
      }

      items.push({ text, references });
      return items;
    },
    []
  );

  const fallbackReference = createPassageReference({
    version: value.version,
    bookSlug: value.bookSlug,
    chapterNumber: value.chapterNumber,
    sourceType: "manual"
  });
  const references = Array.from(
    new Map(
      [fallbackReference, ...blocks.flatMap((block) => block.references)].map((reference) => [
        reference.id,
        reference
      ])
    ).values()
  );
  const content = blocks.map((block) => block.text).filter(Boolean).join("\n\n");
  const title =
    typeof value.title === "string" && value.title.trim().length > 0
      ? value.title
      : formatFallbackTitle(value.bookSlug, value.chapterNumber);

  return {
    id: `notebook:${slugifyNotebookId(id)}`,
    title,
    content,
    references,
    updatedAt:
      typeof value.updatedAt === "string" && value.updatedAt.length > 0
        ? value.updatedAt
        : new Date(0).toISOString()
  };
}

export function normalizePassageNotebookStorage(value: unknown): NotebookDocumentStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<NotebookDocument> | LegacyPassageNotebook>).reduce<
    NotebookDocumentStorage
  >((documents, [id, document]) => {
    if (!document || typeof document !== "object") {
      return documents;
    }

    const normalized =
      "content" in document
        ? normalizeNotebookDocument(id, document as Partial<NotebookDocument>)
        : normalizeLegacyNotebook(id, document as LegacyPassageNotebook);

    if (!normalized) {
      return documents;
    }

    documents[normalized.id] = normalized;
    return documents;
  }, {});
}
