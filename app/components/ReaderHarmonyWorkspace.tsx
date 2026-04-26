"use client";

import { useRouter } from "next/navigation";

import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getBookHighlightedVerseHref, getBookHighlightedVerseRangeHref, getChapterHref } from "@/lib/bible/utils";
import type { HarmonyLine, PassageReference } from "@/lib/bible/types";
import { formatPassageReference } from "@/lib/study-workspace";

function getReferenceHref(reference: PassageReference) {
  if (reference.verseNumber == null) {
    return getChapterHref(reference.bookSlug, reference.chapterNumber, reference.version);
  }

  if (
    reference.endVerseNumber != null &&
    reference.endVerseNumber > reference.verseNumber
  ) {
    return getBookHighlightedVerseRangeHref(
      reference.bookSlug,
      reference.chapterNumber,
      reference.verseNumber,
      reference.endVerseNumber,
      reference.version
    );
  }

  return getBookHighlightedVerseHref(
    reference.bookSlug,
    reference.chapterNumber,
    reference.verseNumber,
    reference.version
  );
}

function renderHarmonyLineLabel(line: HarmonyLine) {
  if (line.kind === "difference" && line.speaker) {
    return `${line.speaker}:`;
  }

  if (line.label?.trim()) {
    return line.label.trim();
  }

  return null;
}

export function ReaderHarmonyWorkspace() {
  const router = useRouter();
  const {
    activeHarmonyId,
    createHarmony,
    deleteHarmony,
    getActiveHarmony,
    getHarmonyDocuments,
    setActiveHarmonyId,
    updateHarmonyTitle
  } = useReaderWorkspace();
  const harmonies = getHarmonyDocuments();
  const activeHarmony = getActiveHarmony();

  return (
    <div className="reader-sermons reader-harmony-workspace">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">Study Workspace</p>
          <h3 className="reader-notebook-title">Gospel harmony</h3>
        </div>
        <button className="reader-inline-button" onClick={() => createHarmony()} type="button">
          New harmony
        </button>
      </div>

      <div className="reader-sermons-layout">
        <div className="reader-sermon-list">
          {harmonies.length === 0 ? (
            <p className="reader-notebook-empty">
              Create a local ESV Gospel harmony document to study the four Gospels in chronological order.
            </p>
          ) : (
            harmonies.map((harmony) => (
              <article
                className={`reader-sermon-list-item${activeHarmonyId === harmony.id ? " is-active" : ""}`}
                key={harmony.id}
              >
                <button
                  className="reader-sermon-list-button"
                  onClick={() => setActiveHarmonyId(harmony.id)}
                  type="button"
                >
                  <strong>{harmony.title}</strong>
                  <span>{harmony.events.length} events</span>
                </button>
                <button
                  aria-label={`Delete ${harmony.title}`}
                  className="reader-inline-button"
                  onClick={() => deleteHarmony(harmony.id)}
                  type="button"
                >
                  Delete
                </button>
              </article>
            ))
          )}
        </div>

        {activeHarmony ? (
          <div className="reader-sermon-editor reader-harmony-editor">
            <label className="reader-notebook-field">
              <span>Document title</span>
              <input
                aria-label="Harmony document title"
                className="reader-notebook-title-input"
                onChange={(event) => updateHarmonyTitle(activeHarmony.id, event.target.value)}
                placeholder="Harmony title"
                type="text"
                value={activeHarmony.title}
              />
            </label>

            <p className="reader-notebook-copy">
              Chronological ESV harmony of Matthew, Mark, Luke, and John. Event references and line references stay attached for quick linking back into the reader.
            </p>

            <div className="reader-harmony-events">
              {activeHarmony.events.map((event) => (
                <section className="reader-notebook-block reader-harmony-event" key={event.id}>
                  <div className="reader-harmony-event-header">
                    <div>
                      <p className="reader-notebook-kicker">Event {event.eventNumber}</p>
                      <h4 className="reader-notebook-title">{event.title}</h4>
                      <p className="reader-toolbar-meta">{event.timeline}</p>
                      {event.chronologyNote ? (
                        <p className="reader-toolbar-summary reader-harmony-note">
                          {event.chronologyNote}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="reader-notebook-references reader-harmony-references">
                    {event.references.map((reference) => (
                      <button
                        className="reader-notebook-reference"
                        key={reference.id}
                        onClick={() => router.push(getReferenceHref(reference))}
                        type="button"
                      >
                        {formatPassageReference(reference)}
                      </button>
                    ))}
                  </div>

                  <div className="reader-harmony-lines">
                    {event.lines.map((line) => {
                      const lineLabel = renderHarmonyLineLabel(line);

                      return (
                        <article className={`reader-harmony-line is-${line.kind}`} key={line.id}>
                          {lineLabel ? (
                            <p className="reader-harmony-line-label">{lineLabel}</p>
                          ) : null}
                          {line.text ? (
                            <p className="reader-harmony-line-text">{line.text}</p>
                          ) : null}
                          <div className="reader-notebook-references reader-harmony-line-references">
                            {line.references.map((reference) => (
                              <button
                                className="reader-notebook-reference"
                                key={`${line.id}:${reference.id}`}
                                onClick={() => router.push(getReferenceHref(reference))}
                                type="button"
                              >
                                {formatPassageReference(reference)}
                              </button>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
