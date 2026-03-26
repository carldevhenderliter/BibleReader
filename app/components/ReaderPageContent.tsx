"use client";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ChapterPagination } from "@/app/components/ChapterPagination";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import type { BookMeta, BundledBibleVersion, Chapter } from "@/lib/bible/types";
import { getChapterLinks } from "@/lib/bible/utils";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type ReaderPageContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: Record<BundledBibleVersion, Chapter>;
};

export function ReaderPageContent({ books, book, chaptersByVersion }: ReaderPageContentProps) {
  const { version } = useReaderVersion();
  const chapter = chaptersByVersion[version];
  const chapterLinks = getChapterLinks(books, book, chapter.chapterNumber, version);
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={chapter.chapterNumber} view="chapter" />
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
