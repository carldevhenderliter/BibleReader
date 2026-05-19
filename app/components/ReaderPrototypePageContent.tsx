"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ReaderBookAudioPlayer } from "@/app/components/ReaderBookAudioPlayer";
import { useRegisterReaderBottomBarPanel } from "@/app/components/ReaderBottomBarProvider";
import { ReaderComparePanel } from "@/app/components/ReaderComparePanel";
import { ReaderCrossReferencesPanel } from "@/app/components/ReaderCrossReferencesPanel";
import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderGrammarChartsPanel } from "@/app/components/ReaderGrammarChartsPanel";
import { ReaderGreekGrammarPanel } from "@/app/components/ReaderGreekGrammarPanel";
import { ReaderHarmonyPanel } from "@/app/components/ReaderHarmonyPanel";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderOtComparePanel } from "@/app/components/ReaderOtComparePanel";
import { ReaderSermonWorkspace } from "@/app/components/ReaderSermonWorkspace";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { useBookAudioSource } from "@/app/components/useBookAudioSource";
import { useLocationSearch } from "@/app/components/useLocationSearch";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { VerseList } from "@/app/components/VerseList";
import { useLookup } from "@/app/components/LookupProvider";
import {
  BIBLE_BOOK_ORDER_STORAGE_KEY,
  getBooksForOrderMode,
  normalizeBibleBookOrderMode,
  type BibleBookOrderMode
} from "@/lib/bible/book-order";
import type {
  BookMeta,
  BibleSearchResult,
  BundledBibleVersion,
  BundledChapterMap,
  Chapter,
  EsvInterlinearDisplayChapter,
  GreekToken,
  NotebookDocument,
  ReaderCustomizationSettings,
  SearchScope,
  Verse
} from "@/lib/bible/types";
import {
  BOOK_AUDIO_AUTOPLAY_STORAGE_KEY,
  getBookAudioSource,
  getNextBookWithAudio
} from "@/lib/bible/book-audio";
import { getGreekTokenOccurrenceKey } from "@/lib/bible/greek";
import { getAlternateBundledVersions, getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";
import { createPassageReference } from "@/lib/study-workspace";

type PrototypeMode = "read" | "study" | "compare" | "notes" | "search" | "library" | "settings";
type PrototypeSearchVerseResult = Extract<BibleSearchResult, { type: "verse" }>;

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

function parsePositiveNumber(value: string | null) {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsedValue = Number(value);
  return parsedValue > 0 ? parsedValue : null;
}

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

function getShortGloss(gloss?: string | null) {
  if (!gloss) {
    return "";
  }

  return (
    gloss
      .replace(/\([^)]*\)/g, " ")
      .split(/[;,/]/)[0]
      ?.replace(/\s+/g, " ")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join(" ") ?? ""
  );
}

function getReferenceLabel(bookName: string, chapterNumber: number, verseNumber?: number | null) {
  return `${bookName} ${chapterNumber}${verseNumber ? `:${verseNumber}` : ""}`;
}

function getVerseByNumber(chapter: Chapter | null, verseNumber: number | null | undefined) {
  if (!chapter || verseNumber == null) {
    return chapter?.verses[0] ?? null;
  }

  return chapter.verses.find((verse) => verse.number === verseNumber) ?? chapter.verses[0] ?? null;
}

function getNextVerseNumber(chapter: Chapter, activeVerseNumber: number | null, direction: -1 | 1) {
  const verseNumbers = chapter.verses.map((verse) => verse.number);
  const currentIndex = Math.max(
    0,
    verseNumbers.findIndex((verseNumber) => verseNumber === activeVerseNumber)
  );
  const nextIndex = currentIndex + direction;

  return verseNumbers[nextIndex] ?? null;
}

function getPrototypeModeTitle(mode: PrototypeMode, book: BookMeta, chapter: Chapter, verseNumber: number | null) {
  if (mode === "library") {
    return "Library";
  }

  if (mode === "settings") {
    return "Settings";
  }

  if (mode === "compare" && verseNumber) {
    return `${book.name} ${chapter.chapterNumber}:${verseNumber}`;
  }

  return `${book.name} ${chapter.chapterNumber}`;
}

function getPrototypeModeSubtitle(mode: PrototypeMode, book: BookMeta) {
  if (mode === "library") {
    return "Your saved notes, resources, and study materials";
  }

  if (mode === "settings") {
    return "Prototype reader controls and display layers";
  }

  if (mode === "search") {
    return "Search scripture, Greek forms, Strong's numbers, and saved study context";
  }

  if (mode === "notes") {
    return "Notes and study documents for this passage";
  }

  if (mode === "compare") {
    return "Parallel versions and original-language alignment";
  }

  if (mode === "study") {
    return "Grammar, syntax, cross references, and commentary";
  }

  return book.testament === "New" ? "New Testament reading prototype" : "Old Testament reading prototype";
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

type PrototypeGreekLineProps = {
  verse: Verse | null;
  activeEntryKey?: string | null;
  onTokenClick: (token: GreekToken, tokenIndex: number) => void;
};

function PrototypeGreekLine({
  verse,
  activeEntryKey = null,
  onTokenClick
}: PrototypeGreekLineProps) {
  const tokens = verse?.greekTokens ?? [];

  if (!verse) {
    return null;
  }

  if (tokens.length === 0) {
    return <p className="reader-prototype-plain-text">{verse.text}</p>;
  }

  return (
    <div className="reader-prototype-greek-line" lang="el">
      {tokens.map((token, tokenIndex) => {
        const entryKey = token.entryKey ?? token.strongs ?? token.lemma;
        const isActive = activeEntryKey && (entryKey === activeEntryKey || token.strongs === activeEntryKey);

        return (
          <span
            className="reader-prototype-token-stack"
            key={`${verse.number}:${tokenIndex}:${token.surface}:${entryKey}`}
          >
            <button
              aria-label={`${token.surface} ${token.strongs ?? entryKey}`}
              className={`reader-prototype-greek-token${isActive ? " is-active" : ""}`}
              onClick={() => onTokenClick(token, tokenIndex)}
              type="button"
            >
              {token.surface}
              {token.trailingPunctuation ? <span aria-hidden="true">{token.trailingPunctuation}</span> : null}
            </button>
            <span className="reader-prototype-token-gloss">
              {getShortGloss(token.gloss) || token.lemma}
            </span>
          </span>
        );
      })}
    </div>
  );
}

type PrototypeStudySurfaceProps = {
  activeEntryKey?: string | null;
  book: BookMeta;
  chapter: Chapter;
  effectiveVersion: BundledBibleVersion;
  greekChapter: Chapter | null;
  isBookmarked: boolean;
  onOpenCrossReferences: () => void;
  onToggleBookmark: () => void;
  onTokenClick: (token: GreekToken, verseNumber: number, tokenIndex: number) => void;
  verseNumber: number | null;
};

function PrototypeStudySurface({
  activeEntryKey,
  book,
  chapter,
  effectiveVersion,
  greekChapter,
  isBookmarked,
  onOpenCrossReferences,
  onToggleBookmark,
  onTokenClick,
  verseNumber
}: PrototypeStudySurfaceProps) {
  const [tab, setTab] = useState<"analysis" | "syntax" | "cross-references" | "commentary">("analysis");
  const verse = getVerseByNumber(chapter, verseNumber);
  const greekVerse = getVerseByNumber(greekChapter, verse?.number);
  const activeTokens = greekVerse?.greekTokens ?? [];
  const reference = getReferenceLabel(book.name, chapter.chapterNumber, verse?.number);

  return (
    <div className="reader-prototype-mode-surface reader-prototype-study-mode">
      <div className="reader-prototype-mode-tabs" role="tablist" aria-label="Prototype study tabs">
        {[
          ["analysis", "Analysis"],
          ["syntax", "Syntax"],
          ["cross-references", "Cross References"],
          ["commentary", "Commentary"]
        ].map(([tabId, label]) => (
          <button
            aria-selected={tab === tabId}
            className={`reader-prototype-mode-tab${tab === tabId ? " is-active" : ""}`}
            key={tabId}
            onClick={() => setTab(tabId as typeof tab)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="reader-prototype-study-header">
        <h2>{reference}</h2>
        <button
          aria-label={`${isBookmarked ? "Remove bookmark for" : "Bookmark"} ${reference}`}
          aria-pressed={isBookmarked}
          className={`reader-prototype-bookmark-icon${isBookmarked ? " is-active" : ""}`}
          onClick={onToggleBookmark}
          type="button"
        >
          {isBookmarked ? "▰" : "▱"}
        </button>
      </div>
      {tab === "analysis" ? (
        <>
          <PrototypeGreekLine
            activeEntryKey={activeEntryKey}
            verse={greekVerse ?? verse}
            onTokenClick={(token, tokenIndex) => onTokenClick(token, greekVerse?.number ?? verse?.number ?? 1, tokenIndex)}
          />
          {verse?.translationText || effectiveVersion !== "greek" ? (
            <p className="reader-prototype-study-translation">{verse?.translationText ?? verse?.text}</p>
          ) : null}
          <section className="reader-prototype-study-table-card">
            <h3>Grammatical Breakdown</h3>
            <table className="reader-prototype-study-table">
              <thead>
                <tr>
                  <th>Word</th>
                  <th>Lemma</th>
                  <th>Parsing</th>
                  <th>Strong&apos;s</th>
                </tr>
              </thead>
              <tbody>
                {activeTokens.length > 0 ? (
                  activeTokens.map((token, tokenIndex) => {
                    const entryKey = token.entryKey ?? token.strongs ?? token.lemma;

                    return (
                      <tr
                        className={activeEntryKey && (entryKey === activeEntryKey || token.strongs === activeEntryKey) ? "is-active" : ""}
                        key={`${token.surface}:${tokenIndex}`}
                      >
                        <td lang="el">{token.surface}</td>
                        <td lang="el">{token.lemma}</td>
                        <td>{token.decodedMorphology ?? token.morphology ?? "Parsing unavailable"}</td>
                        <td>{token.strongs ?? entryKey}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>No original-language token data is available for this verse.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
          <div className="reader-prototype-study-note-grid">
            <section>
              <h3>Syntactical Notes</h3>
              <ul>
                <li>The selected word is shown in context with its lemma, parsing, and Strong&apos;s entry.</li>
                <li>Use the Word Study panel to inspect dictionary, usage, LXX, and Early Church data.</li>
              </ul>
            </section>
            <section>
              <h3>Commentary Notes</h3>
              <ul>
                <li>This prototype keeps the production reader data while applying the manuscript theme.</li>
                <li>Click any Greek word to update the study panel without leaving the passage.</li>
              </ul>
            </section>
          </div>
        </>
      ) : tab === "syntax" ? (
        <div className="reader-prototype-study-copy">
          <h3>Syntax</h3>
          <p>
            {activeTokens.length > 0
              ? activeTokens.map((token) => `${token.surface}: ${token.decodedMorphology ?? token.morphology ?? "unknown"}`).join("; ")
              : "Syntax details appear when original-language tokens are available for this verse."}
          </p>
        </div>
      ) : tab === "cross-references" ? (
        <div className="reader-prototype-study-copy">
          <h3>Cross References</h3>
          <p>Open the cross-reference workspace for the selected verse in the right study pane.</p>
          <button className="reader-prototype-gold-action" onClick={onOpenCrossReferences} type="button">
            Open Cross References
          </button>
        </div>
      ) : (
        <div className="reader-prototype-study-copy">
          <h3>Commentary</h3>
          <p>
            Commentary notes are connected to the same notebook and sermon workspace used by the production reader.
            Use Notes or Sermons from the study pane to attach your own material to {reference}.
          </p>
        </div>
      )}
    </div>
  );
}

type PrototypeCompareSurfaceProps = {
  activeEntryKey?: string | null;
  activeVerseNumber: number | null;
  book: BookMeta;
  chapter: Chapter;
  chaptersByVersion: BundledChapterMap;
  effectiveVersion: BundledBibleVersion;
  installedVersions: readonly BundledBibleVersion[];
  onTokenClick: (token: GreekToken, verseNumber: number, tokenIndex: number) => void;
};

function PrototypeCompareSurface({
  activeEntryKey,
  activeVerseNumber,
  book,
  chapter,
  chaptersByVersion,
  effectiveVersion,
  installedVersions,
  onTokenClick
}: PrototypeCompareSurfaceProps) {
  const [showDifferences, setShowDifferences] = useState(false);
  const [highlightKeyTerms, setHighlightKeyTerms] = useState(true);
  const [syncScrolling, setSyncScrolling] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const displayVersions = ["greek", "mt", "esv", "nlt", "kjv", "web", "tr"].filter(
    (candidate): candidate is BundledBibleVersion =>
      installedVersions.includes(candidate as BundledBibleVersion) &&
      Boolean(chaptersByVersion[candidate as BundledBibleVersion])
  ).slice(0, 4);
  const activeNumber = activeVerseNumber ?? chapter.verses[0]?.number ?? 1;
  const activeHighlightKey = highlightKeyTerms ? activeEntryKey : null;

  return (
    <div className="reader-prototype-mode-surface reader-prototype-compare-mode">
      <div className="reader-prototype-compare-tools">
        <p>Compare Tools</p>
        <button
          aria-pressed={showDifferences}
          className={showDifferences ? "is-active" : ""}
          onClick={() => setShowDifferences((current) => !current)}
          type="button"
        >
          {showDifferences ? "Hide Differences" : "Show Differences"}
        </button>
        <button
          aria-pressed={highlightKeyTerms}
          className={highlightKeyTerms ? "is-active" : ""}
          onClick={() => setHighlightKeyTerms((current) => !current)}
          type="button"
        >
          {highlightKeyTerms ? "Key Terms On" : "Highlight Key Terms"}
        </button>
        <label className={syncScrolling ? "is-active" : ""}>
          <span>Sync Scrolling</span>
          <input
            checked={syncScrolling}
            onChange={(event) => setSyncScrolling(event.currentTarget.checked)}
            type="checkbox"
          />
        </label>
        <button
          aria-pressed={compactView}
          className={compactView ? "is-active" : ""}
          onClick={() => setCompactView((current) => !current)}
          type="button"
        >
          {compactView ? "Expanded View" : "Compact View"}
        </button>
      </div>
      <div
        className={`reader-prototype-compare-grid${showDifferences ? " is-difference-mode" : ""}${compactView ? " is-compact" : ""}`}
        style={{ gridTemplateColumns: `repeat(${Math.max(displayVersions.length, 1)}, minmax(11rem, 1fr))` }}
      >
        {displayVersions.map((displayVersion) => {
          const compareChapter = chaptersByVersion[displayVersion] ?? null;
          const verse = getVerseByNumber(compareChapter, activeNumber);
          const isGreekVersion = displayVersion === "greek" || displayVersion === "tr";

          return (
            <section className="reader-prototype-compare-column" key={displayVersion}>
              <header>
                <span>{getBibleVersionLabel(displayVersion)}</span>
                <strong>{displayVersion === effectiveVersion ? "Primary" : displayVersion.toUpperCase().slice(0, 1)}</strong>
              </header>
              <h3>{getReferenceLabel(book.name, compareChapter?.chapterNumber ?? chapter.chapterNumber, verse?.number)}</h3>
              {isGreekVersion && verse?.greekTokens?.length ? (
                <PrototypeGreekLine
                  activeEntryKey={activeHighlightKey}
                  verse={verse}
                  onTokenClick={(token, tokenIndex) => onTokenClick(token, verse.number, tokenIndex)}
                />
              ) : (
                <p className="reader-prototype-compare-text">{verse?.text ?? "This verse is not available."}</p>
              )}
              {isGreekVersion && verse?.greekTokens?.length ? (
                <dl className="reader-prototype-compare-glosses">
                  {verse.greekTokens.map((token, tokenIndex) => (
                    <div key={`${token.surface}:${tokenIndex}`}>
                      <dt lang="el">{token.surface}</dt>
                      <dd>{getShortGloss(token.gloss) || token.lemma}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          );
        })}
      </div>
      <p className="reader-prototype-compare-count">
        Showing 1 verse in parallel
        {showDifferences ? " with visual difference emphasis" : ""}
        {syncScrolling ? " and synced scrolling" : ""}
      </p>
    </div>
  );
}

type PrototypeSearchTab = "all" | "nt" | "greek" | "phrases";

type PrototypeSearchSurfaceProps = {
  book: BookMeta;
  effectiveVersion: BundledBibleVersion;
  onOpenBookResult: (result: Extract<BibleSearchResult, { type: "book" }>) => void;
  onOpenChapterResult: (result: Extract<BibleSearchResult, { type: "chapter" }>) => void;
  onOpenGreekResult: (result: Extract<BibleSearchResult, { type: "greek-lemma" }>) => void;
  onOpenRangeResult: (result: Extract<BibleSearchResult, { type: "range" }>) => void;
  onOpenStrongsResult: (result: Extract<BibleSearchResult, { type: "strongs" }>) => void;
  onOpenVerseResult: (result: PrototypeSearchVerseResult) => void;
};

function PrototypeSearchSurface({
  book,
  effectiveVersion,
  onOpenBookResult,
  onOpenChapterResult,
  onOpenGreekResult,
  onOpenRangeResult,
  onOpenStrongsResult,
  onOpenVerseResult
}: PrototypeSearchSurfaceProps) {
  const {
    isSearching,
    query,
    resultGroups,
    searchScope,
    searchVersions,
    setQuery,
    setSearchScope,
    setSearchVersions
  } = useLookup();
  const [activeTab, setActiveTab] = useState<PrototypeSearchTab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const seededSearchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (searchVersions.length !== 1 || searchVersions[0] !== effectiveVersion) {
      setSearchVersions([effectiveVersion]);
    }

    setSearchScope(`book:${book.slug}`);

    const seedKey = `${book.slug}:${effectiveVersion}`;

    if (seededSearchKeyRef.current !== seedKey) {
      seededSearchKeyRef.current = seedKey;
    } else {
      return;
    }

    if (!query.trim()) {
      setQuery(book.testament === "New" ? "θεός" : "God");
    }
  }, [
    book.slug,
    book.testament,
    effectiveVersion,
    query,
    searchVersions,
    setQuery,
    setSearchScope,
    setSearchVersions
  ]);

  const results = resultGroups.flatMap((group) => group.results);
  const verseResults = results.filter(
    (result): result is PrototypeSearchVerseResult => result.type === "verse"
  );
  const greekResults = results.filter((result) => result.type === "greek-lemma");
  const strongsResults = results.filter((result) => result.type === "strongs");
  const phraseResults = verseResults.filter((result) => result.preview.toLowerCase().includes(query.toLowerCase()));
  const filteredResults = activeTab === "nt"
    ? verseResults
    : activeTab === "greek"
      ? [...greekResults, ...strongsResults]
      : activeTab === "phrases"
        ? phraseResults
        : results;
  const scopeOptions: Array<{ label: string; value: SearchScope }> = [
    { label: book.name, value: `book:${book.slug}` },
    { label: "New Testament", value: "new-testament" },
    { label: "Old Testament", value: "old-testament" },
    { label: "All Scripture", value: "all" }
  ];

  const renderSearchResult = (result: BibleSearchResult, index: number) => {
    if (result.type === "verse") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenVerseResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">{index + 1}</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.preview}</span>
            <small>{result.description}</small>
          </span>
          <em>{query}</em>
        </button>
      );
    }

    if (result.type === "greek-lemma") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenGreekResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">Γ</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.preview}</span>
            <small>{result.description}</small>
          </span>
        </button>
      );
    }

    if (result.type === "strongs") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenStrongsResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">S</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.preview}</span>
            <small>{result.description}</small>
          </span>
        </button>
      );
    }

    if (result.type === "book") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenBookResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">B</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.description}</span>
            <small>Open this book in the prototype reader.</small>
          </span>
        </button>
      );
    }

    if (result.type === "chapter") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenChapterResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">C</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.description}</span>
            <small>Open this chapter in the prototype reader.</small>
          </span>
        </button>
      );
    }

    if (result.type === "range") {
      return (
        <button
          className="reader-prototype-search-result"
          key={result.id}
          onClick={() => onOpenRangeResult(result)}
          type="button"
        >
          <span className="reader-prototype-search-index">R</span>
          <span>
            <strong>{result.label}</strong>
            <span>{result.description}</span>
            <small>{result.verses.length} verses</small>
          </span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="reader-prototype-mode-surface reader-prototype-search-mode">
      <form
        className="reader-prototype-search-bar"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(query);
        }}
      >
        <label className="sr-only" htmlFor="reader-prototype-search-input">
          Search
        </label>
        <input
          id="reader-prototype-search-input"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search Greek, English, references, or Strong's..."
          value={query}
        />
        <button className="reader-prototype-gold-action" type="submit">
          Search
        </button>
        <button
          aria-expanded={showFilters}
          className={`reader-prototype-filter-button${showFilters ? " is-active" : ""}`}
          onClick={() => setShowFilters((current) => !current)}
          type="button"
        >
          Filters
        </button>
      </form>
      {showFilters ? (
        <div className="reader-prototype-filter-panel" aria-label="Prototype search scope filters">
          {scopeOptions.map((scopeOption) => (
            <button
              className={searchScope === scopeOption.value ? "is-active" : ""}
              key={scopeOption.value}
              onClick={() => setSearchScope(scopeOption.value)}
              type="button"
            >
              {scopeOption.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="reader-prototype-search-tabs" aria-label="Prototype search filters">
        {[
          ["all", "All Results", results.length],
          ["nt", "NT Usage", verseResults.length],
          ["greek", "Greek Words", greekResults.length + strongsResults.length],
          ["phrases", "Phrases", phraseResults.length]
        ].map(([tabId, label, count]) => (
          <button
            className={activeTab === tabId ? "is-active" : ""}
            key={tabId}
            onClick={() => setActiveTab(tabId as PrototypeSearchTab)}
            type="button"
          >
            {label} <span>{count}</span>
          </button>
        ))}
      </div>
      <div className="reader-prototype-search-meta">
        <span>{isSearching ? "Searching..." : `${filteredResults.length} visible of ${results.length} results`}</span>
        <span>Version: {searchVersions.map(getBibleVersionLabel).join(", ")}</span>
      </div>
      <div className="reader-prototype-search-results">
        {filteredResults.length > 0 ? (
          filteredResults.slice(0, 25).map(renderSearchResult)
        ) : (
          <p className="reader-prototype-empty-copy">
            {isSearching ? "Searching scripture..." : "No results yet. Try a Greek word, English phrase, reference, or Strong's number."}
          </p>
        )}
      </div>
    </div>
  );
}

type PrototypeNotesSurfaceProps = {
  book: BookMeta;
  chapter: Chapter;
  notebooks: NotebookDocument[];
  onCreateNote: () => void;
  onOpenNote: () => void;
};

function PrototypeNotesSurface({
  book,
  chapter,
  notebooks,
  onCreateNote,
  onOpenNote
}: PrototypeNotesSurfaceProps) {
  const reference = `${book.name} ${chapter.chapterNumber}`;
  const [activeFilter, setActiveFilter] = useState("All");
  const displayNotes = notebooks.length > 0
    ? notebooks
    : [
        {
          id: "prototype-current-note",
          title: `${reference} - Study Notes`,
          content: `Create a real notebook note for ${reference}.`,
          references: [],
          updatedAt: new Date().toISOString()
        }
      ];
  const filteredNotes = displayNotes.filter((note) => {
    if (activeFilter === "All") {
      return true;
    }

    const haystack = `${note.title} ${note.content} ${note.references
      .map((referenceEntry) => referenceEntry.label ?? referenceEntry.bookSlug)
      .join(" ")}`.toLowerCase();

    if (activeFilter === "Chapter Notes") {
      return haystack.includes(reference.toLowerCase()) || haystack.includes("chapter");
    }

    if (activeFilter === "Word Studies") {
      return haystack.includes("word") || haystack.includes("greek") || haystack.includes("strong");
    }

    if (activeFilter === "Sermon Notes") {
      return haystack.includes("sermon");
    }

    return haystack.includes("personal");
  });

  return (
    <div className="reader-prototype-mode-surface reader-prototype-notes-mode">
      <header className="reader-prototype-mode-header">
        <h2>Notes</h2>
        <button className="reader-prototype-gold-action" onClick={onCreateNote} type="button">
          New Note
        </button>
      </header>
      <div className="reader-prototype-mode-tabs" role="tablist" aria-label="Prototype note filters">
        {["All", "Chapter Notes", "Word Studies", "Sermon Notes", "Personal"].map((label) => (
          <button
            aria-selected={activeFilter === label}
            className={activeFilter === label ? "reader-prototype-mode-tab is-active" : "reader-prototype-mode-tab"}
            key={label}
            onClick={() => setActiveFilter(label)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="reader-prototype-note-list">
        {filteredNotes.length > 0 ? filteredNotes.map((note, index) => (
          <button className="reader-prototype-note-card" key={note.id} onClick={onOpenNote} type="button">
            <span className="reader-prototype-note-icon">□</span>
            <span>
              <strong>{note.title || `${reference} Note`}</strong>
              <small>{note.content || "Open this note in the real notebook workspace."}</small>
              <em>{index === 0 ? reference : "Notebook"}</em>
            </span>
            <time>{new Date(note.updatedAt).toLocaleDateString()}</time>
          </button>
        )) : (
          <p className="reader-prototype-empty-copy">No notes match this filter.</p>
        )}
      </div>
    </div>
  );
}

type PrototypeLibrarySurfaceProps = {
  book: BookMeta;
  chapter: Chapter;
  bookmarksCount: number;
  highlightsCount: number;
  notebooks: NotebookDocument[];
  onOpenStudy: () => void;
};

function PrototypeLibrarySurface({
  book,
  chapter,
  bookmarksCount,
  highlightsCount,
  notebooks,
  onOpenStudy
}: PrototypeLibrarySurfaceProps) {
  const reference = `${book.name} ${chapter.chapterNumber}`;
  const [activeFilter, setActiveFilter] = useState("All");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const items = [
    { id: "notes", label: `${reference} - Study Notes`, type: "Notes", count: notebooks.length },
    { id: "bookmarks", label: "Bookmarked passages", type: "Bookmarks", count: bookmarksCount },
    { id: "highlights", label: "Highlighted verses", type: "Highlights", count: highlightsCount },
    { id: "documents", label: "Study documents", type: "Documents", count: notebooks.length }
  ];
  const filteredItems = items.filter((item) => {
    const matchesFilter = activeFilter === "All" || item.type === activeFilter;
    const matchesQuery =
      libraryQuery.trim().length === 0 ||
      `${item.label} ${item.type} ${reference}`.toLowerCase().includes(libraryQuery.trim().toLowerCase());

    return matchesFilter && matchesQuery;
  });

  return (
    <div className="reader-prototype-mode-surface reader-prototype-library-mode">
      <div className="reader-prototype-search-bar">
        <input
          aria-label="Search your library"
          onChange={(event) => setLibraryQuery(event.currentTarget.value)}
          placeholder="Search your library..."
          value={libraryQuery}
        />
        <button
          aria-expanded={showFilters}
          className={`reader-prototype-filter-button${showFilters ? " is-active" : ""}`}
          onClick={() => setShowFilters((current) => !current)}
          type="button"
        >
          Filters
        </button>
      </div>
      {showFilters ? (
        <div className="reader-prototype-filter-panel" aria-label="Prototype library summary">
          {items.map((item) => (
            <span key={item.id}>
              {item.type}: {item.count}
            </span>
          ))}
        </div>
      ) : null}
      <div className="reader-prototype-search-tabs" aria-label="Prototype library filters">
        {["All", "Notes", "Bookmarks", "Highlights", "Documents"].map((label) => (
          <button
            className={activeFilter === label ? "is-active" : ""}
            key={label}
            onClick={() => setActiveFilter(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      <p className="reader-prototype-search-meta">
        {filteredItems.length} visible sections · {items.reduce((total, item) => total + item.count, 0)} saved items
      </p>
      <div className="reader-prototype-note-list">
        {filteredItems.length > 0 ? filteredItems.map((item) => (
          <button className="reader-prototype-note-card" key={item.id} onClick={onOpenStudy} type="button">
            <span className="reader-prototype-note-icon">□</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.type}</small>
              <em>{reference}</em>
            </span>
            <time>{item.count}</time>
          </button>
        )) : (
          <p className="reader-prototype-empty-copy">No library items match this filter.</p>
        )}
      </div>
    </div>
  );
}

type PrototypeSettingsSurfaceProps = {
  annotationMode: boolean;
  hasBibleGreekAnnotationSurface: boolean;
  hasGreekLearningSurface: boolean;
  isGreekLearningMode: boolean;
  onResetSettings: () => void;
  setAnnotationMode: (updater: (current: boolean) => boolean) => void;
  setIsGreekLearningMode: (value: boolean) => void;
  settings: ReaderCustomizationSettings;
  updateSettings: (updates: Partial<ReaderCustomizationSettings>) => void;
};

function PrototypeSettingsSurface({
  annotationMode,
  hasBibleGreekAnnotationSurface,
  hasGreekLearningSurface,
  isGreekLearningMode,
  onResetSettings,
  setAnnotationMode,
  setIsGreekLearningMode,
  settings,
  updateSettings
}: PrototypeSettingsSurfaceProps) {
  const toggleOptions: Array<{
    id: keyof ReaderCustomizationSettings;
    label: string;
    description: string;
  }> = [
    {
      id: "focusReadingMode",
      label: "Focus Reading",
      description: "Hide prototype side panels for a cleaner reading surface."
    },
    {
      id: "showVerseNumbers",
      label: "Verse Numbers",
      description: "Show verse numbers beside the reading text."
    },
    {
      id: "showVerseText",
      label: "Verse Text",
      description: "Show the main scripture text layer."
    },
    {
      id: "showCompanionVerseTranslation",
      label: "Companion Translation",
      description: "Show the companion English line under Greek where available."
    },
    {
      id: "showSecondaryVerseTranslation",
      label: "Secondary Versions",
      description: "Show configured parallel translation rows."
    },
    {
      id: "showCustomVerseTranslation",
      label: "Custom Translation",
      description: "Show your custom translation notes in the verse list."
    },
    {
      id: "showGreekGloss",
      label: "Greek Gloss",
      description: "Show quick glosses under Greek tokens."
    },
    {
      id: "showGreekLemma",
      label: "Greek Lemma",
      description: "Show dictionary lemmas for Greek tokens."
    },
    {
      id: "showGreekTransliteration",
      label: "Transliteration",
      description: "Show readable transliterations below Greek words."
    },
    {
      id: "showGreekGrammarCards",
      label: "Grammar Cards",
      description: "Show morphology cards for Greek tokens."
    },
    {
      id: "showExpandedGreekGrammarCards",
      label: "Expanded Grammar",
      description: "Show fuller grammar details in each verse."
    },
    {
      id: "showStrongs",
      label: "KJV Strong's",
      description: "Show Strong's tagging for supported KJV words."
    },
    {
      id: "showVerseStrongs",
      label: "Verse Strong's",
      description: "Show Strong's references in verse displays."
    },
    {
      id: "showEsvInterlinear",
      label: "ESV Interlinear",
      description: "Show ESV interlinear data for New Testament passages."
    }
  ];

  return (
    <div className="reader-prototype-mode-surface reader-prototype-settings-mode">
      <header className="reader-prototype-mode-header">
        <div>
          <p className="reader-prototype-kicker">Prototype Settings</p>
          <h2>Reader controls</h2>
        </div>
        <button className="reader-prototype-filter-button" onClick={onResetSettings} type="button">
          Reset
        </button>
      </header>
      <section className="reader-prototype-settings-card">
        <h3>Reader Tools</h3>
        <div className="reader-prototype-settings-actions">
          {hasBibleGreekAnnotationSurface ? (
            <button
              className={`reader-prototype-bottom-button${annotationMode ? " is-active" : ""}`}
              onClick={() => setAnnotationMode((current) => !current)}
              type="button"
            >
              {annotationMode ? "Done Annotating" : "Annotate Greek"}
            </button>
          ) : null}
          {hasGreekLearningSurface ? (
            <button
              className={`reader-prototype-bottom-button${isGreekLearningMode ? " is-active" : ""}`}
              onClick={() => setIsGreekLearningMode(!isGreekLearningMode)}
              type="button"
            >
              {isGreekLearningMode ? "Stop Learning" : "Learn Greek"}
            </button>
          ) : null}
        </div>
      </section>
      <section className="reader-prototype-settings-card">
        <h3>Reading Layers</h3>
        <div className="reader-prototype-settings-grid">
          {toggleOptions.map((option) => (
            <button
              aria-pressed={Boolean(settings[option.id])}
              className={`reader-prototype-settings-option${
                settings[option.id] ? " is-active" : ""
              }`}
              key={option.id}
              onClick={() =>
                updateSettings({
                  [option.id]: !settings[option.id]
                } as Partial<ReaderCustomizationSettings>)
              }
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
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
  const locationSearch = useLocationSearch();
  const { settings, resetSettings, updateSettings } = useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
  const {
    canCollapseSplitPane,
    collapseSplitPane,
    collapsedSplitPanes,
    isSplitViewActive
  } = useLookup();
  const {
    activeGreekSelection,
    activeReaderPane,
    activeUtilityPane,
    clearGreekLearningQuiz,
    getBookmark,
    getBookmarksForPassage,
    getHighlightsForPassage,
    getNotebookDocuments,
    isGreekLearningMode,
    openCompare,
    openCrossReferences,
    openGreekDictionary,
    openNotebook,
    openStrongs,
    openSermons,
    activeStudyVerseNumber,
    setActiveReaderPane,
    setActiveStudyVerseNumber,
    setActiveUtilityPane,
    setIsGreekLearningMode,
    syncCurrentChapterData,
    syncCurrentPassage,
    toggleBookmark
  } = useReaderWorkspace();
  const [appMode, setAppMode] = useState<PrototypeMode>("read");
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
  const searchParams = new URLSearchParams(locationSearch);
  const urlHighlightedVerseNumber = parsePositiveNumber(searchParams.get("highlight"));
  const urlHighlightedRangeStart = parsePositiveNumber(searchParams.get("highlightStart"));
  const urlHighlightedRangeEnd = parsePositiveNumber(searchParams.get("highlightEnd"));
  const activeHighlightedVerseRange =
    urlHighlightedRangeStart !== null &&
    urlHighlightedRangeEnd !== null &&
    urlHighlightedRangeEnd >= urlHighlightedRangeStart
      ? {
          start: urlHighlightedRangeStart,
          end: urlHighlightedRangeEnd
        }
      : null;
  const activeHighlightedVerseNumber =
    activeHighlightedVerseRange !== null ? null : urlHighlightedVerseNumber;
  const activeVerseNumber =
    activeStudyVerseNumber ??
    activeHighlightedVerseRange?.start ??
    activeHighlightedVerseNumber ??
    chapter.verses[0]?.number ??
    null;
  const previousVerseNumber = getNextVerseNumber(chapter, activeVerseNumber, -1);
  const nextVerseNumber = getNextVerseNumber(chapter, activeVerseNumber, 1);
  const notebooks = getNotebookDocuments();
  const passageBookmarks = getBookmarksForPassage(book.slug, chapter.chapterNumber);
  const passageHighlights = getHighlightsForPassage(book.slug, chapter.chapterNumber);
  const bookAudioSource = useBookAudioSource(book.slug);
  const nextAudioBook = useMemo(
    () => getNextBookWithAudio(books, book.slug, bookOrderMode),
    [book.slug, bookOrderMode, books]
  );
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
  const isFocusReading = settings.focusReadingMode;
  const isToplineVisible = useReaderToplineVisibility(false);
  const isPrototypeStudyPaneCollapsed = isSplitViewActive && collapsedSplitPanes.study;
  const showInlineUtilityPane = isPrototypeStudyPaneCollapsed;
  const showNotebookInline = showInlineUtilityPane && activeUtilityPane === "notebook";
  const showGrammarInline = showInlineUtilityPane && activeUtilityPane === "grammar";
  const showStrongsInline = showInlineUtilityPane && activeUtilityPane === "strongs";
  const showSermonsInline = showInlineUtilityPane && activeUtilityPane === "sermons";
  const showHarmonyInline = showInlineUtilityPane && activeUtilityPane === "harmony";
  const handleBookAudioEnded = useCallback(() => {
    if (!bookAudioSource) {
      return;
    }

    const nextBook =
      typeof window === "undefined"
        ? nextAudioBook
        : getNextBookWithAudio(
            books,
            book.slug,
            normalizeBibleBookOrderMode(
              window.localStorage.getItem(BIBLE_BOOK_ORDER_STORAGE_KEY)
            )
          );

    if (!nextBook) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY);
      }
      return;
    }

    if (typeof window !== "undefined" && getBookAudioSource(nextBook.slug)) {
      window.sessionStorage.setItem(BOOK_AUDIO_AUTOPLAY_STORAGE_KEY, nextBook.slug);
    }

    router.push(getPrototypeHref(nextBook.slug, 1, effectiveVersion));
  }, [book.slug, bookAudioSource, books, effectiveVersion, nextAudioBook, router]);
  const bottomBarPanel = useMemo(
    () => (
      <ReaderBookAudioPlayer
        audioSource={bookAudioSource}
        autoPlayBookSlug={book.slug}
        nextUpLabel={nextAudioBook?.name ?? null}
        onEnded={handleBookAudioEnded}
        resumeSession={{
          autoplayKey: book.slug,
          bookSlug: book.slug,
          bookName: book.name,
          chapter: chapter.chapterNumber,
          view: "chapter",
          version: effectiveVersion,
          href: getPrototypeHref(book.slug, chapter.chapterNumber, effectiveVersion)
        }}
      />
    ),
    [
      book.name,
      book.slug,
      bookAudioSource,
      chapter.chapterNumber,
      effectiveVersion,
      handleBookAudioEnded,
      nextAudioBook?.name
    ]
  );

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
    setActiveStudyVerseNumber(
      activeHighlightedVerseRange?.start ??
        activeHighlightedVerseNumber ??
        chapter.verses[0]?.number ??
        null
    );
  }, [
    activeHighlightedVerseNumber,
    activeHighlightedVerseRange,
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
    setAppMode("notes");
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

  const handleTokenClick = (token: GreekToken, verseNumber: number, tokenIndex: number) => {
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
  };

  const openMode = (nextMode: PrototypeMode) => {
    setAppMode(nextMode);

    if (nextMode === "read") {
      setActiveReaderPane("reading");
      setActiveUtilityPane("strongs");
      return;
    }

    if (nextMode === "compare") {
      openCompare(activeVerseNumber);
      return;
    }

    if (nextMode === "notes") {
      handleNote();
      return;
    }

    if (nextMode === "study") {
      setActiveReaderPane("reading");
      setActiveUtilityPane("strongs");
      return;
    }

    if (nextMode === "search") {
      setActiveReaderPane("reading");
      setActiveUtilityPane("strongs");
      return;
    }

    if (nextMode === "library") {
      setActiveReaderPane("reading");
      setActiveUtilityPane("notebook");
      return;
    }

    if (nextMode === "settings") {
      setActiveReaderPane("reading");
      setActiveUtilityPane("strongs");
    }
  };

  const handlePrototypeSearchVerse = (result: PrototypeSearchVerseResult) => {
    const nextSearchParams = new URLSearchParams({
      version: result.version,
      highlight: String(result.verseNumber)
    });

    setActiveStudyVerseNumber(result.verseNumber);
    router.push(
      `/prototype/reader/${result.bookSlug}/${result.chapterNumber}?${nextSearchParams.toString()}`
    );
  };

  const handlePrototypeSearchGreek = (result: Extract<BibleSearchResult, { type: "greek-lemma" }>) => {
    openGreekDictionary({
      entryKey: result.entryKey,
      strongs: result.strongs,
      lemma: result.lemma,
      label: result.lemma,
      selectedForm: result.selectedForm,
      matchedQuery: result.label,
      transliteration: result.transliteration,
      gloss: result.description
    });
  };

  const handlePrototypeSearchStrongs = (result: Extract<BibleSearchResult, { type: "strongs" }>) => {
    openStrongs(result.strongsNumber, result.label);
  };

  useRegisterReaderBottomBarPanel(bottomBarPanel);

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
        <>
          <ReaderOtComparePanel
            book={book}
            focusedChapterNumber={chapter.chapterNumber}
            greekChapters={chaptersByVersion.greek ? [chaptersByVersion.greek] : null}
            masoreticChapters={masoreticChapter ? [masoreticChapter] : null}
            view="chapter"
          />
          {showStrongsInline ? (
            <div className="reader-ot-compare-study-panel">
              <ReaderStrongsPanel />
            </div>
          ) : showGrammarInline ? (
            <div className="reader-ot-compare-study-panel">
              <ReaderGreekGrammarPanel />
            </div>
          ) : null}
        </>
      );
    }

    if (showNotebookInline) {
      return <ReaderNotebookEditor />;
    }

    if (showGrammarInline) {
      return <ReaderGreekGrammarPanel />;
    }

    if (showStrongsInline) {
      return <ReaderStrongsPanel />;
    }

    if (showSermonsInline) {
      return <ReaderSermonWorkspace />;
    }

    if (showHarmonyInline) {
      return <ReaderHarmonyWorkspace />;
    }

    return (
      <VerseList
        annotationMode={annotationMode}
        bookSlug={book.slug}
        chapterNumber={chapter.chapterNumber}
        highlightedVerseNumber={activeHighlightedVerseNumber}
        highlightedVerseRange={activeHighlightedVerseRange}
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
    if (appMode === "notes" || appMode === "library") {
      return <ReaderNotebookEditor />;
    }

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

    if (activeUtilityPane === "strongs") {
      return <ReaderStrongsPanel />;
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

    return <ReaderStrongsPanel />;
  };

  const renderMainSurface = () => {
    if (appMode === "study") {
      return (
        <PrototypeStudySurface
          activeEntryKey={activeGreekSelection?.entryKey ?? activeGreekSelection?.strongs ?? null}
          book={book}
          chapter={chapter}
          effectiveVersion={effectiveVersion}
          greekChapter={greekChapter}
          isBookmarked={isBookmarked}
          onOpenCrossReferences={() => openCrossReferences(activeVerseNumber)}
          onToggleBookmark={() => toggleBookmark(book.slug, chapter.chapterNumber)}
          onTokenClick={handleTokenClick}
          verseNumber={activeVerseNumber}
        />
      );
    }

    if (appMode === "compare") {
      return (
        <PrototypeCompareSurface
          activeEntryKey={activeGreekSelection?.entryKey ?? activeGreekSelection?.strongs ?? null}
          activeVerseNumber={activeVerseNumber}
          book={book}
          chapter={chapter}
          chaptersByVersion={chaptersByVersion}
          effectiveVersion={effectiveVersion}
          installedVersions={installedVersions}
          onTokenClick={handleTokenClick}
        />
      );
    }

    if (appMode === "search") {
      return (
        <PrototypeSearchSurface
          book={book}
          effectiveVersion={effectiveVersion}
          onOpenBookResult={(result) => navigateTo(result.bookSlug, 1, result.version)}
          onOpenChapterResult={(result) => navigateTo(result.bookSlug, result.chapterNumber, result.version)}
          onOpenGreekResult={handlePrototypeSearchGreek}
          onOpenRangeResult={(result) => {
            setActiveStudyVerseNumber(result.startVerseNumber);
            router.push(
              `/prototype/reader/${result.bookSlug}/${result.chapterNumber}?${new URLSearchParams({
                version: result.version,
                highlightStart: String(result.startVerseNumber),
                highlightEnd: String(result.endVerseNumber)
              }).toString()}`
            );
          }}
          onOpenStrongsResult={handlePrototypeSearchStrongs}
          onOpenVerseResult={handlePrototypeSearchVerse}
        />
      );
    }

    if (appMode === "notes") {
      return (
        <PrototypeNotesSurface
          book={book}
          chapter={chapter}
          notebooks={notebooks}
          onCreateNote={handleNote}
          onOpenNote={handleNote}
        />
      );
    }

    if (appMode === "library") {
      return (
        <PrototypeLibrarySurface
          book={book}
          bookmarksCount={passageBookmarks.length}
          chapter={chapter}
          highlightsCount={passageHighlights.length}
          notebooks={notebooks}
          onOpenStudy={() => openMode("study")}
        />
      );
    }

    if (appMode === "settings") {
      return (
        <PrototypeSettingsSurface
          annotationMode={annotationMode}
          hasBibleGreekAnnotationSurface={hasBibleGreekAnnotationSurface}
          hasGreekLearningSurface={hasGreekLearningSurface}
          isGreekLearningMode={isGreekLearningMode}
          onResetSettings={resetSettings}
          setAnnotationMode={setAnnotationMode}
          setIsGreekLearningMode={setIsGreekLearningMode}
          settings={settings}
          updateSettings={updateSettings}
        />
      );
    }

    return (
      <>
        <div className="reader-prototype-chapter-heading">
          <span>{chapter.chapterNumber}</span>
          <h2>Scripture</h2>
        </div>
        <div className="reader-prototype-reading-surface" ref={readingSurfaceRef}>
          {renderReaderSurface()}
        </div>
      </>
    );
  };

  return (
    <ReaderCustomizationShell
      className={`reader-shell reader-prototype-shell reader-customizable-shell${isFocusReading ? " is-focus-reading" : ""}`}
    >
      <ReadingSessionSync
        book={book.slug}
        chapter={chapter.chapterNumber}
        version={effectiveVersion}
        view="chapter"
      />
      <div className="reader-prototype-app-shell">
        <aside className="reader-prototype-side-rail" aria-label="Prototype navigation">
          <div className="reader-prototype-brand">
            <div className="reader-prototype-logo-mark">✚</div>
            <strong>Bible Reader</strong>
            <span>{book.testament === "New" ? "Greek New Testament" : "Scripture Study"}</span>
          </div>
          <nav className="reader-prototype-nav">
            {[
              ["read", "Read"],
              ["study", "Study"],
              ["compare", "Compare"],
              ["notes", "Notes"],
              ["search", "Search"],
              ["library", "Library"],
              ["settings", "Settings"]
            ].map(([mode, label]) => (
              <button
                className={`reader-prototype-nav-button${appMode === mode ? " is-active" : ""}`}
                key={mode}
                onClick={() => openMode(mode as PrototypeMode)}
                type="button"
              >
                <span aria-hidden="true">{label.slice(0, 1)}</span>
                {label}
              </button>
            ))}
          </nav>
          <div className="reader-prototype-quote-card">
            <p>Ὁ λόγος σου λυχνία τῷ ποδί μου καὶ φῶς τῇ ὁδῷ μου.</p>
            <span>Psalm 119:105</span>
          </div>
        </aside>

        <div className="reader-prototype-main-shell">
          <div className={`reader-prototype-topbar${isToplineVisible ? "" : " is-hidden"}`}>
            <div>
              <p className="reader-prototype-kicker">{getBibleVersionBadge(effectiveVersion)}</p>
              <h1>{getPrototypeModeTitle(appMode, book, chapter, activeVerseNumber)}</h1>
              <p>{getPrototypeModeSubtitle(appMode, book)}</p>
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
                aria-label="Reader settings"
                className="reader-prototype-icon-button"
                onClick={() => openMode("settings")}
                type="button"
              >
                ☼
              </button>
            </div>
          </div>

          <div className="reader-prototype-layout">
            <main className="reader-prototype-reading-card" aria-label="Prototype reader">
              {renderMainSurface()}
            </main>
            {!isPrototypeStudyPaneCollapsed ? (
            <aside className="reader-prototype-study-panel" aria-label="Prototype word study">
              {appMode === "read" || appMode === "study" || appMode === "compare" || appMode === "search" ? (
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
                    onClick={() => openCrossReferences(activeVerseNumber)}
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
                  {isSplitViewActive ? (
                    <button
                      className="reader-prototype-study-tab"
                      disabled={!canCollapseSplitPane("study")}
                      onClick={() => collapseSplitPane("study")}
                      type="button"
                    >
                      Hide
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="reader-prototype-study-body">{renderUtilityPanel()}</div>
            </aside>
            ) : null}
          </div>
        </div>

        <div className="reader-prototype-bottom-dock" aria-label="Prototype chapter actions">
          <div className="reader-prototype-bottom-edge">
            {appMode === "compare" && previousVerseNumber ? (
              <button
                className="reader-prototype-bottom-button"
                onClick={() => setActiveStudyVerseNumber(previousVerseNumber)}
                type="button"
              >
                ‹ Prev Verse
              </button>
            ) : null}
            {previousChapter ? (
              <button
                className="reader-prototype-bottom-button"
                onClick={() => navigateTo(previousChapter.bookSlug, previousChapter.chapterNumber)}
                type="button"
              >
                ‹ {previousChapter.label}
              </button>
            ) : null}
          </div>
          <div className="reader-prototype-bottom-actions">
            <button className="reader-prototype-bottom-button" onClick={() => openMode("compare")} type="button">
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
          <div className="reader-prototype-bottom-edge is-right">
            {nextChapter ? (
              <button
                className="reader-prototype-bottom-button"
                onClick={() => navigateTo(nextChapter.bookSlug, nextChapter.chapterNumber)}
                type="button"
              >
                {nextChapter.label} ›
              </button>
            ) : null}
            {appMode === "compare" && nextVerseNumber ? (
              <button
                className="reader-prototype-bottom-button"
                onClick={() => setActiveStudyVerseNumber(nextVerseNumber)}
                type="button"
              >
                Next Verse ›
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </ReaderCustomizationShell>
  );
}
