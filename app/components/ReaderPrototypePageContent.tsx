"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderCopyButton } from "@/app/components/ReaderCopyButton";
import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderGrammarChartsPanel } from "@/app/components/ReaderGrammarChartsPanel";
import { ReaderGreekGrammarPanel } from "@/app/components/ReaderGreekGrammarPanel";
import { ReaderHarmonyPanel } from "@/app/components/ReaderHarmonyPanel";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderOtComparePanel } from "@/app/components/ReaderOtComparePanel";
import { ReaderPrototypeWordStudyPanel } from "@/app/components/ReaderPrototypeWordStudyPanel";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { VerseList } from "@/app/components/VerseList";
import {
  BIBLE_BOOK_ORDER_STORAGE_KEY,
  getBooksForOrderMode,
  normalizeBibleBookOrderMode,
  type BibleBookOrderMode
} from "@/lib/bible/book-order";
import type {
  BookMeta,
  BundledBibleVersion,
  BundledChapterMap,
  Chapter,
  EsvInterlinearDisplayChapter
} from "@/lib/bible/types";
import { getGreekTokenOccurrenceKey } from "@/lib/bible/greek";
import { getAlternateBundledVersions, getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";
import { createPassageReference } from "@/lib/study-workspace";

type ReaderPrototypePageContentProps = {
  book: BookMeta;
  books: BookMeta[];
  chapter: Chapter;
  chaptersByVersion: BundledChapterMap;
  currentChapter: number;
  esvInterlinearChapter?: EsvInterlinearDisplayChapter | null;
  installedVersions: readonly BundledBibleVersion[];
  masoreticChapter?: Chapter | null;
  selectedVersion: BundledBibleVersion;
};

function getPrototypeHref(
  bookSlug: string,
  chapterNumber: number,
  version: BundledBibleVersion
) {
  const searchParams = new URLSearchParams({ version });
  return `/prototype/reader/${bookSlug}/${chapterNumber}?${searchParams.toString()}`;
}

function getPreviousChapter(books: BookMeta[], book: BookMeta, chapterNumber: number) {
  if (chapterNumber > 1) {
    return {
      bookSlug: book.slug,
      chapterNumber: chapterNumber - 1,
      label: "Prev Chapter"
    };
  }

  const currentBookIndex = books.findIndex((candidateBook) => candidateBook.slug === book.slug);
  const previousBook = currentBookIndex > 0 ? books[currentBookIndex - 1] : null;

  return previousBook
    ? {
        bookSlug: previousBook.slug,
        chapterNumber: previousBook.chapterCount,
        label: "Prev Chapter"
      }
    : null;
}

function getNextChapter(books: BookMeta[], book: BookMeta, chapterNumber: number) {
  if (chapterNumber < book.chapterCount) {
    return {
      bookSlug: book.slug,
      chapterNumber: chapterNumber + 1,
      label: "Next Chapter"
    };
  }

  const currentBookIndex = books.findIndex((candidateBook) => candidateBook.slug === book.slug);
  const nextBook = currentBookIndex >= 0 ? books[currentBookIndex + 1] : null;

  return nextBook
    ? {
        bookSlug: nextBook.slug,
        chapterNumber: 1,
        label: "Next Chapter"
      }
    : null;
}

function getDefaultGreekToken(chapter: Chapter | null) {
  const tokens =
    chapter?.verses.flatMap((verse) =>
      (verse.greekTokens ?? []).map((token, tokenIndex) => ({
        token,
        verseNumber: verse.number,
        tokenIndex
      }))
    ) ?? [];

  return (
    tokens.find(({ token }) => token.strongs === "G2316" || token.entryKey === "G2316") ??
    tokens[0] ??
    null
  );
}

async function copyPlainText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard is unavailable.");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export function ReaderPrototypePageContent({
  book,
  books,
  chapter: initialChapter,
  chaptersByVersion,
  currentChapter,
  esvInterlinearChapter = null,
  installedVersions,
  masoreticChapter = null,
  selectedVersion
}: ReaderPrototypePageContentProps) {
  const router = useRouter();
  const { setIsPanelOpen, settings, updateSettings } = useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
  const {
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    getBookmark,
    isGreekLearningMode,
    openCompare,
    openCrossReferences,
    openGreekDictionary,
    openNotebook,
    openOtCompare,
    openSermons,
    setActiveReaderPane,
    setActiveStudyVerseNumber,
    setActiveUtilityPane,
    setIsGreekLearningMode,
    syncCurrentChapterData,
    syncCurrentPassage,
    toggleBookmark
  } = useReaderWorkspace();
  const [bookOrderMode, setBookOrderMode] = useState<BibleBookOrderMode>("chronological-old-testament");
  const [annotationMode, setAnnotationMode] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const readingSurfaceRef = useRef<HTMLDivElement | null>(null);
  const initializedPassageRef = useRef<string | null>(null);
  const orderedBooks = useMemo(
    () => getBooksForOrderMode(books, bookOrderMode),
    [bookOrderMode, books]
  );
  const fallbackVersion =
    (Object.entries(chaptersByVersion).find(([, candidateChapter]) => Boolean(candidateChapter))?.[0] as
      | BundledBibleVersion
      | undefined) ?? selectedVersion;
  const effectiveVersion = chaptersByVersion[version] ? version : fallbackVersion;
  const chapter = chaptersByVersion[effectiveVersion] ?? initialChapter;
  const greekChapter = chaptersByVersion.greek ?? null;
  const isStandaloneGreekVersion = effectiveVersion === "greek" || effectiveVersion === "tr";
  const isOldTestament = book.testament === "Old";
  const showStrongs = effectiveVersion === "kjv" && settings.showStrongs;
  const showVerseStrongs = settings.showVerseStrongs;
  const showEsvInterlinear =
    effectiveVersion === "esv" &&
    book.testament === "New" &&
    settings.showEsvInterlinear &&
    esvInterlinearChapter !== null;
  const showKjvGreekCompanion =
    effectiveVersion === "kjv" &&
    book.testament === "New" &&
    settings.showStrongs &&
    esvInterlinearChapter !== null;
  const availableSecondaryVersions = Object.entries(chaptersByVersion)
    .filter(([, candidateChapter]) => Boolean(candidateChapter))
    .map(([candidateVersion]) => candidateVersion as BundledBibleVersion);
  const secondaryVerseVersions = settings.showSecondaryVerseTranslation
    ? getAlternateBundledVersions(
        effectiveVersion,
        settings.secondaryVerseTranslationVersions,
        availableSecondaryVersions,
        settings.secondaryVerseTranslationVersion
      )
    : [];
  const secondaryVersesByVersion = Object.fromEntries(
    secondaryVerseVersions.map((secondaryVerseVersion) => [
      secondaryVerseVersion,
      Object.fromEntries(
        (chaptersByVersion[secondaryVerseVersion]?.verses ?? []).map((verse) => [verse.number, verse])
      )
    ])
  ) as Partial<Record<BundledBibleVersion, Record<number, Chapter["verses"][number]>>>;
  const interlinearVerseMap =
    (showEsvInterlinear || showKjvGreekCompanion) && esvInterlinearChapter
      ? Object.fromEntries(esvInterlinearChapter.verses.map((verse) => [verse.number, verse]))
      : undefined;
  const previousChapter = getPreviousChapter(books, book, currentChapter);
  const nextChapter = getNextChapter(books, book, currentChapter);
  const defaultGreekToken = useMemo(() => getDefaultGreekToken(greekChapter), [greekChapter]);
  const hasGreekLearningSurface =
    isStandaloneGreekVersion
      ? chapter.verses.some((verse) => Boolean(verse.greekTokens?.length))
      : showEsvInterlinear &&
        chapter.verses.some((verse) => Boolean(interlinearVerseMap?.[verse.number]?.tokens?.length));
  const hasBibleGreekAnnotationSurface =
    (isStandaloneGreekVersion &&
      chapter.verses.some(
        (verse) => Boolean(verse.greekTokens?.length) && Boolean(verse.translationText?.trim())
      )) ||
    (showEsvInterlinear &&
      chapter.verses.some((verse) => Boolean(interlinearVerseMap?.[verse.number]?.tokens?.length)));
  const isBookmarked = Boolean(getBookmark(book.slug, chapter.chapterNumber));

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setBookOrderMode(
      normalizeBibleBookOrderMode(window.localStorage.getItem(BIBLE_BOOK_ORDER_STORAGE_KEY))
    );
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BIBLE_BOOK_ORDER_STORAGE_KEY, bookOrderMode);
    }
  }, [bookOrderMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const urlVersion = new URLSearchParams(window.location.search).get("version");

    if (!urlVersion && version !== selectedVersion) {
      setVersion(selectedVersion);
    }
  }, [selectedVersion, setVersion, version]);

  useEffect(() => {
    if (effectiveVersion !== version) {
      setVersion(effectiveVersion);
    }
  }, [effectiveVersion, setVersion, version]);

  useEffect(() => {
    syncCurrentPassage(book.slug, chapter.chapterNumber, "chapter");
    syncCurrentChapterData(book.slug, chapter.chapterNumber, chaptersByVersion);
    setActiveStudyVerseNumber(chapter.verses[0]?.number ?? null);
  }, [
    book.slug,
    chapter.chapterNumber,
    chapter.verses,
    chaptersByVersion,
    setActiveStudyVerseNumber,
    syncCurrentChapterData,
    syncCurrentPassage
  ]);

  useEffect(() => {
    if (!isOldTestament && activeReaderPane === "ot-compare") {
      setActiveReaderPane("reading");
    }
  }, [activeReaderPane, isOldTestament, setActiveReaderPane]);

  useEffect(() => {
    if (!hasBibleGreekAnnotationSurface && annotationMode) {
      setAnnotationMode(false);
    }
  }, [annotationMode, hasBibleGreekAnnotationSurface]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [book.slug, chapter.chapterNumber, clearGreekLearningQuiz, effectiveVersion]);

  useEffect(() => {
    const passageKey = `${book.slug}:${chapter.chapterNumber}`;

    if (initializedPassageRef.current === passageKey || !defaultGreekToken) {
      return;
    }

    initializedPassageRef.current = passageKey;
    const { token, verseNumber, tokenIndex } = defaultGreekToken;
    const entryKey = token.entryKey ?? token.strongs ?? token.lemma;

    openGreekDictionary({
      entryKey,
      strongs: token.strongs ?? null,
      lemma: token.lemma,
      label: token.lemma,
      occurrenceKey:
        token.occurrenceKey ?? getGreekTokenOccurrenceKey(book.slug, chapter.chapterNumber, verseNumber, tokenIndex),
      selectedForm: token.surface,
      selectedFormMorphology: token.morphology ?? null,
      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
      matchedQuery: token.surface,
      transliteration: token.transliteration ?? null,
      gloss: token.gloss ?? null
    });
  }, [book.slug, chapter.chapterNumber, defaultGreekToken, openGreekDictionary]);

  const navigateTo = (
    nextBookSlug: string,
    nextChapterNumber: number,
    nextVersion: BundledBibleVersion = effectiveVersion
  ) => {
    router.push(getPrototypeHref(nextBookSlug, nextChapterNumber, nextVersion));
  };

  const handleCopy = async () => {
    const text =
      typeof readingSurfaceRef.current?.innerText === "string" &&
      readingSurfaceRef.current.innerText.trim().length > 0
        ? readingSurfaceRef.current.innerText
        : readingSurfaceRef.current?.textContent ?? "";

    try {
      await copyPlainText(text.trim());
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  };

  const handleTranslate = () => {
    if (isStandaloneGreekVersion) {
      updateSettings({
        showCompanionVerseTranslation: !settings.showCompanionVerseTranslation
      });
      return;
    }

    updateSettings({
      showSecondaryVerseTranslation: !settings.showSecondaryVerseTranslation
    });
  };

  const handleNote = () => {
    openNotebook(
      createPassageReference({
        version: effectiveVersion,
        bookSlug: book.slug,
        chapterNumber: chapter.chapterNumber,
        label: `${book.name} ${chapter.chapterNumber}`,
        sourceType: "manual"
      })
    );
  };

  const readerTools = (
    <>
      {hasBibleGreekAnnotationSurface ? (
        <button
          className={`reader-inline-button reader-settings-link${annotationMode ? " is-active" : ""}`}
          onClick={() => setAnnotationMode((current) => !current)}
          type="button"
        >
          {annotationMode ? "Done annotating" : "Annotate Greek"}
        </button>
      ) : null}
      {hasGreekLearningSurface ? (
        <button
          className={`reader-inline-button reader-settings-link${isGreekLearningMode ? " is-active" : ""}`}
          onClick={() => setIsGreekLearningMode(!isGreekLearningMode)}
          type="button"
        >
          {isGreekLearningMode ? "Stop Learning" : "Learn Greek"}
        </button>
      ) : null}
      <ReaderCopyButton targetRef={readingSurfaceRef} />
    </>
  );

  const renderReaderSurface = () => {
    if (activeReaderPane === "study-sets") {
      return <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={chapter.chapterNumber} />;
    }

    if (activeReaderPane === "harmony") {
      return <ReaderHarmonyPanel />;
    }

    if (activeReaderPane === "compare") {
      return <ReaderComparePanel book={book} chaptersByVersion={chaptersByVersion} view="chapter" />;
    }

    if (activeReaderPane === "ot-compare") {
      return (
        <ReaderOtComparePanel
          book={book}
          focusedChapterNumber={chapter.chapterNumber}
          greekChapters={chaptersByVersion.greek ? [chaptersByVersion.greek] : null}
          masoreticChapters={masoreticChapter ? [masoreticChapter] : null}
          view="chapter"
        />
      );
    }

    return (
      <VerseList
        annotationMode={annotationMode}
        bookSlug={book.slug}
        chapterNumber={chapter.chapterNumber}
        interlinearVerseMap={interlinearVerseMap}
        key={`${effectiveVersion}:${book.slug}:${chapter.chapterNumber}`}
        secondaryVerseVersions={secondaryVerseVersions}
        secondaryVersesByVersion={secondaryVersesByVersion}
        showAnnotatedGreekUndertext={settings.showAnnotatedGreekUndertext}
        showCompanionVerseTranslation={settings.showCompanionVerseTranslation}
        showCustomVerseTranslation={settings.showCustomVerseTranslation}
        showExpandedGreekGrammarCards={settings.showExpandedGreekGrammarCards}
        showGreekGloss={settings.showGreekGloss}
        showGreekGrammarCards={settings.showGreekGrammarCards}
        showGreekLemma={settings.showGreekLemma}
        showGreekSurface={settings.showGreekSurface}
        showGreekTransliteration={settings.showGreekTransliteration}
        showSecondaryVerseTranslation={settings.showSecondaryVerseTranslation}
        showStrongs={showStrongs}
        showVerseNumbers={settings.showVerseNumbers}
        showVerseStrongs={showVerseStrongs}
        showVerseText={settings.showVerseText}
        verses={chapter.verses}
      />
    );
  };

  const renderUtilityPanel = () => {
    if (activeUtilityPane === "notebook") {
      return <ReaderNotebookEditor />;
    }

    if (activeUtilityPane === "cross-references") {
      return <ReaderCrossReferencesPanel />;
    }

    if (activeUtilityPane === "grammar") {
      return <ReaderGreekGrammarPanel />;
    }

    if (activeUtilityPane === "charts") {
      return <ReaderGrammarChartsPanel />;
    }

    if (activeUtilityPane === "sermons") {
      return <ReaderSermonWorkspace />;
    }

    if (activeUtilityPane === "harmony") {
      return <ReaderHarmonyWorkspace />;
    }

    if (activeUtilityPane === "compare") {
      return <ReaderComparePanel book={book} chaptersByVersion={chaptersByVersion} view="chapter" />;
    }

    return <ReaderPrototypeWordStudyPanel />;
  };

  return (
    <ReaderCustomizationShell className="reader-prototype-shell reader-customizable-shell">
      <ReadingSessionSync
        book={book.slug}
        chapter={chapter.chapterNumber}
        version={effectiveVersion}
        view="chapter"
      />
      <ReaderSettingsPanel
        book={book}
        currentChapter={chapter.chapterNumber}
        readerTools={readerTools}
        view="chapter"
      />
      <div className="reader-prototype-topbar">
        <div>
          <p className="reader-prototype-kicker">{getBibleVersionBadge(effectiveVersion)}</p>
          <h1>
            {book.name} {chapter.chapterNumber}
          </h1>
          <p>{book.testament === "New" ? "New Testament reading prototype" : "Old Testament reading prototype"}</p>
        </div>
        <div className="reader-prototype-controls" aria-label="Prototype passage controls">
          <label className="sr-only" htmlFor="reader-prototype-book-order">
            Book order
          </label>
          <select
            id="reader-prototype-book-order"
            value={bookOrderMode}
            onChange={(event) =>
              setBookOrderMode(
                event.target.value === "chronological-old-testament" ||
                  event.target.value === "chronological-new-testament"
                  ? event.target.value
                  : "canonical"
              )
            }
          >
            <option value="canonical">Canonical</option>
            <option value="chronological-old-testament">Chronological OT</option>
            <option value="chronological-new-testament">Chronological NT</option>
          </select>
          <label className="sr-only" htmlFor="reader-prototype-book">
            Book
          </label>
          <select
            id="reader-prototype-book"
            value={book.slug}
            onChange={(event) => {
              const nextBook = books.find((candidateBook) => candidateBook.slug === event.target.value);
              navigateTo(event.target.value, Math.min(chapter.chapterNumber, nextBook?.chapterCount ?? 1));
            }}
          >
            {orderedBooks.map((candidateBook) => (
              <option key={candidateBook.slug} value={candidateBook.slug}>
                {candidateBook.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="reader-prototype-chapter">
            Chapter
          </label>
          <select
            id="reader-prototype-chapter"
            value={String(chapter.chapterNumber)}
            onChange={(event) => navigateTo(book.slug, Number(event.target.value))}
          >
            {Array.from({ length: book.chapterCount }, (_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                Chapter {index + 1}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="reader-prototype-version">
            Version
          </label>
          <select
            id="reader-prototype-version"
            value={effectiveVersion}
            onChange={(event) => {
              const nextVersion = event.target.value as BundledBibleVersion;
              setVersion(nextVersion);
              navigateTo(book.slug, chapter.chapterNumber, nextVersion);
            }}
          >
            {installedVersions.map((installedVersion) => (
              <option key={installedVersion} value={installedVersion}>
                {getBibleVersionLabel(installedVersion)}
              </option>
            ))}
          </select>
          <button
            className="reader-prototype-bottom-button"
            onClick={() => setIsPanelOpen(true)}
            type="button"
          >
            Menu
          </button>
        </div>
      </div>

      <div className="reader-prototype-layout">
        <main className="reader-prototype-reading-card" aria-label="Prototype reader">
          <div className="reader-prototype-reader-tools" aria-label="Prototype reader tools">
            <button
              className={`reader-prototype-tool-button${activeReaderPane === "reading" ? " is-active" : ""}`}
              onClick={() => setActiveReaderPane("reading")}
              type="button"
            >
              Read
            </button>
            <button
              className={`reader-prototype-tool-button${activeReaderPane === "compare" ? " is-active" : ""}`}
              onClick={() => openCompare()}
              type="button"
            >
              Compare
            </button>
            <button
              className={`reader-prototype-tool-button${activeReaderPane === "harmony" ? " is-active" : ""}`}
              onClick={() => setActiveReaderPane("harmony")}
              type="button"
            >
              Harmony
            </button>
            <button
              className={`reader-prototype-tool-button${activeReaderPane === "study-sets" ? " is-active" : ""}`}
              onClick={() => setActiveReaderPane("study-sets")}
              type="button"
            >
              Study Sets
            </button>
            {isOldTestament ? (
              <button
                className={`reader-prototype-tool-button${activeReaderPane === "ot-compare" ? " is-active" : ""}`}
                onClick={() => openOtCompare()}
                type="button"
              >
                OT Compare
              </button>
            ) : null}
          </div>
          <div className="reader-prototype-chapter-heading">
            <span>{chapter.chapterNumber}</span>
            <h2>{activeReaderPane === "reading" ? "Scripture" : activeReaderPane.replace("-", " ")}</h2>
          </div>
          <div className="reader-prototype-reading-surface" ref={readingSurfaceRef}>
            {renderReaderSurface()}
          </div>
        </main>
        <aside className="reader-prototype-study-panel" aria-label="Prototype word study">
          <div className="reader-prototype-study-tabs" aria-label="Prototype study tools">
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "strongs" || activeUtilityPane === "search" ? " is-active" : ""}`}
              onClick={() => setActiveUtilityPane("strongs")}
              type="button"
            >
              Word Study
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "grammar" ? " is-active" : ""}`}
              onClick={() => setActiveUtilityPane("grammar")}
              type="button"
            >
              Grammar
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "cross-references" ? " is-active" : ""}`}
              onClick={() => openCrossReferences()}
              type="button"
            >
              Cross Refs
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "notebook" ? " is-active" : ""}`}
              onClick={handleNote}
              type="button"
            >
              Notes
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "sermons" ? " is-active" : ""}`}
              onClick={() => openSermons()}
              type="button"
            >
              Sermons
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "harmony" ? " is-active" : ""}`}
              onClick={() => setActiveUtilityPane("harmony")}
              type="button"
            >
              Harmony
            </button>
            <button
              className={`reader-prototype-study-tab${activeUtilityPane === "charts" ? " is-active" : ""}`}
              onClick={() => setActiveUtilityPane("charts")}
              type="button"
            >
              Charts
            </button>
          </div>
          <div className="reader-prototype-study-body">{renderUtilityPanel()}</div>
        </aside>
      </div>

      <div className="reader-prototype-bottom-dock" aria-label="Prototype chapter actions">
        {previousChapter ? (
          <button
            className="reader-prototype-bottom-button"
            onClick={() => navigateTo(previousChapter.bookSlug, previousChapter.chapterNumber)}
            type="button"
          >
            ‹ {previousChapter.label}
          </button>
        ) : (
          <span />
        )}
        <div className="reader-prototype-bottom-actions">
          <button className="reader-prototype-bottom-button" onClick={() => openCompare()} type="button">
            Parallel
          </button>
          <button
            className={`reader-prototype-bottom-button${settings.showCompanionVerseTranslation || settings.showSecondaryVerseTranslation ? " is-active" : ""}`}
            onClick={handleTranslate}
            type="button"
          >
            Translate
          </button>
          <button className="reader-prototype-bottom-button" onClick={() => void handleCopy()} type="button">
            {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy Failed" : "Copy"}
          </button>
          <button
            className={`reader-prototype-bottom-button${isBookmarked ? " is-active" : ""}`}
            onClick={() => toggleBookmark(book.slug, chapter.chapterNumber)}
            type="button"
          >
            Bookmark
          </button>
          <button className="reader-prototype-bottom-button" onClick={handleNote} type="button">
            Note
          </button>
        </div>
        {nextChapter ? (
          <button
            className="reader-prototype-bottom-button"
            onClick={() => navigateTo(nextChapter.bookSlug, nextChapter.chapterNumber)}
            type="button"
          >
            {nextChapter.label} ›
          </button>
        ) : (
          <span />
        )}
      </div>
    </ReaderCustomizationShell>
  );
}
