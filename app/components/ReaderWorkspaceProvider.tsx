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
  BundledChapterMap,
  BundledBibleVersion,
  Chapter,
  Highlight,
  NotebookDocument,
  PassageReference,
  ReadingView,
  SermonDocument,
  SermonDocumentSection,
  StudySet
} from "@/lib/bible/types";
import {
  ACTIVE_NOTEBOOK_STORAGE_KEY,
  PASSAGE_NOTEBOOK_STORAGE_KEY,
  createNotebookDocument,
  normalizePassageNotebookStorage,
  type NotebookDocumentStorage
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
import { getInstalledBundledBibleVersions } from "@/lib/bible/version";

type ReaderPane = "reading" | "compare" | "study-sets";
type LeftReaderMode = "scripture" | "search";
type UtilityPane = "search" | "cross-references" | "compare" | "notebook" | "sermons" | "strongs";

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
  openStrongs: (strongsNumber: string | string[], label?: string | null) => void;
  openNotebook: (reference?: PassageReference | null) => void;
  closeNotebookWorkspace: () => void;
  openSermons: () => void;
  currentPassage: CurrentPassage | null;
  currentChapterByVersion: BundledChapterMap | null;
  syncCurrentPassage: (bookSlug: string, chapterNumber: number, view: ReadingView) => void;
  syncCurrentChapterData: (
    bookSlug: string,
    chapterNumber: number,
    chaptersByVersion: BundledChapterMap | null
  ) => void;
  activeStudyVerseNumber: number | null;
  setActiveStudyVerseNumber: (value: number | null) => void;
  openCrossReferences: (verseNumber?: number | null) => void;
  openCompare: (verseNumber?: number | null) => void;
  compareVersions: BundledBibleVersion[];
  setCompareVersions: (values: BundledBibleVersion[]) => void;
  setCompareVersionAtIndex: (index: number, value: BundledBibleVersion) => void;
  getNotebookDocuments: () => NotebookDocument[];
  getActiveNotebook: () => NotebookDocument | null;
  activeNotebookId: string | null;
  setActiveNotebookId: (id: string | null) => void;
  createNotebook: (title?: string) => NotebookDocument;
  updateNotebook: (notebookId: string, updates: Partial<Pick<NotebookDocument, "title" | "content">>) => void;
  deleteNotebook: (notebookId: string) => void;
  addReferenceToNotebook: (notebookId: string, reference: PassageReference) => void;
  pendingNotebookReference: PassageReference | null;
  clearPendingNotebookReference: () => void;
  activeStrongsNumbers: string[];
  activeStrongsLabel: string | null;
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

function getSortedStudySets(studySets: StudySetStorage) {
  return Object.values(studySets).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  );
}

function getSortedNotebooks(documents: NotebookDocumentStorage) {
  return Object.values(documents).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getSortedSermons(documents: SermonDocumentStorage) {
  return Object.values(documents).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function getDefaultCompareVersions(
  primaryVersion: BundledBibleVersion,
  installedVersions: readonly BundledBibleVersion[]
) {
  return installedVersions.filter((candidate) => candidate !== primaryVersion).slice(0, 2);
}

function normalizeCompareVersions(
  primaryVersion: BundledBibleVersion,
  installedVersions: readonly BundledBibleVersion[],
  requestedVersions: readonly BundledBibleVersion[]
) {
  const uniqueSelections: BundledBibleVersion[] = [];

  for (const candidate of requestedVersions) {
    if (
      candidate === primaryVersion ||
      !installedVersions.includes(candidate) ||
      uniqueSelections.includes(candidate)
    ) {
      continue;
    }

    uniqueSelections.push(candidate);
  }

  for (const candidate of getDefaultCompareVersions(primaryVersion, installedVersions)) {
    if (uniqueSelections.length >= Math.max(0, installedVersions.length - 1) || uniqueSelections.length >= 2) {
      break;
    }

    if (!uniqueSelections.includes(candidate)) {
      uniqueSelections.push(candidate);
    }
  }

  return uniqueSelections.slice(0, Math.min(2, Math.max(0, installedVersions.length - 1)));
}

export function ReaderWorkspaceProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { version } = useReaderVersion();
  const [notebooks, setNotebooks] = useState<NotebookDocumentStorage>({});
  const [sermonDocuments, setSermonDocuments] = useState<SermonDocumentStorage>({});
  const [highlights, setHighlights] = useState<HighlightStorage>({});
  const [bookmarks, setBookmarks] = useState<BookmarkStorage>({});
  const [studySets, setStudySets] = useState<StudySetStorage>({});
  const [hasLoadedState, setHasLoadedState] = useState(false);
  const [activeReaderPane, setActiveReaderPane] = useState<ReaderPane>("reading");
  const [leftReaderMode, setLeftReaderMode] = useState<LeftReaderMode>("scripture");
  const [activeUtilityPaneState, setActiveUtilityPaneState] = useState<UtilityPane>("search");
  const [lastReaderUtilityPane, setLastReaderUtilityPane] = useState<UtilityPane>("notebook");
  const [currentPassage, setCurrentPassage] = useState<CurrentPassage | null>(null);
  const [currentChapterByVersion, setCurrentChapterByVersion] = useState<BundledChapterMap | null>(null);
  const [activeStudyVerseNumber, setActiveStudyVerseNumber] = useState<number | null>(null);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [pendingNotebookReference, setPendingNotebookReference] = useState<PassageReference | null>(null);
  const [activeStrongsNumbers, setActiveStrongsNumbers] = useState<string[]>([]);
  const [activeStrongsLabel, setActiveStrongsLabel] = useState<string | null>(null);
  const [activeSermonId, setActiveSermonId] = useState<string | null>(null);
  const [compareVersionOverrides, setCompareVersionOverrides] = useState<BundledBibleVersion[]>([]);
  const isReaderRoute = pathname.startsWith("/read");
  const activeUtilityPane = activeUtilityPaneState;
  const installedBundledVersions = getInstalledBundledBibleVersions();
  const compareVersions = useMemo(
    () => normalizeCompareVersions(version, installedBundledVersions, compareVersionOverrides),
    [compareVersionOverrides, installedBundledVersions, version]
  );

  const setActiveUtilityPane = useCallback((pane: UtilityPane) => {
    setActiveUtilityPaneState(pane);

    if (pane !== "search") {
      setLastReaderUtilityPane(pane);
    }

    setActiveReaderPane("reading");
    setLeftReaderMode("scripture");
  }, []);

  const openNotebook = useCallback((reference: PassageReference | null = null) => {
    setActiveReaderPane("reading");
    setLeftReaderMode("scripture");
    setActiveUtilityPaneState("notebook");
    setLastReaderUtilityPane("notebook");
    setPendingNotebookReference(reference);
  }, []);

  const openStrongs = useCallback((strongsNumber: string | string[], label: string | null = null) => {
    const nextNumbers = Array.isArray(strongsNumber) ? strongsNumber : [strongsNumber];

    setActiveReaderPane("reading");
    setLeftReaderMode("scripture");
    setActiveUtilityPaneState("strongs");
    setLastReaderUtilityPane("strongs");
    setActiveStrongsNumbers(nextNumbers);
    setActiveStrongsLabel(label);
  }, []);

  const openSermons = useCallback(() => {
    setActiveReaderPane("reading");
    setLeftReaderMode("scripture");
    setActiveUtilityPaneState("sermons");
    setLastReaderUtilityPane("sermons");
  }, []);

  const closeNotebookWorkspace = useCallback(() => {
    setActiveUtilityPaneState(lastReaderUtilityPane);
    setLeftReaderMode("scripture");
    setPendingNotebookReference(null);
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
      chaptersByVersion: BundledChapterMap | null
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
        current && current > 0
          ? current
          : chaptersByVersion[version]?.verses[0]?.number ??
            Object.values(chaptersByVersion)[0]?.verses[0]?.number ??
            null
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
      const storedActiveNotebookId = window.localStorage.getItem(ACTIVE_NOTEBOOK_STORAGE_KEY);

      if (storedNotebooks) {
        const normalizedNotebooks = normalizePassageNotebookStorage(JSON.parse(storedNotebooks));

        setNotebooks(normalizedNotebooks);
        if (storedActiveNotebookId && normalizedNotebooks[storedActiveNotebookId]) {
          setActiveNotebookId(storedActiveNotebookId);
        }
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
      window.localStorage.removeItem(ACTIVE_NOTEBOOK_STORAGE_KEY);
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

    if (activeNotebookId) {
      window.localStorage.setItem(ACTIVE_NOTEBOOK_STORAGE_KEY, activeNotebookId);
      return;
    }

    window.localStorage.removeItem(ACTIVE_NOTEBOOK_STORAGE_KEY);
  }, [activeNotebookId, hasLoadedState]);

  useEffect(() => {
    const sortedNotebooks = getSortedNotebooks(notebooks);

    if (sortedNotebooks.length === 0) {
      if (activeNotebookId !== null) {
        setActiveNotebookId(null);
      }
      return;
    }

    if (!activeNotebookId || !notebooks[activeNotebookId]) {
      setActiveNotebookId(sortedNotebooks[0]?.id ?? null);
    }
  }, [activeNotebookId, notebooks]);

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
      setPendingNotebookReference(null);
      setActiveStrongsNumbers([]);
      setActiveStrongsLabel(null);
      setActiveSermonId(null);
    }
  }, [isReaderRoute, pathname]);

  const value = useMemo<ReaderWorkspaceContextValue>(
    () => ({
      activeReaderPane,
      setActiveReaderPane: (tab) => {
        setActiveReaderPane(tab);

        if (tab === "compare" || tab === "study-sets") {
          setLeftReaderMode("scripture");
        }

        if (tab !== "reading" && activeUtilityPaneState === "notebook") {
          setActiveUtilityPaneState(lastReaderUtilityPane);
        }
      },
      leftReaderMode,
      setLeftReaderMode,
      activeUtilityPane,
      setActiveUtilityPane,
      openStrongs,
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

        setActiveReaderPane("compare");
        setLeftReaderMode("scripture");
      },
      compareVersions,
      setCompareVersions: (nextVersions) => {
        setCompareVersionOverrides(nextVersions);
      },
      setCompareVersionAtIndex: (index, nextVersion) => {
        setCompareVersionOverrides((current) => {
          const next = current.slice(0, 2);
          next[index] = nextVersion;
          return next;
        });
      },
      getNotebookDocuments: () => getSortedNotebooks(notebooks),
      getActiveNotebook: () =>
        activeNotebookId && notebooks[activeNotebookId]
          ? notebooks[activeNotebookId]
          : getSortedNotebooks(notebooks)[0] ?? null,
      activeNotebookId,
      setActiveNotebookId,
      createNotebook: (title = "") => {
        const notebook = createNotebookDocument(title);

        setNotebooks((current) => ({
          ...current,
          [notebook.id]: notebook
        }));
        setActiveNotebookId(notebook.id);

        return notebook;
      },
      updateNotebook: (notebookId, updates) => {
        setNotebooks((current) => {
          const notebook = current[notebookId];

          if (!notebook) {
            return current;
          }

          return {
            ...current,
            [notebookId]: {
              ...notebook,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      deleteNotebook: (notebookId) => {
        setNotebooks((current) => {
          if (!(notebookId in current)) {
            return current;
          }

          const next = { ...current };
          delete next[notebookId];
          return next;
        });
        setActiveNotebookId((current) => (current === notebookId ? null : current));
      },
      addReferenceToNotebook: (notebookId, reference) => {
        setNotebooks((current) => {
          const notebook = current[notebookId];

          if (!notebook || notebook.references.some((item) => item.id === reference.id)) {
            return current;
          }

          return {
            ...current,
            [notebookId]: {
              ...notebook,
              references: [...notebook.references, reference],
              updatedAt: new Date().toISOString()
            }
          };
        });
      },
      pendingNotebookReference,
      clearPendingNotebookReference: () => setPendingNotebookReference(null),
      activeStrongsNumbers,
      activeStrongsLabel,
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
        const notebook =
          (activeNotebookId ? notebooks[activeNotebookId] ?? null : null) ??
          getSortedNotebooks(notebooks)[0] ??
          null;

        if (!notebook) {
          return null;
        }
        const sermon = createSermonDocument(
          notebook.title.trim() || "Notebook sermon"
        );
        const references = Array.from(
          new Map(
            notebook.references.map((reference) => [reference.id, reference])
          ).values()
        );
        const mainSection = createSermonDocumentSection("Main idea");
        mainSection.content = notebook.content.trim();
        const sections = notebook.content.trim() ? [mainSection] : [createSermonDocumentSection("Main idea")];

        const nextSermon: SermonDocument = {
          ...sermon,
          title: notebook.title.trim() || sermon.title,
          references,
          sections,
          summary:
            notebook.content
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) ?? ""
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
      activeNotebookId,
      activeSermonId,
      activeStrongsLabel,
      activeStrongsNumbers,
      activeStudyVerseNumber,
      activeUtilityPane,
      activeUtilityPaneState,
      bookmarks,
      closeNotebookWorkspace,
      compareVersions,
      currentChapterByVersion,
      currentPassage,
      highlights,
      lastReaderUtilityPane,
      leftReaderMode,
      notebooks,
      openStrongs,
      openNotebook,
      openSermons,
      pendingNotebookReference,
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
