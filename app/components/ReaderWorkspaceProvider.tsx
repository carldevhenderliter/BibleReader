"use client";

import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type { PassageNotebook, PassageNotebookBlock } from "@/lib/bible/types";
import {
  PASSAGE_NOTEBOOK_STORAGE_KEY,
  createNotebookBlock,
  createPassageNotebook,
  getPassageNotebookId,
  normalizePassageNotebookStorage,
  type PassageNotebookStorage
} from "@/lib/passage-notebooks";

type ReaderPane = "reading" | "notebook";

type ReaderWorkspaceContextValue = {
  activeReaderPane: ReaderPane;
  setActiveReaderPane: (tab: ReaderPane) => void;
  getNotebook: (bookSlug: string, chapterNumber: number) => PassageNotebook;
  updateNotebookTitle: (bookSlug: string, chapterNumber: number, title: string) => void;
  addNotebookBlock: (
    bookSlug: string,
    chapterNumber: number,
    type: PassageNotebookBlock["type"]
  ) => void;
  updateNotebookBlock: (
    bookSlug: string,
    chapterNumber: number,
    blockId: string,
    updates: Partial<Pick<PassageNotebookBlock, "type" | "text">>
  ) => void;
  deleteNotebookBlock: (bookSlug: string, chapterNumber: number, blockId: string) => void;
  clearNotebook: (bookSlug: string, chapterNumber: number) => void;
};

const ReaderWorkspaceContext = createContext<ReaderWorkspaceContextValue | null>(null);

function isNotebookEmpty(notebook: PassageNotebook) {
  return (
    notebook.title.trim().length === 0 &&
    notebook.blocks.every((block) => block.text.trim().length === 0)
  );
}

export function ReaderWorkspaceProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const [notebooks, setNotebooks] = useState<PassageNotebookStorage>({});
  const [hasLoadedNotebooks, setHasLoadedNotebooks] = useState(false);
  const [activeReaderPane, setActiveReaderPane] = useState<ReaderPane>("reading");
  const isReaderRoute = pathname.startsWith("/read");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY);

      if (!stored) {
        setHasLoadedNotebooks(true);
        return;
      }

      setNotebooks(normalizePassageNotebookStorage(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(PASSAGE_NOTEBOOK_STORAGE_KEY);
    } finally {
      setHasLoadedNotebooks(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedNotebooks) {
      return;
    }

    window.localStorage.setItem(PASSAGE_NOTEBOOK_STORAGE_KEY, JSON.stringify(notebooks));
  }, [hasLoadedNotebooks, notebooks]);

  useEffect(() => {
    if (!isReaderRoute) {
      setActiveReaderPane("reading");
    }
  }, [isReaderRoute, pathname]);

  const value = useMemo<ReaderWorkspaceContextValue>(
    () => ({
      activeReaderPane,
      setActiveReaderPane,
      getNotebook: (bookSlug, chapterNumber) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });

        return notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });
      },
      updateNotebookTitle: (bookSlug, chapterNumber, title) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });

        const nextNotebook = {
          ...existing,
          title,
          updatedAt: new Date().toISOString()
        };

        setNotebooks((current) => {
          if (isNotebookEmpty(nextNotebook)) {
            const next = { ...current };
            delete next[notebookId];
            return next;
          }

          return {
            ...current,
            [notebookId]: nextNotebook
          };
        });
      },
      addNotebookBlock: (bookSlug, chapterNumber, type) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });

        setNotebooks((current) => ({
          ...current,
          [notebookId]: {
            ...existing,
            blocks: [...existing.blocks, createNotebookBlock(type)],
            updatedAt: new Date().toISOString()
          }
        }));
      },
      updateNotebookBlock: (bookSlug, chapterNumber, blockId, updates) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });

        const blocks = existing.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                ...updates
              }
            : block
        );
        const nextNotebook = {
          ...existing,
          blocks,
          updatedAt: new Date().toISOString()
        };

        setNotebooks((current) => {
          if (isNotebookEmpty(nextNotebook)) {
            const next = { ...current };
            delete next[notebookId];
            return next;
          }

          return {
            ...current,
            [notebookId]: nextNotebook
          };
        });
      },
      deleteNotebookBlock: (bookSlug, chapterNumber, blockId) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ??
          createPassageNotebook({
            version,
            bookSlug,
            chapterNumber,
            blocks: [createNotebookBlock("paragraph")]
          });

        const blocks = existing.blocks.filter((block) => block.id !== blockId);
        const nextNotebook = {
          ...existing,
          blocks,
          updatedAt: new Date().toISOString()
        };

        setNotebooks((current) => {
          if (isNotebookEmpty(nextNotebook)) {
            const next = { ...current };
            delete next[notebookId];
            return next;
          }

          return {
            ...current,
            [notebookId]: nextNotebook
          };
        });
      },
      clearNotebook: (bookSlug, chapterNumber) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });

        setNotebooks((current) => {
          if (!(notebookId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[notebookId];
          return next;
        });
      }
    }),
    [activeReaderPane, notebooks, version]
  );

  return <ReaderWorkspaceContext.Provider value={value}>{children}</ReaderWorkspaceContext.Provider>;
}

export function useReaderWorkspace() {
  const context = useContext(ReaderWorkspaceContext);

  if (!context) {
    throw new Error("useReaderWorkspace must be used within ReaderWorkspaceProvider.");
  }

  return context;
}
