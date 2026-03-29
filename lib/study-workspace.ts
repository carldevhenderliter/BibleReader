import {
  STUDY_BOOKMARKS_STORAGE_KEY,
  STUDY_HIGHLIGHTS_STORAGE_KEY,
  STUDY_SETS_STORAGE_KEY
} from "@/lib/bible/constants";
import type {
  Bookmark,
  BundledBibleVersion,
  Highlight,
  PassageReference,
  StudyHighlightColor,
  StudySet
} from "@/lib/bible/types";

export {
  STUDY_BOOKMARKS_STORAGE_KEY,
  STUDY_HIGHLIGHTS_STORAGE_KEY,
  STUDY_SETS_STORAGE_KEY
};

export const STUDY_HIGHLIGHT_COLORS: StudyHighlightColor[] = ["gold", "sky", "rose"];

export type HighlightStorage = Record<string, Highlight>;
export type BookmarkStorage = Record<string, Bookmark>;
export type StudySetStorage = Record<string, StudySet>;

type PassageReferenceInput = {
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber?: number;
  endVerseNumber?: number;
  label?: string;
  sourceType?: PassageReference["sourceType"];
};

export function getVerseKey(
  version: BundledBibleVersion,
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number
) {
  return `${version}:${bookSlug}:${chapterNumber}:${verseNumber}`;
}

export function getBookmarkKey(
  version: BundledBibleVersion,
  bookSlug: string,
  chapterNumber: number,
  verseNumber?: number
) {
  return verseNumber == null
    ? `${version}:${bookSlug}:${chapterNumber}:chapter`
    : getVerseKey(version, bookSlug, chapterNumber, verseNumber);
}

export function createPassageReference({
  version,
  bookSlug,
  chapterNumber,
  verseNumber,
  endVerseNumber,
  label = "",
  sourceType = "manual"
}: PassageReferenceInput): PassageReference {
  const verseSuffix =
    verseNumber == null
      ? "chapter"
      : endVerseNumber && endVerseNumber > verseNumber
        ? `${verseNumber}-${endVerseNumber}`
        : String(verseNumber);

  return {
    id: `${version}:${bookSlug}:${chapterNumber}:${verseSuffix}`,
    version,
    bookSlug,
    chapterNumber,
    verseNumber,
    endVerseNumber,
    label,
    sourceType
  };
}

export function createHighlight(
  version: BundledBibleVersion,
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  color: StudyHighlightColor
): Highlight {
  return {
    id: getVerseKey(version, bookSlug, chapterNumber, verseNumber),
    version,
    bookSlug,
    chapterNumber,
    verseNumber,
    color,
    label: "",
    updatedAt: new Date().toISOString()
  };
}

export function createBookmark(
  version: BundledBibleVersion,
  bookSlug: string,
  chapterNumber: number,
  verseNumber?: number
): Bookmark {
  return {
    id: getBookmarkKey(version, bookSlug, chapterNumber, verseNumber),
    version,
    bookSlug,
    chapterNumber,
    verseNumber,
    label: "",
    updatedAt: new Date().toISOString()
  };
}

export function createStudySet(name: string): StudySet {
  const trimmedName = name.trim();
  const safeName = trimmedName.length > 0 ? trimmedName : "Untitled set";

  return {
    id: `study-set:${safeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${Date.now().toString(36)}`,
    name: safeName,
    items: [],
    updatedAt: new Date().toISOString()
  };
}

function isBundledVersion(value: unknown): value is BundledBibleVersion {
  return value === "web" || value === "kjv";
}

function normalizePassageReference(value: unknown): PassageReference | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reference = value as Partial<PassageReference>;

  if (
    !isBundledVersion(reference.version) ||
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

  return {
    id:
      typeof reference.id === "string" && reference.id.length > 0
        ? reference.id
        : createPassageReference({
            version: reference.version,
            bookSlug: reference.bookSlug,
            chapterNumber: reference.chapterNumber,
            verseNumber: reference.verseNumber,
            endVerseNumber: reference.endVerseNumber
          }).id,
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
  };
}

export function normalizeHighlightStorage(value: unknown): HighlightStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<Highlight>>).reduce<HighlightStorage>(
    (items, [id, highlight]) => {
      if (
        !isBundledVersion(highlight.version) ||
        typeof highlight.bookSlug !== "string" ||
        typeof highlight.chapterNumber !== "number" ||
        typeof highlight.verseNumber !== "number" ||
        (highlight.color !== "gold" && highlight.color !== "sky" && highlight.color !== "rose")
      ) {
        return items;
      }

      items[id] = {
        id,
        version: highlight.version,
        bookSlug: highlight.bookSlug,
        chapterNumber: highlight.chapterNumber,
        verseNumber: highlight.verseNumber,
        color: highlight.color,
        label: typeof highlight.label === "string" ? highlight.label : "",
        updatedAt:
          typeof highlight.updatedAt === "string" && highlight.updatedAt.length > 0
            ? highlight.updatedAt
            : new Date(0).toISOString()
      };

      return items;
    },
    {}
  );
}

export function normalizeBookmarkStorage(value: unknown): BookmarkStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<Bookmark>>).reduce<BookmarkStorage>(
    (items, [id, bookmark]) => {
      if (
        !isBundledVersion(bookmark.version) ||
        typeof bookmark.bookSlug !== "string" ||
        typeof bookmark.chapterNumber !== "number" ||
        (bookmark.verseNumber != null && typeof bookmark.verseNumber !== "number")
      ) {
        return items;
      }

      items[id] = {
        id,
        version: bookmark.version,
        bookSlug: bookmark.bookSlug,
        chapterNumber: bookmark.chapterNumber,
        verseNumber: bookmark.verseNumber,
        label: typeof bookmark.label === "string" ? bookmark.label : "",
        updatedAt:
          typeof bookmark.updatedAt === "string" && bookmark.updatedAt.length > 0
            ? bookmark.updatedAt
            : new Date(0).toISOString()
      };

      return items;
    },
    {}
  );
}

export function normalizeStudySetStorage(value: unknown): StudySetStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value as Record<string, Partial<StudySet>>).reduce<StudySetStorage>(
    (items, [id, studySet]) => {
      if (typeof studySet.name !== "string" || !Array.isArray(studySet.items)) {
        return items;
      }

      items[id] = {
        id,
        name: studySet.name,
        items: studySet.items
          .map((item) => normalizePassageReference(item))
          .filter((item): item is PassageReference => item !== null),
        updatedAt:
          typeof studySet.updatedAt === "string" && studySet.updatedAt.length > 0
            ? studySet.updatedAt
            : new Date(0).toISOString()
      };

      return items;
    },
    {}
  );
}

export function formatBookLabel(bookSlug: string) {
  return bookSlug
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function formatPassageReference(reference: PassageReference) {
  const bookLabel = formatBookLabel(reference.bookSlug);

  if (reference.verseNumber == null) {
    return `${bookLabel} ${reference.chapterNumber}`;
  }

  if (
    reference.endVerseNumber != null &&
    reference.endVerseNumber > reference.verseNumber
  ) {
    return `${bookLabel} ${reference.chapterNumber}:${reference.verseNumber}-${reference.endVerseNumber}`;
  }

  return `${bookLabel} ${reference.chapterNumber}:${reference.verseNumber}`;
}

export function cycleHighlightColor(
  currentColor?: StudyHighlightColor | null
): StudyHighlightColor | null {
  if (!currentColor) {
    return STUDY_HIGHLIGHT_COLORS[0];
  }

  const index = STUDY_HIGHLIGHT_COLORS.indexOf(currentColor);

  if (index === -1 || index === STUDY_HIGHLIGHT_COLORS.length - 1) {
    return null;
  }

  return STUDY_HIGHLIGHT_COLORS[index + 1];
}
