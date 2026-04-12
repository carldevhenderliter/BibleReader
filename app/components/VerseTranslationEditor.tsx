"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getVerseTranslationReferenceKey,
  useVerseTranslationOverrides
} from "@/app/components/VerseTranslationOverridesProvider";

type VerseTranslationEditorProps = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
};

export function VerseTranslationEditor({
  bookSlug,
  chapterNumber,
  verseNumber
}: VerseTranslationEditorProps) {
  const { clearTranslation, getTranslation, saveTranslation } = useVerseTranslationOverrides();
  const referenceKey = useMemo(
    () => getVerseTranslationReferenceKey(bookSlug, chapterNumber, verseNumber),
    [bookSlug, chapterNumber, verseNumber]
  );
  const savedTranslation = getTranslation(referenceKey);
  const [draft, setDraft] = useState(savedTranslation?.text ?? "");

  useEffect(() => {
    setDraft(savedTranslation?.text ?? "");
  }, [savedTranslation?.text, referenceKey]);

  const normalizedDraft = draft.trim();
  const normalizedSavedTranslation = savedTranslation?.text.trim() ?? "";
  const canSave = normalizedDraft.length > 0 && normalizedDraft !== normalizedSavedTranslation;
  const canClear = normalizedDraft.length > 0 || normalizedSavedTranslation.length > 0;

  return (
    <section className="verse-custom-translation">
      <div className="verse-custom-translation-header">
        <p className="verse-custom-translation-title">Your translation</p>
        {savedTranslation ? (
          <span className="verse-custom-translation-status">Saved in this app</span>
        ) : null}
      </div>
      <label className="verse-custom-translation-field" htmlFor={`verse-translation:${referenceKey}`}>
        <span className="sr-only">
          {`Custom translation for ${bookSlug} ${chapterNumber}:${verseNumber}`}
        </span>
        <textarea
          id={`verse-translation:${referenceKey}`}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write your custom verse translation"
          rows={3}
          value={draft}
        />
      </label>
      <div className="verse-custom-translation-actions">
        <button
          className="reader-inline-button verse-study-button"
          disabled={!canSave}
          onClick={() =>
            saveTranslation({
              referenceKey,
              bookSlug,
              chapterNumber,
              verseNumber,
              text: normalizedDraft
            })
          }
          type="button"
        >
          Save translation
        </button>
        <button
          className="reader-inline-button verse-study-button"
          disabled={!canClear}
          onClick={() => {
            clearTranslation(referenceKey);
            setDraft("");
          }}
          type="button"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
