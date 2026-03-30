import { SERMON_DOCUMENTS_STORAGE_KEY } from "@/lib/bible/constants";
import type {
  PassageReference,
  SermonDocument,
  SermonDocumentSection
} from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

export { SERMON_DOCUMENTS_STORAGE_KEY };

export type SermonDocumentStorage = Record<string, SermonDocument>;

export function createSermonDocumentSection(title = "New section"): SermonDocumentSection {
  return {
    id: `sermon-section:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    title,
    content: ""
  };
}

export function createSermonDocument(title = "Untitled sermon"): SermonDocument {
  const safeTitle = title.trim() || "Untitled sermon";

  return {
    id: `sermon:${safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${Date.now().toString(36)}`,
    title: safeTitle,
    summary: "",
    references: [],
    sections: [createSermonDocumentSection("Main idea")],
    updatedAt: new Date().toISOString()
  };
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

export function normalizeSermonDocumentStorage(value: unknown): SermonDocumentStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<SermonDocument>>).reduce<SermonDocumentStorage>(
    (documents, [id, document]) => {
      if (
        typeof document.title !== "string" ||
        typeof document.summary !== "string" ||
        !Array.isArray(document.sections) ||
        !Array.isArray(document.references)
      ) {
        return documents;
      }

      const sections = document.sections.reduce<SermonDocumentSection[]>((items, section, index) => {
        if (
          !section ||
          typeof section !== "object" ||
          typeof section.title !== "string" ||
          typeof section.content !== "string"
        ) {
          return items;
        }

        items.push({
          id:
            typeof section.id === "string" && section.id.length > 0
              ? section.id
              : `sermon-section:${index}`,
          title: section.title,
          content: section.content
        });

        return items;
      }, []);

      documents[id] = {
        id,
        title: document.title,
        summary: document.summary,
        references: document.references
          .map((reference) => normalizePassageReference(reference))
          .filter((reference): reference is PassageReference => reference !== null),
        sections: sections.length > 0 ? sections : [createSermonDocumentSection("Main idea")],
        updatedAt:
          typeof document.updatedAt === "string" && document.updatedAt.length > 0
            ? document.updatedAt
            : new Date(0).toISOString()
      };

      return documents;
    },
    {}
  );
}
