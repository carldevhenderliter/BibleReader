import Link from "next/link";

import type { FathersWorkMeta } from "@/lib/fathers/types";

type FathersLibraryContentProps = {
  works: FathersWorkMeta[];
};

export function FathersLibraryContent({ works }: FathersLibraryContentProps) {
  return (
    <div className="page-stack">
      <section className="content-card testament-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Fathers Reader</p>
            <h1 className="section-title">Authentic Apostolic Fathers</h1>
          </div>
          <p className="muted-copy testament-meta">
            {works.length} {works.length === 1 ? "work" : "works"} available
          </p>
        </div>
        <p className="muted-copy fathers-library-copy">
          A curated corpus of writings widely accepted as authentic, ordered from Clement through
          Papias. Greek-backed works include study tokens, transliteration, glosses, and dictionary
          lookup.
        </p>
        <div className="book-grid">
          {works.map((work) => (
            <Link
              aria-label={`Open ${work.title}`}
              className="book-link"
              href={`/fathers/${work.slug}`}
              key={work.slug}
            >
              <span className="book-chip">AF</span>
              <strong>{work.title}</strong>
              <span className="book-meta">{work.author}</span>
              {work.compositionDate ? (
                <span className="book-meta">{work.compositionDate}</span>
              ) : null}
              <span className="book-meta">{work.sectionCount} sections</span>
              {work.fullTextSource ? (
                <span className="book-meta">Source: {work.fullTextSource}</span>
              ) : null}
              <span className="book-cta">Open reader</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
