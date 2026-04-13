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
  const [isEditing, setIsEditing] = useState(savedTranslation ? false : true);

  useEffect(() => {
    setDraft(savedTranslation?.text ?? "");
    setIsEditing(savedTranslation ? false : true);
  }, [savedTranslation?.text, referenceKey]);

  const normalizedDraft = draft.trim();
  const normalizedSavedTranslation = savedTranslation?.text.trim() ?? "";
  const canSave = normalizedDraft.length > 0 && normalizedDraft !== normalizedSavedTranslation;
  const canClear = normalizedDraft.length > 0 || normalizedSavedTranslation.length > 0;

  const hasSavedTranslation = Boolean(savedTranslation?.text.trim());

  return (
    <section className={`verse-custom-translation${hasSavedTranslation ? " is-saved" : ""}`}>
      <div className="verse-custom-translation-header">
        <p className="verse-custom-translation-title">Your translation</p>
        {savedTranslation ? (
          <span className="verse-custom-translation-status">Saved in this app</span>
        ) : null}
      </div>
      {hasSavedTranslation && savedTranslation && !isEditing ? (
        <p className="verse-text verse-custom-translation-copy">{savedTranslation.text}</p>
      ) : (
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
      )}
      <div className="verse-custom-translation-actions">
        {hasSavedTranslation && !isEditing ? (
          <button
            className="reader-inline-button verse-study-button"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Edit translation
          </button>
        ) : (
          <button
            className="reader-inline-button verse-study-button"
            disabled={!canSave}
            onClick={() => {
              saveTranslation({
                referenceKey,
                bookSlug,
                chapterNumber,
                verseNumber,
                text: normalizedDraft
              });
              setIsEditing(false);
            }}
            type="button"
          >
            Save translation
          </button>
        )}
        <button
          className="reader-inline-button verse-study-button"
          disabled={!canClear}
          onClick={() => {
            clearTranslation(referenceKey);
            setDraft("");
            setIsEditing(true);
          }}
          type="button"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
