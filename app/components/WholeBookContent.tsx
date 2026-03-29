"use client";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { ReaderContentTabs } from "@/app/components/ReaderContentTabs";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderNotebookEditor } from "@/app/components/ReaderNotebookEditor";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseList } from "@/app/components/VerseList";
import type { BookMeta, BundledBibleVersion, Chapter } from "@/lib/bible/types";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type WholeBookContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chaptersByVersion: Record<BundledBibleVersion, Chapter[]>;
};

export function WholeBookContent({ books, book, chaptersByVersion }: WholeBookContentProps) {
  const { version } = useReaderVersion();
  const { settings } = useReaderCustomization();
  const { activeReaderPane } = useReaderWorkspace();
  const chapters = chaptersByVersion[version];
  const showStrongs = version === "kjv" && settings.showStrongs;
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync book={book.slug} chapter={1} view="book" />
      <ReaderSettingsPanel book={book} currentChapter={1} view="book" />
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
              currentChapter={1}
              view="book"
            />
          </div>
          <header className="reader-heading">
            <p className="reader-section-label">{versionBadge}</p>
            <h1>{book.name}</h1>
            <p className="reader-meta">
              {book.chapterCount} chapters
              <span className="reader-meta-separator" aria-hidden="true">
                ·
              </span>
              Continuous reading
            </p>
          </header>
        </div>
        <ReaderContentTabs />
        {activeReaderPane === "notebook" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderNotebookEditor bookSlug={book.slug} chapterNumber={1} />
          </div>
        ) : (
          <div className="reading-surface chapter-stack">
            {chapters.map((chapter) => (
              <section className="book-section" key={chapter.chapterNumber}>
                <div className="book-section-header">
                  <h2 className="book-section-title">Chapter {chapter.chapterNumber}</h2>
                  <p className="book-section-subtitle">{chapter.verses.length} verses</p>
                </div>
                <VerseList
                  bookSlug={book.slug}
                  chapterNumber={chapter.chapterNumber}
                  key={`${version}:${book.slug}:${chapter.chapterNumber}`}
                  showStrongs={showStrongs}
                  verses={chapter.verses}
                />
              </section>
            ))}
          </div>
        )}
      </section>
    </ReaderCustomizationShell>
  );
}
