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
            <p className="eyebrow">Greek Fathers</p>
            <h1 className="section-title">Study early Christian Greek texts</h1>
          </div>
          <p className="muted-copy testament-meta">{works.length} work available</p>
        </div>
        <p className="muted-copy fathers-library-copy">
          Open a Fathers work in a dedicated reader with Greek word stacks, transliteration,
          one-word glosses, and click-through dictionary lookup.
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
              <span className="book-meta">{work.sectionCount} sections</span>
              <span className="book-cta">Open reader</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
