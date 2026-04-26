"use client";

import { useRouter } from "next/navigation";

import type { HarmonyEvent, HarmonyLine, PassageReference } from "@/lib/bible/types";
import { getBookHighlightedVerseHref, getBookHighlightedVerseRangeHref, getChapterHref } from "@/lib/bible/utils";
import { formatPassageReference } from "@/lib/study-workspace";

function getReferenceHref(reference: PassageReference) {
  if (reference.verseNumber == null) {
    return getChapterHref(reference.bookSlug, reference.chapterNumber, reference.version);
  }

  if (reference.endVerseNumber != null && reference.endVerseNumber > reference.verseNumber) {
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

type ReaderHarmonyContentProps = {
  events: HarmonyEvent[];
};

export function ReaderHarmonyContent({ events }: ReaderHarmonyContentProps) {
  const router = useRouter();

  return (
    <div className="reader-harmony-events">
      {events.map((event) => (
        <section className="reader-notebook-block reader-harmony-event" key={event.id}>
          <div className="reader-harmony-event-header">
            <div>
              <p className="reader-notebook-kicker">Event {event.eventNumber}</p>
              <h4 className="reader-notebook-title">{event.title}</h4>
              <p className="reader-toolbar-meta">{event.timeline}</p>
              {event.chronologyNote ? (
                <p className="reader-toolbar-summary reader-harmony-note">{event.chronologyNote}</p>
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
                  {lineLabel ? <p className="reader-harmony-line-label">{lineLabel}</p> : null}
                  {line.text ? <p className="reader-harmony-line-text">{line.text}</p> : null}
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
  );
}
