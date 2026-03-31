"use client";

import { useEffect, useId, useRef, useState } from "react";

import books from "@/data/bible/versions/web/books.json";
import { useLookup } from "@/app/components/LookupProvider";
import { SearchCustomizationControls } from "@/app/components/SearchCustomizationControls";
import type { BookMeta, SearchScope } from "@/lib/bible/types";

const orderedBooks = (books as BookMeta[]).slice().sort((left, right) => left.order - right.order);

export function SearchCustomizationMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { searchScope, setSearchScope } = useLookup();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="search-settings-menu" ref={menuRef}>
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        aria-label="Search settings"
        className={`search-settings-trigger${isOpen ? " search-settings-trigger-active" : ""}`}
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        type="button"
      >
        <svg
          aria-hidden="true"
          className="search-settings-trigger-icon"
          fill="none"
          height="16"
          viewBox="0 0 16 16"
          width="16"
        >
          <path
            d="M6.7 1.3h2.6l.4 1.6c.4.1.8.3 1.2.5l1.5-.8 1.8 1.8-.8 1.5c.2.4.4.8.5 1.2l1.6.4v2.6l-1.6.4c-.1.4-.3.8-.5 1.2l.8 1.5-1.8 1.8-1.5-.8c-.4.2-.8.4-1.2.5l-.4 1.6H6.7l-.4-1.6c-.4-.1-.8-.3-1.2-.5l-1.5.8-1.8-1.8.8-1.5c-.2-.4-.4-.8-.5-1.2L.5 9.3V6.7l1.6-.4c.1-.4.3-.8.5-1.2l-.8-1.5 1.8-1.8 1.5.8c.4-.2.8-.4 1.2-.5z"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.1"
          />
          <circle cx="8" cy="8" r="2.1" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </button>
      {isOpen ? (
        <div
          aria-label="Search settings menu"
          className="search-settings-panel"
          id={panelId}
          role="dialog"
        >
          <div className="search-settings-section">
            <label className="search-customization-field search-scope-field">
              <span>Scope</span>
              <select
                aria-label="Search scope"
                onChange={(event) => {
                  setSearchScope(event.target.value as SearchScope);
                }}
                value={searchScope}
              >
                <option value="all">All Scripture</option>
                <option value="old-testament">Old Testament</option>
                <option value="new-testament">New Testament</option>
                <optgroup label="Books">
                  {orderedBooks.map((book) => (
                    <option key={book.slug} value={`book:${book.slug}`}>
                      {book.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </div>
          <SearchCustomizationControls />
        </div>
      ) : null}
    </div>
  );
}
