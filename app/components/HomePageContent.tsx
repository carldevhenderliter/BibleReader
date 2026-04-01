import Link from "next/link";

import { ContinueReading } from "@/app/components/ContinueReading";
import type { BookMeta } from "@/lib/bible/types";
import { getBookHref } from "@/lib/bible/utils";

type HomePageContentProps = {
  books: BookMeta[];
};

export function HomePageContent({ books }: HomePageContentProps) {
  const oldTestament = books.filter((book) => book.testament === "Old");
  const newTestament = books.filter((book) => book.testament === "New");

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-backdrop" aria-hidden="true">
          <span className="hero-glow hero-glow-primary" />
          <span className="hero-glow hero-glow-secondary" />
        </div>
        <div className="hero-grid">
          <div className="hero-copy-block">
            <p className="eyebrow">Scripture Interface</p>
            <h1 className="hero-title">Read the full Bible in a cleaner, sharper digital space.</h1>
            <p className="hero-copy">
              Fast chapter navigation, continuous whole-book reading, and a calm scripture surface
              inside a modern glass-and-neon shell.
            </p>
            <div className="hero-actions">
              <Link className="primary-link" href={getBookHref("genesis")}>
                Launch Genesis
              </Link>
              <ContinueReading />
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel-header">
              <span className="hero-panel-label">Reader Specs</span>
              <span className="hero-panel-chip">Dark-first</span>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <strong>66</strong>
                <span>books online</span>
              </div>
              <div className="hero-stat">
                <strong>1,189</strong>
                <span>chapters ready</span>
              </div>
              <div className="hero-stat">
                <strong>2</strong>
                <span>reading modes</span>
              </div>
            </div>
            <div className="hero-signal">
              <span className="hero-signal-dot" />
              <p>Optimized for immersive reading, fast scanning, and mobile navigation.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="content-card testament-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">Old Testament</p>
            <h2 className="section-title">Genesis to Malachi</h2>
          </div>
          <p className="muted-copy testament-meta">{oldTestament.length} books</p>
        </div>
        <div className="book-grid">
          {oldTestament.map((book) => (
            <Link
              aria-label={`Open ${book.name}`}
              className="book-link"
              href={getBookHref(book.slug)}
              key={book.slug}
            >
              <span className="book-chip">OT</span>
              <strong>{book.name}</strong>
              <span className="book-meta">{book.chapterCount} chapters</span>
              <span className="book-cta">Open whole book</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="content-card testament-card">
        <div className="section-header">
          <div>
            <p className="eyebrow">New Testament</p>
            <h2 className="section-title">Matthew to Revelation</h2>
          </div>
          <p className="muted-copy testament-meta">{newTestament.length} books</p>
        </div>
        <div className="book-grid">
          {newTestament.map((book) => (
            <Link
              aria-label={`Open ${book.name}`}
              className="book-link"
              href={getBookHref(book.slug)}
              key={book.slug}
            >
              <span className="book-chip">NT</span>
              <strong>{book.name}</strong>
              <span className="book-meta">{book.chapterCount} chapters</span>
              <span className="book-cta">Open whole book</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
