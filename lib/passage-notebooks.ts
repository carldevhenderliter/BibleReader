import { PASSAGE_NOTEBOOK_STORAGE_KEY } from "@/lib/bible/constants";
import type {
  PassageReference,
  BundledBibleVersion,
  PassageNotebook,
  PassageNotebookBlock,
  PassageNotebookBlockType
} from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

export { PASSAGE_NOTEBOOK_STORAGE_KEY };

export type PassageNotebookStorage = Record<string, PassageNotebook>;

type PassageNotebookKeyInput = {
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
};

type CreatePassageNotebookInput = PassageNotebookKeyInput & {
  title?: string;
  blocks?: PassageNotebookBlock[];
};

export function getPassageNotebookId({
  version,
  bookSlug,
  chapterNumber
}: PassageNotebookKeyInput) {
  return `${version}:${bookSlug}:${chapterNumber}`;
}

export function createNotebookBlock(type: PassageNotebookBlockType = "paragraph"): PassageNotebookBlock {
  return {
    id: `${type}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`,
    type,
    text: "",
    references: []
  };
}

export function createPassageNotebook({
  version,
  bookSlug,
  chapterNumber,
  title = "",
  blocks = []
}: CreatePassageNotebookInput): PassageNotebook {
  return {
    id: getPassageNotebookId({ version, bookSlug, chapterNumber }),
    version,
    bookSlug,
    chapterNumber,
    title,
    blocks,
    updatedAt: new Date().toISOString()
  };
}

export function normalizePassageNotebookStorage(value: unknown): PassageNotebookStorage {
  if (!value || typeof value !== "object") {
    return {};
  }

  const candidate = value as Record<string, Partial<PassageNotebook>>;

  return Object.entries(candidate).reduce<PassageNotebookStorage>((notebooks, [id, notebook]) => {
    if (
      (notebook.version !== "web" && notebook.version !== "kjv") ||
      typeof notebook.bookSlug !== "string" ||
      typeof notebook.chapterNumber !== "number" ||
      typeof notebook.title !== "string" ||
      !Array.isArray(notebook.blocks)
    ) {
      return notebooks;
    }

    const blocks = notebook.blocks.reduce<PassageNotebookBlock[]>((items, block) => {
      if (
        !block ||
        typeof block !== "object" ||
        (block.type !== "paragraph" && block.type !== "list") ||
        typeof block.text !== "string"
      ) {
        return items;
      }

      items.push({
        id: typeof block.id === "string" && block.id.length > 0 ? block.id : `${block.type}:${items.length}`,
        type: block.type,
        text: block.text,
        references: Array.isArray(block.references)
          ? block.references.reduce<PassageReference[]>((references, reference) => {
              if (
                !reference ||
                typeof reference !== "object" ||
                (reference.version !== "web" && reference.version !== "kjv") ||
                typeof reference.bookSlug !== "string" ||
                typeof reference.chapterNumber !== "number" ||
                (reference.verseNumber != null && typeof reference.verseNumber !== "number") ||
                (reference.endVerseNumber != null &&
                  typeof reference.endVerseNumber !== "number")
              ) {
                return references;
              }

              references.push(
                createPassageReference({
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
                })
              );

              return references;
            }, [])
          : []
      });

      return items;
    }, []);

    notebooks[id] = {
      id,
      version: notebook.version,
      bookSlug: notebook.bookSlug,
      chapterNumber: notebook.chapterNumber,
      title: notebook.title,
      blocks,
      updatedAt:
        typeof notebook.updatedAt === "string" && notebook.updatedAt.length > 0
          ? notebook.updatedAt
          : new Date(0).toISOString()
    };

    return notebooks;
  }, {});
}
