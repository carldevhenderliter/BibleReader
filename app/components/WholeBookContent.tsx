"use client";

import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReadingSessionSync } from "@/app/components/ReadingSessionSync";
import { VerseList } from "@/app/components/VerseList";
import type { BibleVersion, BookMeta, Chapter } from "@/lib/bible/types";
import { getBibleVersionBadge, getBibleVersionLabel } from "@/lib/bible/version";

type WholeBookContentProps = {
  books: BookMeta[];
  book: BookMeta;
  chapters: Chapter[];
  version: BibleVersion;
  esvEnabled: boolean;
};

export function WholeBookContent({
  books,
  book,
  chapters,
  version,
  esvEnabled
}: WholeBookContentProps) {
  const versionLabel = getBibleVersionLabel(version);
  const versionBadge = getBibleVersionBadge(version);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReadingSessionSync location={{ book: book.slug, chapter: 1, view: "book", version }} />
      <ReaderSettingsPanel />
      <section className="reader-card">
        <div className="reader-topline">
          <div className="reader-heading">
            <p className="eyebrow">{book.testament} Testament</p>
            <h1>{book.name}</h1>
            <p className="reader-meta">
              {versionLabel}
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              {versionBadge}
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              {book.chapterCount} chapters in one continuous reading view
              <span className="reader-meta-separator" aria-hidden="true">
                •
              </span>
              Long-scroll mode
            </p>
          </div>
          <ReaderControls
            book={book}
            books={books}
            currentChapter={1}
            view="book"
            version={version}
            esvEnabled={esvEnabled}
          />
        </div>
        <div className="reading-surface chapter-stack">
          {chapters.map((chapter) => (
            <section className="book-section" key={chapter.chapterNumber}>
              <div className="book-section-header">
                <h2 className="book-section-title">Chapter {chapter.chapterNumber}</h2>
                <p className="book-section-subtitle">{chapter.verses.length} verses</p>
              </div>
              <VerseList verses={chapter.verses} />
            </section>
          ))}
        </div>
      </section>
    </ReaderCustomizationShell>
  );
}
