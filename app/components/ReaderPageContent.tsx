"use client";

import { useEffect } from "react";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderStudySetsPanel } from "@/app/components/ReaderStudySetsPanel";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import type { BookMeta, BundledBibleVersion, Chapter } from "@/lib/bible/types";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type ReaderPageContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: Record<BundledBibleVersion, Chapter>;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
};

export function ReaderPageContent({
  books,
  book,
  chaptersByVersion,
  highlightedVerseNumber = null,
  highlightedVerseRange = null
}: ReaderPageContentProps) {
  const { version } = useReaderVersion();
  const { settings } = useReaderCustomization();
  const { activeReaderPane, setActiveStudyVerseNumber, syncCurrentChapterData } = useReaderWorkspace();
  const chapter = chaptersByVersion[version];
  const showStrongs = version === "kjv" && settings.showStrongs;
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);

  useEffect(() => {
    syncCurrentChapterData(book.slug, chapter.chapterNumber, chaptersByVersion);
    setActiveStudyVerseNumber(highlightedVerseRange?.start ?? highlightedVerseNumber ?? chapter.verses[0]?.number ?? null);
  }, [
    book.slug,
    chapter.chapterNumber,
    chapter.verses,
    chaptersByVersion,
    highlightedVerseNumber,
    highlightedVerseRange,
    setActiveStudyVerseNumber,
    syncCurrentChapterData
  ]);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={chapter.chapterNumber} view="chapter" />
      <ReaderSettingsPanel book={book} currentChapter={chapter.chapterNumber} view="chapter" />
      <section className="reader-card reader-reading-card">
        <div className="reader-topline">
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-label">{book.testament} Testament</p>
              <p className="reader-toolbar-summary">{versionLabel}</p>
            </div>
            <ReaderControls
              book={book}
              books={books}
              currentChapter={chapter.chapterNumber}
              view="chapter"
            />
          </div>
          <header className="reader-heading">
            <p className="reader-section-label">{versionBadge}</p>
            <h1>
              {book.name} {chapter.chapterNumber}
            </h1>
            <p className="reader-meta">
              {chapter.verses.length} verses
              <span className="reader-meta-separator" aria-hidden="true">
                ·
              </span>
              Chapter view
            </p>
          </header>
        </div>
        <ReaderContentTabs />
        {activeReaderPane === "notebook" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderNotebookEditor bookSlug={book.slug} chapterNumber={chapter.chapterNumber} />
          </div>
        ) : activeReaderPane === "study-sets" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStudySetsPanel bookSlug={book.slug} chapterNumber={chapter.chapterNumber} />
          </div>
        ) : (
          <div className="reading-surface">
            <VerseList
              bookSlug={book.slug}
              chapterNumber={chapter.chapterNumber}
              highlightedVerseNumber={highlightedVerseNumber}
              highlightedVerseRange={highlightedVerseRange}
              key={`${version}:${book.slug}:${chapter.chapterNumber}`}
              showStrongs={showStrongs}
              verses={chapter.verses}
            />
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
