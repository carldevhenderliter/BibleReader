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
            <h1 className="section-title">Authentic Church Fathers</h1>
          </div>
          <p className="muted-copy testament-meta">
            {works.length} {works.length === 1 ? "work" : "works"} available
          </p>
        </div>
        <p className="muted-copy fathers-library-copy">
          A curated corpus of writings widely accepted as authentic, beginning with the Apostolic
          Fathers and extending into Justin, Athenagoras, and Theophilus. Greek-backed works include
          study tokens, transliteration, glosses, and dictionary lookup.
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
              <span className="book-title-line">
                <strong>{work.title}</strong>
                {work.compositionDate ? (
                  <span className="book-date-chip">{work.compositionDate}</span>
                ) : null}
              </span>
              <span className="book-meta">{work.author}</span>
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
