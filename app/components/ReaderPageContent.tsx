"use client";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ChapterPagination } from "@/app/components/ChapterPagination";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { VerseList } from "@/app/components/VerseList";
import type { BibleVersion, BookMeta, Chapter } from "@/lib/bible/types";
import { getChapterLinks } from "@/lib/bible/utils";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type ReaderPageContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chapter: Chapter;
  version: BibleVersion;
  esvEnabled: boolean;
};

export function ReaderPageContent({
  books,
  book,
  chapter,
  version,
  esvEnabled
}: ReaderPageContentProps) {
  const chapterLinks = getChapterLinks(books, book, chapter.chapterNumber, version);
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync
        location={{ book: book.slug, chapter: chapter.chapterNumber, view: "chapter", version }}
      />
      <ReaderSettingsPanel />
      <section className="reader-card">
        <div className="reader-topline">
          <div className="reader-heading">
            <p className="eyebrow">{book.testament} Testament</p>
            <h1>
              {book.name} {chapter.chapterNumber}
            </h1>
            <p className="reader-meta">
              {versionLabel}
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              {versionBadge}
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              {chapter.verses.length} verses in this chapter
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              Focused chapter view
            </p>
          </div>
          <ReaderControls
            book={book}
            books={books}
            currentChapter={chapter.chapterNumber}
            view="chapter"
            version={version}
            esvEnabled={esvEnabled}
          />
        </div>
        <div className="reading-surface">
          <VerseList verses={chapter.verses} />
        </div>
      </section>
      <ChapterPagination previous={chapterLinks.previous} next={chapterLinks.next} />
    </ReaderCustomizationShell>
  );
}
