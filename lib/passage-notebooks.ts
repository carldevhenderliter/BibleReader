import { PASSAGE_NOTEBOOK_STORAGE_KEY } from "@/lib/bible/constants";
import type {
  BundledBibleVersion,
  PassageNotebook,
  PassageNotebookBlock,
  PassageNotebookBlockType
} from "@/lib/bible/types";

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
    text: ""
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
        text: block.text
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
