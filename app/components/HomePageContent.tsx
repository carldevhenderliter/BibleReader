"use client";

import { useState } from "react";
import Link from "next/link";

import { ContinueReading } from "@/app/components/ContinueReading";
import {
  getChronologicalNewTestamentBooks,
  getChronologicalOldTestamentBooks
} from "@/lib/bible/book-order";
import type { BookMeta } from "@/lib/bible/types";
import type { FathersWorkMeta } from "@/lib/fathers/types";
import { getBookHref } from "@/lib/bible/utils";

type HomePageContentProps = {
  books: BookMeta[];
  fathersWorks?: FathersWorkMeta[];
};

export function HomePageContent({ books, fathersWorks = [] }: HomePageContentProps) {
  const oldTestament = books.filter((book) => book.testament === "Old");
  const newTestament = books.filter((book) => book.testament === "New");
  const chronologicalOldTestament = getChronologicalOldTestamentBooks(books);
  const chronologicalNewTestament = getChronologicalNewTestamentBooks(books);
  const [oldTestamentOrder, setOldTestamentOrder] = useState<"canonical" | "chronological">(
    "canonical"
  );
  const [newTestamentOrder, setNewTestamentOrder] = useState<"canonical" | "chronological">(
    "canonical"
  );
  const displayedOldTestament =
    oldTestamentOrder === "chronological" ? chronologicalOldTestament : oldTestament;
  const displayedNewTestament =
    newTestamentOrder === "chronological" ? chronologicalNewTestament : newTestament;

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
            <div className="book-order-controls" role="group" aria-label="Old Testament order">
              <button
                className={`reader-inline-button${
                  oldTestamentOrder === "canonical" ? " is-active" : ""
                }`}
                onClick={() => setOldTestamentOrder("canonical")}
                type="button"
              >
                Canonical
              </button>
              <button
                className={`reader-inline-button${
                  oldTestamentOrder === "chronological" ? " is-active" : ""
                }`}
                onClick={() => setOldTestamentOrder("chronological")}
                type="button"
              >
                Chronological
              </button>
            </div>
          </div>
          <p className="muted-copy testament-meta">{oldTestament.length} books</p>
        </div>
        <div className="book-grid">
          {displayedOldTestament.map((book) => (
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
            <div className="book-order-controls" role="group" aria-label="New Testament order">
              <button
                className={`reader-inline-button${
                  newTestamentOrder === "canonical" ? " is-active" : ""
                }`}
                onClick={() => setNewTestamentOrder("canonical")}
                type="button"
              >
                Canonical
              </button>
              <button
                className={`reader-inline-button${
                  newTestamentOrder === "chronological" ? " is-active" : ""
                }`}
                onClick={() => setNewTestamentOrder("chronological")}
                type="button"
              >
                Chronological
              </button>
            </div>
          </div>
          <p className="muted-copy testament-meta">{newTestament.length} books</p>
        </div>
        <div className="book-grid">
          {displayedNewTestament.map((book) => (
            <Link
              aria-label={`Open ${book.name}`}
              className="book-link"
              href={getBookHref(book.slug)}
              key={book.slug}
            >
              <span className="book-chip">NT</span>
              <span className="book-title-line">
                <strong>{book.name}</strong>
                {book.compositionDate ? (
                  <span className="book-date-chip">{book.compositionDate}</span>
                ) : null}
              </span>
              <span className="book-meta">{book.chapterCount} chapters</span>
              <span className="book-cta">Open whole book</span>
            </Link>
          ))}
        </div>
      </section>

      {fathersWorks.length > 0 ? (
        <section className="content-card testament-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">Fathers Reader</p>
              <h2 className="section-title">Early Christian Study Texts</h2>
            </div>
            <p className="muted-copy testament-meta">
              {fathersWorks.length} {fathersWorks.length === 1 ? "work" : "works"}
            </p>
          </div>
          <div className="book-grid">
            {fathersWorks.map((work) => (
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
                <span className="book-cta">Open Fathers reader</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
