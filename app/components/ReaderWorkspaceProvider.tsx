"use client";

import {
  useCallback,
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import type {
  Bookmark,
  BundledBibleVersion,
  Chapter,
  Highlight,
  PassageNotebook,
  PassageNotebookBlock,
  PassageReference,
  ReadingView,
  SermonDocument,
  SermonDocumentSection,
  StudyHighlightColor,
  StudySet
} from "@/lib/bible/types";
import {
  PASSAGE_NOTEBOOK_STORAGE_KEY,
  createNotebookBlock,
  createPassageNotebook,
  getPassageNotebookId,
  normalizePassageNotebookStorage,
  type PassageNotebookStorage
} from "@/lib/passage-notebooks";
import {
  SERMON_DOCUMENTS_STORAGE_KEY,
  createSermonDocument,
  createSermonDocumentSection,
  normalizeSermonDocumentStorage,
  type SermonDocumentStorage
} from "@/lib/sermon-documents";
import {
  STUDY_BOOKMARKS_STORAGE_KEY,
  STUDY_HIGHLIGHTS_STORAGE_KEY,
  STUDY_SETS_STORAGE_KEY,
  createBookmark,
  createHighlight,
  createPassageReference,
  createStudySet,
  cycleHighlightColor,
  getBookmarkKey,
  getVerseKey,
  normalizeBookmarkStorage,
  normalizeHighlightStorage,
  normalizeStudySetStorage,
  type BookmarkStorage,
  type HighlightStorage,
  type StudySetStorage
} from "@/lib/study-workspace";

type ReaderPane = "reading" | "study-sets";
type LeftReaderMode = "scripture" | "search";
type UtilityPane = "search" | "cross-references" | "compare" | "notebook" | "sermons";

type CurrentPassage = {
  bookSlug: string;
  chapterNumber: number;
  view: ReadingView;
};

type ReaderWorkspaceContextValue = {
  activeReaderPane: ReaderPane;
  setActiveReaderPane: (tab: ReaderPane) => void;
  leftReaderMode: LeftReaderMode;
  setLeftReaderMode: (mode: LeftReaderMode) => void;
  activeUtilityPane: UtilityPane;
  setActiveUtilityPane: (pane: UtilityPane) => void;
  openNotebook: () => void;
  closeNotebookWorkspace: () => void;
  openSermons: () => void;
  currentPassage: CurrentPassage | null;
  currentChapterByVersion: Record<BundledBibleVersion, Chapter> | null;
  syncCurrentPassage: (bookSlug: string, chapterNumber: number, view: ReadingView) => void;
  syncCurrentChapterData: (
    bookSlug: string,
    chapterNumber: number,
    chaptersByVersion: Record<BundledBibleVersion, Chapter> | null
  ) => void;
  activeStudyVerseNumber: number | null;
  setActiveStudyVerseNumber: (value: number | null) => void;
  openCrossReferences: (verseNumber?: number | null) => void;
  openCompare: (verseNumber?: number | null) => void;
  compareVersion: BundledBibleVersion;
  setCompareVersion: (value: BundledBibleVersion) => void;
  getNotebook: (bookSlug: string, chapterNumber: number) => PassageNotebook;
  updateNotebookTitle: (bookSlug: string, chapterNumber: number, title: string) => void;
  addNotebookBlock: (
    bookSlug: string,
    chapterNumber: number,
    type: PassageNotebookBlock["type"]
  ) => void;
  insertNotebookDraft: (
    bookSlug: string,
    chapterNumber: number,
    text: string,
    type?: PassageNotebookBlock["type"]
  ) => void;
  appendNotebookDraft: (
    bookSlug: string,
    chapterNumber: number,
    text: string,
    blockId?: string
  ) => void;
  updateNotebookBlock: (
    bookSlug: string,
    chapterNumber: number,
    blockId: string,
    updates: Partial<Pick<PassageNotebookBlock, "type" | "text" | "references">>
  ) => void;
  deleteNotebookBlock: (bookSlug: string, chapterNumber: number, blockId: string) => void;
  clearNotebook: (bookSlug: string, chapterNumber: number) => void;
  addNotebookReference: (
    bookSlug: string,
    chapterNumber: number,
    reference: PassageReference,
    blockId?: string
  ) => void;
  getHighlight: (bookSlug: string, chapterNumber: number, verseNumber: number) => Highlight | null;
  getHighlightsForPassage: (bookSlug: string, chapterNumber: number) => Highlight[];
  cycleHighlight: (bookSlug: string, chapterNumber: number, verseNumber: number) => void;
  updateHighlightLabel: (
    bookSlug: string,
    chapterNumber: number,
    verseNumber: number,
    label: string
  ) => void;
  getBookmark: (
    bookSlug: string,
    chapterNumber: number,
    verseNumber?: number
  ) => Bookmark | null;
  getBookmarksForPassage: (bookSlug: string, chapterNumber: number) => Bookmark[];
  toggleBookmark: (bookSlug: string, chapterNumber: number, verseNumber?: number) => void;
  updateBookmarkLabel: (
    bookSlug: string,
    chapterNumber: number,
    verseNumber: number | undefined,
    label: string
  ) => void;
  getStudySets: () => StudySet[];
  saveReferenceToStudySet: (setName: string, reference: PassageReference) => StudySet | null;
  removeStudySetItem: (studySetId: string, itemId: string) => void;
  renameStudySet: (studySetId: string, nextName: string) => void;
  deleteStudySet: (studySetId: string) => void;
  saveCurrentPassageToStudySet: (setName: string) => StudySet | null;
  activeSermonId: string | null;
  setActiveSermonId: (id: string | null) => void;
  getSermonDocuments: () => SermonDocument[];
  getActiveSermon: () => SermonDocument | null;
  createSermon: (title?: string) => SermonDocument;
  createSermonFromNotebook: () => SermonDocument | null;
  updateSermonMetadata: (
    sermonId: string,
    updates: Partial<Pick<SermonDocument, "title" | "summary">>
  ) => void;
  addSermonSection: (sermonId: string, title?: string, content?: string) => void;
  updateSermonSection: (
    sermonId: string,
    sectionId: string,
    updates: Partial<Pick<SermonDocumentSection, "title" | "content">>
  ) => void;
  deleteSermonSection: (sermonId: string, sectionId: string) => void;
  deleteSermon: (sermonId: string) => void;
  addReferenceToSermon: (sermonId: string, reference: PassageReference) => void;
  removeReferenceFromSermon: (sermonId: string, referenceId: string) => void;
};

const ReaderWorkspaceContext = createContext<ReaderWorkspaceContextValue | null>(null);

function isNotebookEmpty(notebook: PassageNotebook) {
  return (
    notebook.title.trim().length === 0 &&
    notebook.blocks.every(
      (block) =>
        block.text.trim().length === 0 &&
        (!block.references?.length || block.references.every((reference) => !reference.label?.trim()))
    )
  );
}

function getSortedStudySets(studySets: StudySetStorage) {
  return Object.values(studySets).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

function getSortedSermons(documents: SermonDocumentStorage) {
  return Object.values(documents).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getAlternateVersion(version: BundledBibleVersion): BundledBibleVersion {
  return version === "web" ? "kjv" : "web";
}

export function ReaderWorkspaceProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const [notebooks, setNotebooks] = useState<PassageNotebookStorage>({});
  const [sermonDocuments, setSermonDocuments] = useState<SermonDocumentStorage>({});
  const [highlights, setHighlights] = useState<HighlightStorage>({});
  const [bookmarks, setBookmarks] = useState<BookmarkStorage>({});
  const [studySets, setStudySets] = useState<StudySetStorage>({});
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const [activeReaderPane, setActiveReaderPane] = useState<ReaderPane>("reading");
  const [leftReaderMode, setLeftReaderMode] = useState<LeftReaderMode>("scripture");
  const [activeUtilityPaneState, setActiveUtilityPaneState] = useState<UtilityPane>("search");
  const [lastReaderUtilityPane, setLastReaderUtilityPane] = useState<Exclude<UtilityPane, "notebook">>("search");
  const [currentPassage, setCurrentPassage] = useState<CurrentPassage | null>(null);
  const [currentChapterByVersion, setCurrentChapterByVersion] = useState<
    Record<BundledBibleVersion, Chapter> | null
  >(null);
  const [activeStudyVerseNumber, setActiveStudyVerseNumber] = useState<number | null>(null);
  const [activeSermonId, setActiveSermonId] = useState<string | null>(null);
  const [compareVersionOverride, setCompareVersionOverride] = useState<BundledBibleVersion | null>(null);
  const isReaderRoute = pathname.startsWith("/read");
  const activeUtilityPane = activeUtilityPaneState;
  const compareVersion =
    compareVersionOverride && compareVersionOverride !== version
      ? compareVersionOverride
      : getAlternateVersion(version);

  const setActiveUtilityPane = useCallback((pane: UtilityPane) => {
    setActiveUtilityPaneState(pane);

    if (pane === "notebook") {
      setActiveReaderPane("reading");
      setLeftReaderMode("search");
      return;
    }

    if (pane === "sermons") {
      setActiveReaderPane("reading");
      setLeftReaderMode("scripture");
      return;
    }

    setLastReaderUtilityPane(pane);
    setLeftReaderMode("scripture");
  }, []);

  const openNotebook = useCallback(() => {
    setActiveReaderPane("reading");
    setLeftReaderMode("search");
    setActiveUtilityPaneState("notebook");
  }, []);

  const openSermons = useCallback(() => {
    setActiveReaderPane("reading");
    setLeftReaderMode("scripture");
    setActiveUtilityPaneState("sermons");
  }, []);

  const closeNotebookWorkspace = useCallback(() => {
    setActiveUtilityPaneState(lastReaderUtilityPane);
    setLeftReaderMode("scripture");
  }, [lastReaderUtilityPane]);

  const syncCurrentPassage = useCallback(
    (bookSlug: string, chapterNumber: number, view: ReadingView) => {
      setCurrentPassage((current) =>
        current?.bookSlug === bookSlug &&
        current.chapterNumber === chapterNumber &&
        current.view === view
          ? current
          : { bookSlug, chapterNumber, view }
      );
    },
    []
  );

  const syncCurrentChapterData = useCallback(
    (
      bookSlug: string,
      chapterNumber: number,
      chaptersByVersion: Record<BundledBibleVersion, Chapter> | null
    ) => {
      setCurrentChapterByVersion((current) => {
        if (current === chaptersByVersion) {
          return current;
        }

        return chaptersByVersion;
      });
      if (!chaptersByVersion) {
        return;
      }

      setCurrentPassage((current) =>
        current?.bookSlug === bookSlug && current.chapterNumber === chapterNumber
          ? current
          : {
              bookSlug,
              chapterNumber,
              view: "chapter"
            }
      );
      setActiveStudyVerseNumber((current) =>
        current && current > 0 ? current : chaptersByVersion[version].verses[0]?.number ?? null
      );
    },
    [version]
  );

  useEffect(() => {
    try {
      const storedNotebooks = window.localStorage.getItem(PASSAGE_NOTEBOOK_STORAGE_KEY);
      const storedHighlights = window.localStorage.getItem(STUDY_HIGHLIGHTS_STORAGE_KEY);
      const storedBookmarks = window.localStorage.getItem(STUDY_BOOKMARKS_STORAGE_KEY);
      const storedStudySets = window.localStorage.getItem(STUDY_SETS_STORAGE_KEY);
      const storedSermons = window.localStorage.getItem(SERMON_DOCUMENTS_STORAGE_KEY);

      if (storedNotebooks) {
        setNotebooks(normalizePassageNotebookStorage(JSON.parse(storedNotebooks)));
      }

      if (storedHighlights) {
        setHighlights(normalizeHighlightStorage(JSON.parse(storedHighlights)));
      }

      if (storedBookmarks) {
        setBookmarks(normalizeBookmarkStorage(JSON.parse(storedBookmarks)));
      }

      if (storedStudySets) {
        setStudySets(normalizeStudySetStorage(JSON.parse(storedStudySets)));
      }

      if (storedSermons) {
        setSermonDocuments(normalizeSermonDocumentStorage(JSON.parse(storedSermons)));
      }
    } catch {
      window.localStorage.removeItem(PASSAGE_NOTEBOOK_STORAGE_KEY);
      window.localStorage.removeItem(SERMON_DOCUMENTS_STORAGE_KEY);
      window.localStorage.removeItem(STUDY_HIGHLIGHTS_STORAGE_KEY);
      window.localStorage.removeItem(STUDY_BOOKMARKS_STORAGE_KEY);
      window.localStorage.removeItem(STUDY_SETS_STORAGE_KEY);
    } finally {
      setHasLoadedState(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    window.localStorage.setItem(PASSAGE_NOTEBOOK_STORAGE_KEY, JSON.stringify(notebooks));
  }, [hasLoadedState, notebooks]);

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    window.localStorage.setItem(SERMON_DOCUMENTS_STORAGE_KEY, JSON.stringify(sermonDocuments));
  }, [hasLoadedState, sermonDocuments]);

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    window.localStorage.setItem(STUDY_HIGHLIGHTS_STORAGE_KEY, JSON.stringify(highlights));
  }, [hasLoadedState, highlights]);

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    window.localStorage.setItem(STUDY_BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, hasLoadedState]);

  useEffect(() => {
    if (!hasLoadedState) {
      return;
    }

    window.localStorage.setItem(STUDY_SETS_STORAGE_KEY, JSON.stringify(studySets));
  }, [hasLoadedState, studySets]);

  useEffect(() => {
    if (!isReaderRoute) {
      setActiveReaderPane("reading");
      setLeftReaderMode("scripture");
      setActiveUtilityPaneState("search");
      setLastReaderUtilityPane("search");
      setCurrentPassage(null);
      setCurrentChapterByVersion(null);
      setActiveStudyVerseNumber(null);
      setActiveSermonId(null);
    }
  }, [isReaderRoute, pathname]);

  const value = useMemo<ReaderWorkspaceContextValue>(
    () => ({
      activeReaderPane,
      setActiveReaderPane: (tab) => {
        setActiveReaderPane(tab);

        if (tab === "study-sets") {
          setLeftReaderMode("scripture");

          if (activeUtilityPaneState === "notebook") {
            setActiveUtilityPaneState(lastReaderUtilityPane);
          }
        }
      },
      leftReaderMode,
      setLeftReaderMode,
      activeUtilityPane,
      setActiveUtilityPane,
      openNotebook,
      closeNotebookWorkspace,
      openSermons,
      currentPassage,
      currentChapterByVersion,
      syncCurrentPassage,
      syncCurrentChapterData,
      activeStudyVerseNumber,
      setActiveStudyVerseNumber,
      openCrossReferences: (verseNumber = null) => {
        if (verseNumber != null) {
          setActiveStudyVerseNumber(verseNumber);
        }

        setActiveUtilityPane("cross-references");
      },
      openCompare: (verseNumber = null) => {
        if (verseNumber != null) {
          setActiveStudyVerseNumber(verseNumber);
        }

        setActiveUtilityPane("compare");
      },
      compareVersion,
      setCompareVersion: (nextVersion) => {
        setCompareVersionOverride(nextVersion === version ? getAlternateVersion(version) : nextVersion);
      },
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
      insertNotebookDraft: (bookSlug, chapterNumber, text, type = "paragraph") => {
        const trimmedText = text.trim();

        if (!trimmedText) {
          return;
        }

        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });
        const nextBlock = createNotebookBlock(type);

        nextBlock.text = trimmedText;

        setNotebooks((current) => ({
          ...current,
          [notebookId]: {
            ...existing,
            blocks: [...existing.blocks, nextBlock],
            updatedAt: new Date().toISOString()
          }
        }));
      },
      appendNotebookDraft: (bookSlug, chapterNumber, text, blockId) => {
        const trimmedText = text.trim();

        if (!trimmedText) {
          return;
        }

        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });
        const blocks =
          existing.blocks.length > 0 ? [...existing.blocks] : [createNotebookBlock("paragraph")];
        const targetIndex = blockId ? blocks.findIndex((block) => block.id === blockId) : blocks.length - 1;
        const nextIndex = targetIndex >= 0 ? targetIndex : blocks.length - 1;
        const targetBlock = blocks[nextIndex]!;

        blocks[nextIndex] = {
          ...targetBlock,
          text: targetBlock.text.trim() ? `${targetBlock.text.trim()}\n\n${trimmedText}` : trimmedText
        };

        setNotebooks((current) => ({
          ...current,
          [notebookId]: {
            ...existing,
            blocks,
            updatedAt: new Date().toISOString()
          }
        }));
      },
      updateNotebookBlock: (bookSlug, chapterNumber, blockId, updates) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });
        const nextNotebook = {
          ...existing,
          blocks: existing.blocks.map((block) =>
            block.id === blockId
              ? {
                  ...block,
                  ...updates
                }
              : block
          ),
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
        const nextNotebook = {
          ...existing,
          blocks: existing.blocks.filter((block) => block.id !== blockId),
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
      },
      addNotebookReference: (bookSlug, chapterNumber, reference, blockId) => {
        const notebookId = getPassageNotebookId({ version, bookSlug, chapterNumber });
        const existing =
          notebooks[notebookId] ?? createPassageNotebook({ version, bookSlug, chapterNumber });
        const blocks =
          existing.blocks.length > 0 ? [...existing.blocks] : [createNotebookBlock("paragraph")];
        const targetIndex = blockId ? blocks.findIndex((block) => block.id === blockId) : 0;
        const nextBlockIndex = targetIndex >= 0 ? targetIndex : 0;
        const targetBlock = blocks[nextBlockIndex];
        const alreadyExists = targetBlock.references.some((item) => item.id === reference.id);

        blocks[nextBlockIndex] = alreadyExists
          ? targetBlock
          : {
              ...targetBlock,
              references: [...targetBlock.references, reference]
            };

        setNotebooks((current) => ({
          ...current,
          [notebookId]: {
            ...existing,
            blocks,
            updatedAt: new Date().toISOString()
          }
        }));
      },
      getHighlight: (bookSlug, chapterNumber, verseNumber) =>
        highlights[getVerseKey(version, bookSlug, chapterNumber, verseNumber)] ?? null,
      getHighlightsForPassage: (bookSlug, chapterNumber) =>
        Object.values(highlights)
          .filter(
            (highlight) =>
              highlight.version === version &&
              highlight.bookSlug === bookSlug &&
              highlight.chapterNumber === chapterNumber
          )
          .sort((left, right) => left.verseNumber - right.verseNumber),
      cycleHighlight: (bookSlug, chapterNumber, verseNumber) => {
        const key = getVerseKey(version, bookSlug, chapterNumber, verseNumber);
        const current = highlights[key] ?? null;
        const nextColor = cycleHighlightColor(current?.color);

        setHighlights((items) => {
          if (!nextColor) {
            const next = { ...items };
            delete next[key];
            return next;
          }

          return {
            ...items,
            [key]: {
              ...(current ?? createHighlight(version, bookSlug, chapterNumber, verseNumber, nextColor)),
              color: nextColor,
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      updateHighlightLabel: (bookSlug, chapterNumber, verseNumber, label) => {
        const key = getVerseKey(version, bookSlug, chapterNumber, verseNumber);
        const current = highlights[key];

        if (!current) {
          return;
        }

        setHighlights((items) => ({
          ...items,
          [key]: {
            ...current,
            label,
            updatedAt: new Date().toISOString()
          }
        }));
      },
      getBookmark: (bookSlug, chapterNumber, verseNumber) =>
        bookmarks[getBookmarkKey(version, bookSlug, chapterNumber, verseNumber)] ?? null,
      getBookmarksForPassage: (bookSlug, chapterNumber) =>
        Object.values(bookmarks)
          .filter(
            (bookmark) =>
              bookmark.version === version &&
              bookmark.bookSlug === bookSlug &&
              bookmark.chapterNumber === chapterNumber
          )
          .sort((left, right) => (left.verseNumber ?? 0) - (right.verseNumber ?? 0)),
      toggleBookmark: (bookSlug, chapterNumber, verseNumber) => {
        const key = getBookmarkKey(version, bookSlug, chapterNumber, verseNumber);

        setBookmarks((items) => {
          if (items[key]) {
            const next = { ...items };
            delete next[key];
            return next;
          }

          return {
            ...items,
            [key]: createBookmark(version, bookSlug, chapterNumber, verseNumber)
          };
        });
      },
      updateBookmarkLabel: (bookSlug, chapterNumber, verseNumber, label) => {
        const key = getBookmarkKey(version, bookSlug, chapterNumber, verseNumber);
        const current = bookmarks[key];

        if (!current) {
          return;
        }

        setBookmarks((items) => ({
          ...items,
          [key]: {
            ...current,
            label,
            updatedAt: new Date().toISOString()
          }
        }));
      },
      getStudySets: () => getSortedStudySets(studySets),
      saveReferenceToStudySet: (setName, reference) => {
        const trimmedName = setName.trim();

        if (!trimmedName) {
          return null;
        }

        const existingStudySet =
          getSortedStudySets(studySets).find(
            (studySet) => studySet.name.toLowerCase() === trimmedName.toLowerCase()
          ) ?? null;
        const nextStudySet = existingStudySet ?? createStudySet(trimmedName);
        const nextItems = nextStudySet.items.some((item) => item.id === reference.id)
          ? nextStudySet.items
          : [...nextStudySet.items, reference];
        const savedStudySet = {
          ...nextStudySet,
          name: trimmedName,
          items: nextItems,
          updatedAt: new Date().toISOString()
        };

        setStudySets((items) => ({
          ...items,
          [savedStudySet.id]: savedStudySet
        }));

        return savedStudySet;
      },
      removeStudySetItem: (studySetId, itemId) => {
        setStudySets((items) => {
          const studySet = items[studySetId];

          if (!studySet) {
            return items;
          }

          const nextItems = studySet.items.filter((item) => item.id !== itemId);

          if (nextItems.length === 0) {
            const next = { ...items };
            delete next[studySetId];
            return next;
          }

          return {
            ...items,
            [studySetId]: {
              ...studySet,
              items: nextItems,
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      renameStudySet: (studySetId, nextName) => {
        const trimmedName = nextName.trim();

        if (!trimmedName) {
          return;
        }

        setStudySets((items) => {
          const studySet = items[studySetId];

          if (!studySet) {
            return items;
          }

          return {
            ...items,
            [studySetId]: {
              ...studySet,
              name: trimmedName,
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      deleteStudySet: (studySetId) => {
        setStudySets((items) => {
          if (!(studySetId in items)) {
            return items;
          }

          const next = { ...items };
          delete next[studySetId];
          return next;
        });
      },
      saveCurrentPassageToStudySet: (setName) => {
        if (!currentPassage) {
          return null;
        }

        const trimmedName = setName.trim();

        if (!trimmedName) {
          return null;
        }

        const reference = createPassageReference({
          version,
          bookSlug: currentPassage.bookSlug,
          chapterNumber: currentPassage.chapterNumber,
          sourceType: "manual"
        });
        const existingStudySet =
          getSortedStudySets(studySets).find(
            (studySet) => studySet.name.toLowerCase() === trimmedName.toLowerCase()
          ) ?? null;
        const nextStudySet = existingStudySet ?? createStudySet(trimmedName);
        const savedStudySet = {
          ...nextStudySet,
          name: trimmedName,
          items: nextStudySet.items.some((item) => item.id === reference.id)
            ? nextStudySet.items
            : [...nextStudySet.items, reference],
          updatedAt: new Date().toISOString()
        };

        setStudySets((items) => ({
          ...items,
          [savedStudySet.id]: savedStudySet
        }));

        return savedStudySet;
      },
      activeSermonId,
      setActiveSermonId,
      getSermonDocuments: () => getSortedSermons(sermonDocuments),
      getActiveSermon: () => (activeSermonId ? sermonDocuments[activeSermonId] ?? null : null),
      createSermon: (title = "Untitled sermon") => {
        const sermon = createSermonDocument(title);

        setSermonDocuments((current) => ({
          ...current,
          [sermon.id]: sermon
        }));
        setActiveSermonId(sermon.id);
        setActiveUtilityPaneState("sermons");

        return sermon;
      },
      createSermonFromNotebook: () => {
        if (!currentPassage) {
          return null;
        }

        const notebook = notebooks[getPassageNotebookId({
          version,
          bookSlug: currentPassage.bookSlug,
          chapterNumber: currentPassage.chapterNumber
        })] ?? createPassageNotebook({
          version,
          bookSlug: currentPassage.bookSlug,
          chapterNumber: currentPassage.chapterNumber
        });
        const sermon = createSermonDocument(
          notebook.title.trim() || `${currentPassage.bookSlug.replace(/-/g, " ")} ${currentPassage.chapterNumber} sermon`
        );
        const notebookReferences = notebook.blocks.flatMap((block) => block.references);
        const currentReference = createPassageReference({
          version,
          bookSlug: currentPassage.bookSlug,
          chapterNumber: currentPassage.chapterNumber,
          verseNumber: activeStudyVerseNumber ?? undefined,
          sourceType: "manual"
        });
        const references = Array.from(
          new Map(
            [currentReference, ...notebookReferences].map((reference) => [reference.id, reference])
          ).values()
        );
        const sections =
          notebook.blocks.length > 0
            ? notebook.blocks.map((block, index) => ({
                id: createSermonDocumentSection(`Point ${index + 1}`).id,
                title: `Point ${index + 1}`,
                content: block.text.trim()
              }))
            : [createSermonDocumentSection("Main idea")];

        const nextSermon: SermonDocument = {
          ...sermon,
          title: notebook.title.trim() || sermon.title,
          references,
          sections,
          summary: notebook.blocks[0]?.text.trim() || ""
        };

        setSermonDocuments((current) => ({
          ...current,
          [nextSermon.id]: nextSermon
        }));
        setActiveSermonId(nextSermon.id);
        setActiveUtilityPaneState("sermons");

        return nextSermon;
      },
      updateSermonMetadata: (sermonId, updates) => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon) {
            return current;
          }

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      addSermonSection: (sermonId, title = "New section", content = "") => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon) {
            return current;
          }

          const nextSection = createSermonDocumentSection(title);
          nextSection.content = content;

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              sections: [...sermon.sections, nextSection],
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      updateSermonSection: (sermonId, sectionId, updates) => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon) {
            return current;
          }

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              sections: sermon.sections.map((section) =>
                section.id === sectionId ? { ...section, ...updates } : section
              ),
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      deleteSermonSection: (sermonId, sectionId) => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon) {
            return current;
          }

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              sections:
                sermon.sections.filter((section) => section.id !== sectionId).length > 0
                  ? sermon.sections.filter((section) => section.id !== sectionId)
                  : [createSermonDocumentSection("Main idea")],
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      deleteSermon: (sermonId) => {
        setSermonDocuments((current) => {
          if (!(sermonId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[sermonId];
          return next;
        });
        setActiveSermonId((current) => (current === sermonId ? null : current));
      },
      addReferenceToSermon: (sermonId, reference) => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon || sermon.references.some((item) => item.id === reference.id)) {
            return current;
          }

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              references: [...sermon.references, reference],
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      removeReferenceFromSermon: (sermonId, referenceId) => {
        setSermonDocuments((current) => {
          const sermon = current[sermonId];

          if (!sermon) {
            return current;
          }

          return {
            ...current,
            [sermonId]: {
              ...sermon,
              references: sermon.references.filter((reference) => reference.id !== referenceId),
              updatedAt: new Date().toISOString()
            }
          };
        });
      }
    }),
    [
      activeReaderPane,
      activeSermonId,
      activeStudyVerseNumber,
      activeUtilityPane,
      activeUtilityPaneState,
      bookmarks,
      closeNotebookWorkspace,
      compareVersion,
      currentChapterByVersion,
      currentPassage,
      highlights,
      lastReaderUtilityPane,
      leftReaderMode,
      notebooks,
      openNotebook,
      openSermons,
      sermonDocuments,
      syncCurrentChapterData,
      syncCurrentPassage,
      studySets,
      version
    ]
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
