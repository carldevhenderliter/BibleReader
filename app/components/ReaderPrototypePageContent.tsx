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
  Verse
} from "@/lib/bible/types";
import { getGreekTokenOccurrenceKey } from "@/lib/bible/greek";
import { getAlternateBundledVersions, getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";
import { createPassageReference } from "@/lib/study-workspace";

type PrototypeMode = "read" | "study" | "compare" | "notes" | "search" | "library";
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

  if (mode === "compare" && verseNumber) {
    return `${book.name} ${chapter.chapterNumber}:${verseNumber}`;
  }

  return `${book.name} ${chapter.chapterNumber}`;
}

function getPrototypeModeSubtitle(mode: PrototypeMode, book: BookMeta) {
  if (mode === "library") {
    return "Your saved notes, resources, and study materials";
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
  onOpenCrossReferences: () => void;
  onTokenClick: (token: GreekToken, verseNumber: number, tokenIndex: number) => void;
  verseNumber: number | null;
};

function PrototypeStudySurface({
  activeEntryKey,
  book,
  chapter,
  effectiveVersion,
  greekChapter,
  onOpenCrossReferences,
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
        <button aria-label={`Bookmark ${reference}`} className="reader-prototype-bookmark-icon" type="button">
          ▱
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
  const displayVersions = ["greek", "esv", "nlt", "kjv", "web", "tr"].filter(
    (candidate): candidate is BundledBibleVersion =>
      installedVersions.includes(candidate as BundledBibleVersion) &&
      Boolean(chaptersByVersion[candidate as BundledBibleVersion])
  ).slice(0, 4);
  const activeNumber = activeVerseNumber ?? chapter.verses[0]?.number ?? 1;

  return (
    <div className="reader-prototype-mode-surface reader-prototype-compare-mode">
      <div className="reader-prototype-compare-tools">
        <p>Compare Tools</p>
        <button type="button">Show Differences⌄</button>
        <button type="button">Highlight Key Terms⌄</button>
        <label>
          <span>Sync Scrolling</span>
          <input defaultChecked type="checkbox" />
        </label>
        <button type="button">View Options⌄</button>
      </div>
      <div
        className="reader-prototype-compare-grid"
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
                  activeEntryKey={activeEntryKey}
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
      <p className="reader-prototype-compare-count">Showing 1 verse in parallel</p>
    </div>
  );
}

type PrototypeSearchSurfaceProps = {
  book: BookMeta;
  effectiveVersion: BundledBibleVersion;
  onOpenGreekResult: (result: Extract<BibleSearchResult, { type: "greek-lemma" }>) => void;
  onOpenStrongsResult: (result: Extract<BibleSearchResult, { type: "strongs" }>) => void;
  onOpenVerseResult: (result: PrototypeSearchVerseResult) => void;
};

function PrototypeSearchSurface({
  book,
  effectiveVersion,
  onOpenGreekResult,
  onOpenStrongsResult,
  onOpenVerseResult
}: PrototypeSearchSurfaceProps) {
  const {
    isSearching,
    query,
    resultGroups,
    searchVersions,
    setQuery,
    setSearchScope,
    setSearchVersions
  } = useLookup();

  useEffect(() => {
    if (searchVersions.length !== 1 || searchVersions[0] !== effectiveVersion) {
      setSearchVersions([effectiveVersion]);
    }

    setSearchScope(`book:${book.slug}`);

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
  const phraseResults = verseResults.filter((result) => result.preview.toLowerCase().includes(query.toLowerCase()));

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
        <button className="reader-prototype-filter-button" type="button">
          Filters
        </button>
      </form>
      <div className="reader-prototype-search-tabs" aria-label="Prototype search filters">
        <button className="is-active" type="button">All Results <span>{results.length}</span></button>
        <button type="button">NT Usage <span>{verseResults.length}</span></button>
        <button type="button">Greek Words <span>{greekResults.length}</span></button>
        <button type="button">Phrases <span>{phraseResults.length}</span></button>
      </div>
      <div className="reader-prototype-search-meta">
        <span>{isSearching ? "Searching..." : `${results.length} results in ${book.name}`}</span>
        <span>Version: {searchVersions.map(getBibleVersionLabel).join(", ")}</span>
      </div>
      <div className="reader-prototype-search-results">
        {verseResults.length > 0 ? (
          verseResults.slice(0, 25).map((result, index) => (
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
          ))
        ) : greekResults.length > 0 ? (
          greekResults.slice(0, 25).map((result) => (
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
          ))
        ) : results.some((result) => result.type === "strongs") ? (
          results
            .filter((result): result is Extract<BibleSearchResult, { type: "strongs" }> => result.type === "strongs")
            .slice(0, 25)
            .map((result) => (
              <button
                className="reader-prototype-search-result"
                key={result.id}
                onClick={() => onOpenStrongsResult(result)}
                type="button"
              >
                <span className="reader-prototype-search-index">S</span>
                <span>
                  <strong>{result.label}</strong>
                  <span>{result.description}</span>
                </span>
              </button>
            ))
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

  return (
    <div className="reader-prototype-mode-surface reader-prototype-notes-mode">
      <header className="reader-prototype-mode-header">
        <h2>Notes</h2>
        <button className="reader-prototype-gold-action" onClick={onCreateNote} type="button">
          New Note
        </button>
      </header>
      <div className="reader-prototype-mode-tabs" role="tablist" aria-label="Prototype note filters">
        {["All", "Chapter Notes", "Word Studies", "Sermon Notes", "Personal"].map((label, index) => (
          <button className={index === 0 ? "reader-prototype-mode-tab is-active" : "reader-prototype-mode-tab"} key={label} type="button">
            {label}
          </button>
        ))}
      </div>
      <div className="reader-prototype-note-list">
        {displayNotes.map((note, index) => (
          <button className="reader-prototype-note-card" key={note.id} onClick={onOpenNote} type="button">
            <span className="reader-prototype-note-icon">□</span>
            <span>
              <strong>{note.title || `${reference} Note`}</strong>
              <small>{note.content || "Open this note in the real notebook workspace."}</small>
              <em>{index === 0 ? reference : "Notebook"}</em>
            </span>
            <time>{new Date(note.updatedAt).toLocaleDateString()}</time>
          </button>
        ))}
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
  const items = [
    { id: "notes", label: `${reference} - Study Notes`, type: "Notes", count: notebooks.length },
    { id: "bookmarks", label: "Bookmarked passages", type: "Bookmarks", count: bookmarksCount },
    { id: "highlights", label: "Highlighted verses", type: "Highlights", count: highlightsCount },
    { id: "documents", label: "Study documents", type: "Documents", count: notebooks.length }
  ];

  return (
    <div className="reader-prototype-mode-surface reader-prototype-library-mode">
      <div className="reader-prototype-search-bar">
        <input readOnly value="Search your library..." />
        <button className="reader-prototype-filter-button" type="button">Filters</button>
      </div>
      <div className="reader-prototype-search-tabs" aria-label="Prototype library filters">
        {["All", "Notes", "Bookmarks", "Highlights", "Documents"].map((label, index) => (
          <button className={index === 0 ? "is-active" : ""} key={label} type="button">{label}</button>
        ))}
      </div>
      <p className="reader-prototype-search-meta">{items.reduce((total, item) => total + item.count, 0)} items in library</p>
      <div className="reader-prototype-note-list">
        {items.map((item) => (
          <button className="reader-prototype-note-card" key={item.id} onClick={onOpenStudy} type="button">
            <span className="reader-prototype-note-icon">□</span>
            <span>
              <strong>{item.label}</strong>
              <small>{item.type}</small>
              <em>{reference}</em>
            </span>
            <time>{item.count}</time>
          </button>
        ))}
      </div>
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
  const { setIsPanelOpen, settings, updateSettings } = useReaderCustomization();
  const { version, setVersion } = useReaderVersion();
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
  const activeVerseNumber = activeStudyVerseNumber ?? chapter.verses[0]?.number ?? null;
  const previousVerseNumber = getNextVerseNumber(chapter, activeVerseNumber, -1);
  const nextVerseNumber = getNextVerseNumber(chapter, activeVerseNumber, 1);
  const notebooks = getNotebookDocuments();
  const passageBookmarks = getBookmarksForPassage(book.slug, chapter.chapterNumber);
  const passageHighlights = getHighlightsForPassage(book.slug, chapter.chapterNumber);
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
    }
  };

  const handlePrototypeSearchVerse = (result: PrototypeSearchVerseResult) => {
    setActiveStudyVerseNumber(result.verseNumber);
    router.push(getPrototypeHref(result.bookSlug, result.chapterNumber, result.version));
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

  const renderMainSurface = () => {
    if (appMode === "study") {
      return (
        <PrototypeStudySurface
          activeEntryKey={activeGreekSelection?.entryKey ?? activeGreekSelection?.strongs ?? null}
          book={book}
          chapter={chapter}
          effectiveVersion={effectiveVersion}
          greekChapter={greekChapter}
          onOpenCrossReferences={() => openCrossReferences(activeVerseNumber)}
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
          onOpenGreekResult={handlePrototypeSearchGreek}
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
              ["library", "Library"]
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
            <button
              className="reader-prototype-nav-button"
              onClick={() => setIsPanelOpen(true)}
              type="button"
            >
              <span aria-hidden="true">S</span>
              Settings
            </button>
          </nav>
          <div className="reader-prototype-quote-card">
            <p>Ὁ λόγος σου λυχνία τῷ ποδί μου καὶ φῶς τῇ ὁδῷ μου.</p>
            <span>Psalm 119:105</span>
          </div>
        </aside>

        <div className="reader-prototype-main-shell">
          <div className="reader-prototype-topbar">
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
                onClick={() => setIsPanelOpen(true)}
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
                </div>
              ) : null}
              <div className="reader-prototype-study-body">{renderUtilityPanel()}</div>
            </aside>
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
