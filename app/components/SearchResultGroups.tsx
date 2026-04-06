"use client";

import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { normalizeStrongsNumber } from "@/lib/bible/strongs";
import type { BibleSearchResult, BibleSearchResultGroup, VerseToken } from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

type SearchResultGroupsProps = {
  groups: BibleSearchResultGroup[];
  onSelectResult: (result: BibleSearchResult, groupQuery?: string) => void;
  variant?: "stack" | "panes";
  isSearching?: boolean;
  showStrongsInSearch?: boolean;
};

function getResultTypeLabel(type: BibleSearchResultGroup["results"][number]["type"]) {
  if (type === "book") {
    return "Book";
  }

  if (type === "chapter") {
    return "Chapter";
  }

  if (type === "range") {
    return "Range";
  }

  if (type === "strongs") {
    return "Strongs";
  }

  if (type === "topic") {
    return "Topic";
  }

  if (type === "topic-suggestion") {
    return "Topic";
  }

  return "Verse";
}

function normalizeQueryValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseStrongsQuery(query: string) {
  const match = query.match(/^(?:strongs\s+)?([hg])\s*0*(\d+)$/i);

  return match ? normalizeStrongsNumber(`${match[1]}${match[2]}`) : null;
}

function tokenMatchesQuery(tokenText: string, queryWords: string[]) {
  const normalizedToken = normalizeQueryValue(tokenText);

  return queryWords.some((word) => word && normalizedToken.includes(word));
}

function SearchVersePreview({
  preview,
  query,
  tokens,
  showStrongsInSearch = false,
  mode = "query"
}: {
  preview: string;
  query: string;
  tokens?: VerseToken[];
  showStrongsInSearch?: boolean;
  mode?: "query" | "allStrongs";
}) {
  if (!showStrongsInSearch || !tokens?.length) {
    return <span className="search-result-preview">{preview}</span>;
  }

  const strongsQuery = parseStrongsQuery(query);
  const queryWords = strongsQuery ? [] : normalizeQueryValue(query).split(" ").filter(Boolean);
  const hasAnnotatedMatch = tokens.some((token) =>
    mode === "allStrongs"
      ? (token.strongsNumbers ?? []).length > 0
      : strongsQuery
      ? (token.strongsNumbers ?? []).some((value) => normalizeStrongsNumber(value) === strongsQuery)
      : tokenMatchesQuery(token.text, queryWords)
  );

  if (!hasAnnotatedMatch) {
    return <span className="search-result-preview">{preview}</span>;
  }

  return (
    <span className="search-result-preview search-result-preview-rich">
      {tokens.map((token, index) => {
        const matchingStrongs =
          mode === "allStrongs"
            ? token.strongsNumbers ?? []
            : strongsQuery
              ? (token.strongsNumbers ?? []).filter(
                  (value) => normalizeStrongsNumber(value) === strongsQuery
                )
              : tokenMatchesQuery(token.text, queryWords)
                ? token.strongsNumbers ?? []
                : [];

        return (
          <span className="search-preview-token" key={`${index}:${token.text}`}>
            <span className="search-preview-token-text">{token.text}</span>
            {matchingStrongs.length ? (
              <span className="search-preview-strongs">
                {Array.from(new Set(matchingStrongs.map((value) => normalizeStrongsNumber(value)))).join(
                  " "
                )}
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

function SearchTopicVerseButton({
  query,
  verse,
  onSelectResult,
  onCompareResult,
  onSaveReference,
  showStrongsInSearch
}: {
  query: string;
  verse: Extract<BibleSearchResult, { type: "verse" }>;
  onSelectResult: (result: BibleSearchResult, groupQuery?: string) => void;
  onCompareResult: (result: Extract<BibleSearchResult, { type: "verse" }>) => void;
  onSaveReference: (result: Extract<BibleSearchResult, { type: "verse" }>) => void;
  showStrongsInSearch?: boolean;
}) {
  return (
    <article className="search-range-line search-topic-verse">
      <button aria-label={verse.label} className="search-range-line-main" onClick={() => onSelectResult(verse)} type="button">
        <span className="search-range-line-number">{verse.verseNumber}</span>
        <span className="search-range-line-copy">
          <span className="search-result-reference">{verse.label}</span>
          <SearchVersePreview
            mode="allStrongs"
            preview={verse.preview}
            query={query}
            showStrongsInSearch={showStrongsInSearch}
            tokens={verse.tokens}
          />
        </span>
      </button>
      <div className="search-result-actions">
        <button className="reader-inline-button" onClick={() => onCompareResult(verse)} type="button">
          Compare
        </button>
        <button className="reader-inline-button" onClick={() => onSaveReference(verse)} type="button">
          Save
        </button>
      </div>
    </article>
  );
}

export function SearchResultGroups({
  groups,
  onSelectResult,
  variant = "stack",
  isSearching = false,
  showStrongsInSearch = false
}: SearchResultGroupsProps) {
  const { version } = useReaderVersion();
  const { openCompare, saveReferenceToStudySet } = useReaderWorkspace();

  const handleCompareResult = (result: Extract<BibleSearchResult, { type: "verse" | "chapter" }>) => {
    openCompare(result.type === "verse" ? result.verseNumber : null);
    onSelectResult(result);
  };

  const handleSaveReference = (reference: ReturnType<typeof createPassageReference>) => {
    const setName = window.prompt("Add this result to which study set?", "Current study");

    if (!setName) {
      return;
    }

    saveReferenceToStudySet(setName, reference);
  };

  const handleSaveVerseResult = (result: Extract<BibleSearchResult, { type: "verse" }>) => {
    handleSaveReference(
      createPassageReference({
        version,
        bookSlug: result.bookSlug,
        chapterNumber: result.chapterNumber,
        verseNumber: result.verseNumber,
        sourceType: "search"
      })
    );
  };

  return (
    <div
      className={`search-result-groups${
        variant === "panes" ? " search-result-groups-panes" : ""
      }`}
      style={
        variant === "panes"
          ? {
              ["--search-pane-count" as string]: String(Math.max(groups.length, 1))
            }
          : undefined
      }
    >
      {groups.map((group) => (
        <section
          className={`search-result-group${
            variant === "panes" ? " search-result-group-pane" : ""
          }`}
          key={group.id}
        >
          <header className="search-result-group-header">
            <p className="search-result-group-label">Query</p>
            <h3 className="search-result-group-query">{group.query}</h3>
          </header>
          {isSearching ? (
            <p className="search-result-group-empty">Searching scripture…</p>
          ) : group.results.length === 0 ? (
            <p className="search-result-group-empty">
              {group.emptyMessage ?? "No matches found in the active translation."}
            </p>
          ) : (
            <div className="search-results">
              {group.results.map((result) => (
                result.type === "topic-suggestion" ? (
                  <button
                    className="search-result"
                    key={result.id}
                    onClick={() => onSelectResult(result, group.query)}
                    type="button"
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    <p className="search-result-preview">{result.preview}</p>
                  </button>
                ) : result.type === "topic" ? (
                  <article
                    aria-label={result.label}
                    className="search-result search-result-topic search-result-static"
                    key={result.id}
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    <div className="search-topic-subtopics">
                      {result.subtopics.map((subtopic) => (
                        <section className="search-topic-subtopic" key={subtopic.id}>
                          <h4 className="search-topic-subtopic-title">{subtopic.label}</h4>
                          <div className="search-range-lines">
                            {subtopic.verses.map((verse) => (
                              <SearchTopicVerseButton
                                key={verse.id}
                                onCompareResult={handleCompareResult}
                                onSelectResult={onSelectResult}
                                onSaveReference={handleSaveVerseResult}
                                query={group.query}
                                showStrongsInSearch={showStrongsInSearch}
                                verse={verse}
                              />
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </article>
                ) : result.type === "range" ? (
                  <article
                    aria-label={result.label}
                    className="search-result search-result-range"
                    key={result.id}
                  >
                    <div className="search-result-header">
                      <span className={`search-result-type search-result-type-${result.type}`}>
                        {getResultTypeLabel(result.type)}
                      </span>
                      <strong>{result.label}</strong>
                    </div>
                    <p className="search-result-description">{result.description}</p>
                    <div className="search-range-lines">
                      {result.verses.map((verse) => (
                        <article className="search-range-line" key={verse.id}>
                          <button
                            aria-label={verse.label}
                            className="search-range-line-main"
                            onClick={() =>
                              onSelectResult({
                                type: "verse",
                                id: verse.id,
                                bookSlug: result.bookSlug,
                                chapterNumber: result.chapterNumber,
                                verseNumber: verse.verseNumber,
                                label: verse.label,
                                description: result.description,
                                href: verse.href,
                                preview: verse.preview,
                                tokens: verse.tokens
                              }, group.query)
                            }
                            type="button"
                          >
                            <span className="search-range-line-number">{verse.verseNumber}</span>
                            <span className="search-range-line-copy">
                              <span className="search-result-reference">{verse.label}</span>
                              <SearchVersePreview
                                mode="allStrongs"
                                preview={verse.preview}
                                query={group.query}
                                showStrongsInSearch={showStrongsInSearch}
                                tokens={verse.tokens}
                              />
                            </span>
                          </button>
                          <div className="search-result-actions">
                            <button
                              className="reader-inline-button"
                              onClick={() =>
                                handleCompareResult({
                                  type: "verse",
                                  id: verse.id,
                                  bookSlug: result.bookSlug,
                                  chapterNumber: result.chapterNumber,
                                  verseNumber: verse.verseNumber,
                                  label: verse.label,
                                  description: result.description,
                                  href: verse.href,
                                  preview: verse.preview,
                                  tokens: verse.tokens
                                })
                              }
                              type="button"
                            >
                              Compare
                            </button>
                            <button
                              className="reader-inline-button"
                              onClick={() =>
                                handleSaveReference(
                                  createPassageReference({
                                    version,
                                    bookSlug: result.bookSlug,
                                    chapterNumber: result.chapterNumber,
                                    verseNumber: verse.verseNumber,
                                    sourceType: "search"
                                  })
                                )
                              }
                              type="button"
                            >
                              Save
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </article>
                ) : result.type === "strongs" ? (
                  <article className="search-result search-result-interactive" key={result.id}>
                    <button
                      className="search-result-main"
                      onClick={() => onSelectResult(result, group.query)}
                      type="button"
                    >
                      <div className="search-result-header">
                        <span className={`search-result-type search-result-type-${result.type}`}>
                          {getResultTypeLabel(result.type)}
                        </span>
                        <strong>{result.label}</strong>
                      </div>
                      <p className="search-result-description">{result.description}</p>
                      {"preview" in result ? (
                        <p className="search-result-preview">{result.preview}</p>
                      ) : null}
                    </button>
                  </article>
                ) : "href" in result ? (
                  <article className="search-result search-result-interactive" key={result.id}>
                    <button
                      className="search-result-main"
                      onClick={() => onSelectResult(result)}
                      type="button"
                    >
                      <div className="search-result-header">
                        <span className={`search-result-type search-result-type-${result.type}`}>
                          {getResultTypeLabel(result.type)}
                        </span>
                        <strong>{result.label}</strong>
                      </div>
                      <p className="search-result-description">{result.description}</p>
                      {result.type === "verse" ? (
                        <p className="search-result-reference">{result.label}</p>
                      ) : null}
                      {"preview" in result ? (
                        <SearchVersePreview
                          mode="allStrongs"
                          preview={result.preview}
                          query={group.query}
                          showStrongsInSearch={showStrongsInSearch}
                          tokens={"tokens" in result ? result.tokens : undefined}
                        />
                      ) : null}
                    </button>
                    {result.type === "verse" || result.type === "chapter" ? (
                      <div className="search-result-actions">
                        <button
                          className="reader-inline-button"
                          onClick={() => handleCompareResult(result)}
                          type="button"
                        >
                          Compare
                        </button>
                        <button
                          className="reader-inline-button"
                          onClick={() =>
                            handleSaveReference(
                              createPassageReference({
                                version,
                                bookSlug: result.bookSlug,
                                chapterNumber: result.chapterNumber,
                                verseNumber: result.type === "verse" ? result.verseNumber : undefined,
                                sourceType: "search"
                              })
                            )
                          }
                          type="button"
                        >
                          Save
                        </button>
                      </div>
                    ) : null}
                  </article>
                ) : null
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
