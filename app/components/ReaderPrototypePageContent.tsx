"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderPrototypeWordStudyPanel } from "@/app/components/ReaderPrototypeWordStudyPanel";
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
  GreekToken
} from "@/lib/bible/types";
import { getBibleVersionLabel, getBibleVersionBadge } from "@/lib/bible/version";

type ReaderPrototypePageContentProps = {
  book: BookMeta;
  books: BookMeta[];
  chapter: Chapter;
  chaptersByVersion: BundledChapterMap;
  currentChapter: number;
  installedVersions: readonly BundledBibleVersion[];
  selectedVersion: BundledBibleVersion;
};

function getShortGloss(gloss?: string | null) {
  if (!gloss) {
    return "";
  }

  return gloss
    .replace(/\([^)]*\)/g, " ")
    .split(/[;,/]/)[0]
    ?.replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join(" ") ?? "";
}

function getPrototypeHref(
  bookSlug: string,
  chapterNumber: number,
  version: BundledBibleVersion
) {
  const searchParams = new URLSearchParams({
    book: bookSlug,
    chapter: String(chapterNumber),
    version
  });

  return `/prototype/reader?${searchParams.toString()}`;
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

function getDefaultGreekToken(chapter: Chapter) {
  const tokens = chapter.verses.flatMap((verse) =>
    (verse.greekTokens ?? []).map((token, tokenIndex) => ({
      token,
      verseNumber: verse.number,
      tokenIndex
    }))
  );

  return (
    tokens.find(({ token }) => token.strongs === "G2316" || token.entryKey === "G2316") ??
    tokens[0] ??
    null
  );
}

export function ReaderPrototypePageContent({
  book,
  books,
  chapter,
  chaptersByVersion,
  currentChapter,
  installedVersions,
  selectedVersion
}: ReaderPrototypePageContentProps) {
  const router = useRouter();
  const { setVersion } = useReaderVersion();
  const {
    activeGreekSelection,
    openGreekDictionary,
    syncCurrentChapterData,
    syncCurrentPassage
  } = useReaderWorkspace();
  const [bookOrderMode, setBookOrderMode] = useState<BibleBookOrderMode>("chronological-old-testament");
  const initializedPassageRef = useRef<string | null>(null);
  const orderedBooks = useMemo(
    () => getBooksForOrderMode(books, bookOrderMode),
    [bookOrderMode, books]
  );
  const greekChapter = chaptersByVersion.greek ?? chapter;
  const previousChapter = getPreviousChapter(books, book, currentChapter);
  const nextChapter = getNextChapter(books, book, currentChapter);
  const defaultGreekToken = useMemo(() => getDefaultGreekToken(greekChapter), [greekChapter]);
  const prototypeActions = ["Parallel", "Translate", "Copy", "Bookmark", "Note"];

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
    setVersion(selectedVersion);
    syncCurrentPassage(book.slug, currentChapter, "chapter");
    syncCurrentChapterData(book.slug, currentChapter, chaptersByVersion);
  }, [
    book.slug,
    chaptersByVersion,
    currentChapter,
    selectedVersion,
    setVersion,
    syncCurrentChapterData,
    syncCurrentPassage
  ]);

  useEffect(() => {
    const passageKey = `${book.slug}:${currentChapter}:${selectedVersion}`;

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
      occurrenceKey: token.occurrenceKey ?? `prototype:${book.slug}:${currentChapter}:${verseNumber}:${tokenIndex}`,
      selectedForm: token.surface,
      selectedFormMorphology: token.morphology ?? null,
      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
      matchedQuery: token.surface,
      transliteration: token.transliteration ?? null,
      gloss: token.gloss ?? null
    });
  }, [book.slug, currentChapter, defaultGreekToken, openGreekDictionary, selectedVersion]);

  const navigateTo = (
    nextBookSlug: string,
    nextChapterNumber: number,
    nextVersion: BundledBibleVersion = selectedVersion
  ) => {
    router.push(getPrototypeHref(nextBookSlug, nextChapterNumber, nextVersion));
  };

  const handleGreekTokenClick = (token: GreekToken, verseNumber: number, tokenIndex: number) => {
    const entryKey = token.entryKey ?? token.strongs ?? token.lemma;

    openGreekDictionary({
      entryKey,
      strongs: token.strongs ?? null,
      lemma: token.lemma,
      label: token.lemma,
      occurrenceKey: token.occurrenceKey ?? `prototype:${book.slug}:${currentChapter}:${verseNumber}:${tokenIndex}`,
      selectedForm: token.surface,
      selectedFormMorphology: token.morphology ?? null,
      selectedFormDecodedMorphology: token.decodedMorphology ?? null,
      matchedQuery: token.surface,
      transliteration: token.transliteration ?? null,
      gloss: token.gloss ?? null
    });
  };

  return (
    <div className="reader-prototype-shell">
      <div className="reader-prototype-topbar">
        <div>
          <p className="reader-prototype-kicker">{getBibleVersionBadge(selectedVersion)}</p>
          <h1>
            {book.name} {currentChapter}
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
              navigateTo(event.target.value, Math.min(currentChapter, nextBook?.chapterCount ?? 1));
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
            value={String(currentChapter)}
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
            value={selectedVersion}
            onChange={(event) =>
              navigateTo(book.slug, currentChapter, event.target.value as BundledBibleVersion)
            }
          >
            {installedVersions.map((version) => (
              <option key={version} value={version}>
                {getBibleVersionLabel(version)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="reader-prototype-layout">
        <main className="reader-prototype-reading-card" aria-label="Prototype reader">
          <div className="reader-prototype-chapter-heading">
            <span>{currentChapter}</span>
            <h2>Greeting</h2>
          </div>
          <div className="reader-prototype-verses">
            {chapter.verses.map((verse) => {
              const greekVerse =
                greekChapter.verses.find((candidateVerse) => candidateVerse.number === verse.number) ??
                verse;
              const greekTokens = greekVerse.greekTokens ?? [];

              return (
                <article className="reader-prototype-verse" key={verse.number}>
                  <span className="reader-prototype-verse-number">{verse.number}</span>
                  <div className="reader-prototype-verse-body">
                    {greekTokens.length > 0 ? (
                      <div className="reader-prototype-greek-line" lang="el">
                        {greekTokens.map((token, tokenIndex) => {
                          const entryKey = token.entryKey ?? token.strongs ?? token.lemma;
                          const isActive =
                            activeGreekSelection &&
                            (activeGreekSelection.entryKey === entryKey ||
                              activeGreekSelection.strongs === token.strongs) &&
                            activeGreekSelection.selectedForm === token.surface;

                          return (
                            <span
                              className="reader-prototype-token-stack"
                              key={`${verse.number}:${tokenIndex}:${token.surface}:${entryKey}`}
                            >
                              <button
                                aria-label={`${token.surface} ${token.strongs ?? entryKey}`}
                                className={`reader-prototype-greek-token${isActive ? " is-active" : ""}`}
                                onClick={() => handleGreekTokenClick(token, verse.number, tokenIndex)}
                                type="button"
                              >
                                {token.surface}
                                {token.trailingPunctuation ? (
                                  <span aria-hidden="true">{token.trailingPunctuation}</span>
                                ) : null}
                              </button>
                              <span className="reader-prototype-token-gloss">
                                {getShortGloss(token.gloss) || token.lemma}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="reader-prototype-plain-text">{verse.text}</p>
                    )}
                    {verse.translationText || selectedVersion !== "greek" ? (
                      <p className="reader-prototype-translation">
                        {verse.translationText ?? verse.text}
                      </p>
                    ) : null}
                    {greekTokens.length > 0 ? (
                      <div className="reader-prototype-token-pills" aria-label={`Verse ${verse.number} word details`}>
                        {greekTokens.slice(0, 4).map((token, tokenIndex) => (
                          <button
                            className="reader-prototype-token-pill"
                            key={`${verse.number}:pill:${tokenIndex}:${token.surface}`}
                            onClick={() => handleGreekTokenClick(token, verse.number, tokenIndex)}
                            type="button"
                          >
                            <span lang="el">{token.surface}</span>
                            <span>{token.transliteration ?? token.lemma}</span>
                            <span>{token.morphology ?? token.strongs ?? "Greek"}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </main>
        <aside className="reader-prototype-study-panel" aria-label="Prototype word study">
          <ReaderPrototypeWordStudyPanel />
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
          {prototypeActions.map((action) => (
            <button className="reader-prototype-bottom-button" key={action} type="button">
              {action}
            </button>
          ))}
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
    </div>
  );
}
