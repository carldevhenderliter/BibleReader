import gospelHarmonyTemplate from "@/data/study/gospel-harmony/esv-template.json";
import {
  ACTIVE_GOSPEL_HARMONY_STORAGE_KEY,
  GOSPEL_HARMONY_DOCUMENTS_STORAGE_KEY
} from "@/lib/bible/constants";
import type {
  BookMeta,
  HarmonyDocument,
  HarmonyEvent,
  HarmonyLine,
  PassageReference
} from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

export {
  ACTIVE_GOSPEL_HARMONY_STORAGE_KEY,
  GOSPEL_HARMONY_DOCUMENTS_STORAGE_KEY
};

export type HarmonyDocumentStorage = Record<string, HarmonyDocument>;

export const GOSPEL_HARMONY_BOOK_SLUG = "gospel-harmony";
export const GOSPEL_HARMONY_BOOK_META: BookMeta = {
  slug: GOSPEL_HARMONY_BOOK_SLUG,
  name: "Gospel Harmony",
  abbreviation: "Harmony",
  testament: "New",
  chapterCount: 1,
  order: 67
};

const DEFAULT_HARMONY_TITLE = "Chronological Harmony of the Gospels";

type HarmonyTemplateReference = PassageReference;
type HarmonyTemplateLine = Omit<HarmonyLine, "references"> & {
  references: HarmonyTemplateReference[];
};
type HarmonyTemplateEvent = Omit<HarmonyEvent, "references" | "lines"> & {
  references: HarmonyTemplateReference[];
  lines: HarmonyTemplateLine[];
};
type HarmonyTemplate = {
  title: string;
  sourceVersion: "esv";
  events: HarmonyTemplateEvent[];
};

export function isGospelHarmonyBookSlug(bookSlug: string) {
  return bookSlug === GOSPEL_HARMONY_BOOK_SLUG;
}

export function getGospelHarmonyTemplateEvents(): HarmonyEvent[] {
  const template = gospelHarmonyTemplate as HarmonyTemplate;
  return template.events.map(hydrateTemplateEvent);
}

function cloneReference(reference: PassageReference): PassageReference {
  return createPassageReference({
    version: reference.version,
    bookSlug: reference.bookSlug,
    chapterNumber: reference.chapterNumber,
    verseNumber: reference.verseNumber,
    endVerseNumber: reference.endVerseNumber,
    label: reference.label,
    sourceType: reference.sourceType
  });
}

function createHarmonyId(title: string) {
  const safeTitle =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "gospel-harmony";

  return `harmony:${safeTitle}:${Date.now().toString(36)}`;
}

function hydrateTemplateEvent(event: HarmonyTemplateEvent): HarmonyEvent {
  return {
    ...event,
    references: event.references.map(cloneReference),
    lines: event.lines.map((line) => ({
      ...line,
      references: line.references.map(cloneReference)
    }))
  };
}

function normalizeReference(value: unknown): PassageReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reference = value as Partial<PassageReference>;

  if (
    reference.version !== "esv" &&
    reference.version !== "web" &&
    reference.version !== "kjv" &&
    reference.version !== "nlt" &&
    reference.version !== "greek"
  ) {
    return null;
  }

  if (typeof reference.bookSlug !== "string" || typeof reference.chapterNumber !== "number") {
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

function normalizeHarmonyLine(value: unknown, fallbackId: string): HarmonyLine | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const line = value as Partial<HarmonyLine>;

  if (
    line.kind !== "merged" &&
    line.kind !== "difference" &&
    line.kind !== "unique" &&
    line.kind !== "teaching-break"
  ) {
    return null;
  }

  if (typeof line.text !== "string" || !Array.isArray(line.references)) {
    return null;
  }

  const references = line.references
    .map((reference) => normalizeReference(reference))
    .filter((reference): reference is PassageReference => reference !== null);

  if (references.length === 0 && line.kind !== "teaching-break") {
    return null;
  }

  return {
    id: typeof line.id === "string" && line.id.length > 0 ? line.id : fallbackId,
    kind: line.kind,
    speaker:
      line.speaker === "Matthew" ||
      line.speaker === "Mark" ||
      line.speaker === "Luke" ||
      line.speaker === "John"
        ? line.speaker
        : undefined,
    label: typeof line.label === "string" ? line.label : undefined,
    text: line.text,
    references
  };
}

function normalizeHarmonyEvent(value: unknown, fallbackId: string, eventNumber: number): HarmonyEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const event = value as Partial<HarmonyEvent>;

  if (
    typeof event.title !== "string" ||
    typeof event.timeline !== "string" ||
    !Array.isArray(event.references) ||
    !Array.isArray(event.lines)
  ) {
    return null;
  }

  const references = event.references
    .map((reference) => normalizeReference(reference))
    .filter((reference): reference is PassageReference => reference !== null);
  const lines = event.lines
    .map((line, index) => normalizeHarmonyLine(line, `${fallbackId}:line-${index + 1}`))
    .filter((line): line is HarmonyLine => line !== null);

  if (references.length === 0 || lines.length === 0) {
    return null;
  }

  return {
    id: typeof event.id === "string" && event.id.length > 0 ? event.id : fallbackId,
    eventNumber: typeof event.eventNumber === "number" ? event.eventNumber : eventNumber,
    title: event.title,
    timeline: event.timeline,
    chronologyNote:
      typeof event.chronologyNote === "string" ? event.chronologyNote : undefined,
    references,
    lines
  };
}

export function createDefaultHarmonyDocument(title = DEFAULT_HARMONY_TITLE): HarmonyDocument {
  const template = gospelHarmonyTemplate as HarmonyTemplate;
  const safeTitle = title.trim() || template.title || DEFAULT_HARMONY_TITLE;

  return {
    id: createHarmonyId(safeTitle),
    title: safeTitle,
    sourceVersion: "esv",
    events: getGospelHarmonyTemplateEvents(),
    updatedAt: new Date().toISOString()
  };
}

export function normalizeHarmonyDocumentStorage(value: unknown): HarmonyDocumentStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<HarmonyDocument>>).reduce<HarmonyDocumentStorage>(
    (documents, [id, document]) => {
      if (
        !document ||
        typeof document !== "object" ||
        typeof document.title !== "string" ||
        document.sourceVersion !== "esv" ||
        !Array.isArray(document.events)
      ) {
        return documents;
      }

      const events = document.events
        .map((event, index) => normalizeHarmonyEvent(event, `event-${index + 1}`, index + 1))
        .filter((event): event is HarmonyEvent => event !== null);

      if (events.length === 0) {
        return documents;
      }

      documents[id] = {
        id,
        title: document.title,
        sourceVersion: "esv",
        events,
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
