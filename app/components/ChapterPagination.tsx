import Link from "next/link";

import type { ChapterLink } from "@/lib/bible/types";

type ChapterPaginationProps = {
  previous: ChapterLink | null;
  next: ChapterLink | null;
};

export function ChapterPagination({ previous, next }: ChapterPaginationProps) {
  return (
    <nav className="pagination" aria-label="Chapter navigation">
      {previous ? (
        <Link
          aria-label={`Previous chapter: ${previous.label}`}
          className="pagination-link"
          href={previous.href}
        >
          <span className="pagination-label">Previous</span>
          <span className="pagination-direction">Backtrack</span>
          <strong>{previous.label}</strong>
        </Link>
      ) : (
        <div className="pagination-empty">
          <span className="pagination-label">Previous</span>
          <span className="pagination-direction">Backtrack</span>
          <strong>Beginning of Genesis</strong>
        </div>
      )}
      {next ? (
        <Link
          aria-label={`Next chapter: ${next.label}`}
          className="pagination-link"
          href={next.href}
        >
          <span className="pagination-label">Next</span>
          <span className="pagination-direction">Advance</span>
          <strong>{next.label}</strong>
        </Link>
      ) : (
        <div className="pagination-empty">
          <span className="pagination-label">Next</span>
          <span className="pagination-direction">Advance</span>
          <strong>End of Revelation</strong>
        </div>
      )}
    </nav>
  );
}
