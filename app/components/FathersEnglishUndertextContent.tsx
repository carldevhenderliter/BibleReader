"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  annotationContainsWord,
  buildGreekUndertextSuggestions,
  findIntersectingAnnotation,
  getFathersEnglishSpanText,
  removeSegmentAnnotation,
  replaceSegmentAnnotation,
  resolveCustomGreekUndertext
} from "@/lib/fathers/annotations";
import type {
  FathersEnglishToken,
  FathersGreekUndertextAnnotation
} from "@/lib/fathers/types";

type FathersEnglishUndertextContentProps = {
  segmentId: string;
  english: string;
  englishTokens?: FathersEnglishToken[];
  annotations: FathersGreekUndertextAnnotation[];
  annotationMode: boolean;
  onChangeAnnotations: (segmentId: string, annotations: FathersGreekUndertextAnnotation[]) => void;
  onOpenGreekDictionary?: (selection: {
    entryKey: string;
    strongs?: string | null;
    lemma: string;
    label?: string | null;
    matchedQuery?: string | null;
  }) => void;
};

type ActiveEditorState = {
  startToken: number;
  endToken: number;
  existingAnnotation: FathersGreekUndertextAnnotation | null;
};

function getSelectedWords(
  englishTokens: FathersEnglishToken[],
  startToken: number,
  endToken: number
) {
  return englishTokens
    .filter(
      (token) =>
        token.type === "word" &&
        token.wordIndex !== undefined &&
        token.wordIndex >= startToken &&
        token.wordIndex <= endToken
    )
    .map((token) => token.text);
}

function getAnnotationPhraseText(
  englishTokens: FathersEnglishToken[],
  startToken: number,
  endToken: number
) {
  let text = "";
  let started = false;
  let completed = false;

  for (const token of englishTokens) {
    if (token.type === "word") {
      if (token.wordIndex === startToken) {
        started = true;
      }

      if (!started || completed) {
        continue;
      }

      text += token.text;

      if (token.wordIndex === endToken) {
        completed = true;
      }

      continue;
    }

    if (started && !completed) {
      text += token.text;
    }
  }

  return text;
}

export function FathersEnglishUndertextContent({
  segmentId,
  english,
  englishTokens,
  annotations,
  annotationMode,
  onChangeAnnotations,
  onOpenGreekDictionary
}: FathersEnglishUndertextContentProps) {
  const [activeEditor, setActiveEditor] = useState<ActiveEditorState | null>(null);
  const [customGreekText, setCustomGreekText] = useState("");
  const [suggestions, setSuggestions] = useState<
    Array<{
      greekText: string;
      entryKey: string;
      lemma: string;
      strongs?: string;
      transliteration?: string;
      gloss?: string;
    }>
  >([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const selectedSpanText = useMemo(() => {
    if (!englishTokens || !activeEditor) {
      return "";
    }

    return getFathersEnglishSpanText(englishTokens, activeEditor.startToken, activeEditor.endToken);
  }, [activeEditor, englishTokens]);

  const selectedWords = useMemo(() => {
    if (!englishTokens || !activeEditor) {
      return [];
    }

    return getSelectedWords(englishTokens, activeEditor.startToken, activeEditor.endToken);
  }, [activeEditor, englishTokens]);

  useEffect(() => {
    if (!annotationMode) {
      setActiveEditor(null);
      setCustomGreekText("");
      setEditorError(null);
    }
  }, [annotationMode]);

  useEffect(() => {
    if (!annotationMode || !activeEditor || !selectedSpanText) {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingSuggestions(true);
    setEditorError(null);

    void buildGreekUndertextSuggestions(selectedSpanText, selectedWords)
      .then((nextSuggestions) => {
        if (isCancelled) {
          return;
        }

        setSuggestions(nextSuggestions);
        setIsLoadingSuggestions(false);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setSuggestions([]);
        setIsLoadingSuggestions(false);
        setEditorError("Unable to load Greek suggestions for this English span.");
      });

    return () => {
      isCancelled = true;
    };
  }, [activeEditor, annotationMode, selectedSpanText, selectedWords]);

  useEffect(() => {
    if (!activeEditor?.existingAnnotation) {
      setCustomGreekText("");
      return;
    }

    setCustomGreekText(activeEditor.existingAnnotation.greekText);
  }, [activeEditor]);

  if (!englishTokens?.length) {
    return <p className="verse-text verse-text-body fathers-segment-english">{english}</p>;
  }

  const openEditor = (startToken: number, endToken: number) => {
    const existingAnnotation = findIntersectingAnnotation(annotations, startToken, endToken);

    setEditorError(null);
    setActiveEditor({
      startToken: existingAnnotation?.startToken ?? startToken,
      endToken: existingAnnotation?.endToken ?? endToken,
      existingAnnotation
    });
  };

  const handleWordSelection = (wordIndex: number) => {
    if (!annotationMode) {
      return;
    }

    const existingAnnotation = annotations.find((annotation) => annotationContainsWord(annotation, wordIndex));

    if (existingAnnotation) {
      setEditorError(null);
      setActiveEditor({
        startToken: existingAnnotation.startToken,
        endToken: existingAnnotation.endToken,
        existingAnnotation
      });
      return;
    }

    openEditor(wordIndex, wordIndex);
  };

  const handleSuggestionSave = (suggestion: {
    greekText: string;
    entryKey: string;
    lemma: string;
    strongs?: string;
    transliteration?: string;
    gloss?: string;
  }) => {
    const nextEditor = activeEditor;

    if (!nextEditor) {
      return;
    }

    onChangeAnnotations(
      segmentId,
      replaceSegmentAnnotation(annotations, {
        segmentId,
        startToken: nextEditor.startToken,
        endToken: nextEditor.endToken,
        greekText: suggestion.greekText,
        entryKey: suggestion.entryKey,
        lemma: suggestion.lemma,
        strongs: suggestion.strongs,
        transliteration: suggestion.transliteration,
        gloss: suggestion.gloss,
        source: "lexicon"
      })
    );
    setActiveEditor(null);
    setCustomGreekText("");
    setEditorError(null);
  };

  const handleCustomSave = async () => {
    if (!activeEditor || !customGreekText.trim()) {
      return;
    }

    setIsSavingCustom(true);
    setEditorError(null);

    try {
      const resolvedSuggestion = await resolveCustomGreekUndertext(customGreekText);

      onChangeAnnotations(
        segmentId,
        replaceSegmentAnnotation(annotations, {
          segmentId,
          startToken: activeEditor.startToken,
          endToken: activeEditor.endToken,
          greekText: customGreekText.trim(),
          entryKey: resolvedSuggestion?.entryKey,
          lemma: resolvedSuggestion?.lemma,
          strongs: resolvedSuggestion?.strongs,
          transliteration: resolvedSuggestion?.transliteration,
          gloss: resolvedSuggestion?.gloss,
          source: "custom"
        })
      );
      setActiveEditor(null);
      setCustomGreekText("");
    } catch {
      setEditorError("Unable to save this Greek undertext right now.");
    } finally {
      setIsSavingCustom(false);
    }
  };

  const handleRemoveAnnotation = () => {
    if (!activeEditor?.existingAnnotation) {
      return;
    }

    onChangeAnnotations(
      segmentId,
      removeSegmentAnnotation(annotations, activeEditor.existingAnnotation)
    );
    setActiveEditor(null);
    setCustomGreekText("");
    setEditorError(null);
  };

  const nextSequentialTokenIndex =
    annotations.reduce((highestIndex, annotation) => Math.max(highestIndex, annotation.endToken), -1) +
    1;

  const activeEditorRange =
    activeEditor !== null
      ? {
          startToken: activeEditor.startToken,
          endToken: activeEditor.endToken
        }
      : null;

  const renderedContent: ReactNode[] = [];
  let annotationIndex = 0;

  for (let tokenIndex = 0; tokenIndex < englishTokens.length; tokenIndex += 1) {
    const token = englishTokens[tokenIndex];
    const nextAnnotation = annotations[annotationIndex];

    if (
      nextAnnotation &&
      token.type === "word" &&
      token.wordIndex === nextAnnotation.startToken
    ) {
      const phraseText = getAnnotationPhraseText(
        englishTokens,
        nextAnnotation.startToken,
        nextAnnotation.endToken
      );
      const isActiveEditor =
        activeEditorRange !== null &&
        activeEditorRange.startToken === nextAnnotation.startToken &&
        activeEditorRange.endToken === nextAnnotation.endToken;
      let nextTokenIndex = tokenIndex;

      while (nextTokenIndex < englishTokens.length) {
        const nextToken = englishTokens[nextTokenIndex];

        if (
          nextToken.type === "word" &&
          nextToken.wordIndex !== undefined &&
          nextToken.wordIndex > nextAnnotation.endToken
        ) {
          break;
        }

        nextTokenIndex += 1;
      }

      renderedContent.push(
        <span
          className={`fathers-annotation-group${isActiveEditor ? " is-editing" : ""}`}
          key={`${segmentId}:annotation:${nextAnnotation.startToken}:${nextAnnotation.endToken}`}
        >
          {annotationMode ? (
            <button
              className="fathers-annotation-anchor"
              onClick={() => openEditor(nextAnnotation.startToken, nextAnnotation.endToken)}
              type="button"
            >
              <span className="fathers-annotation-anchor-text">{phraseText}</span>
              <span className="fathers-annotation-undertext">{nextAnnotation.greekText}</span>
            </button>
          ) : nextAnnotation.entryKey && nextAnnotation.lemma && onOpenGreekDictionary ? (
            <button
              className="fathers-annotation-anchor"
              onClick={() =>
                onOpenGreekDictionary({
                  entryKey: nextAnnotation.entryKey as string,
                  strongs: nextAnnotation.strongs ?? null,
                  lemma: nextAnnotation.lemma as string,
                  label: nextAnnotation.lemma ?? nextAnnotation.greekText,
                  matchedQuery: nextAnnotation.greekText
                })
              }
              type="button"
            >
              <span className="fathers-annotation-anchor-text">{phraseText}</span>
              <span className="fathers-annotation-undertext">{nextAnnotation.greekText}</span>
            </button>
          ) : (
            <span className="fathers-annotation-anchor fathers-annotation-anchor-static">
              <span className="fathers-annotation-anchor-text">{phraseText}</span>
              <span className="fathers-annotation-undertext">{nextAnnotation.greekText}</span>
            </span>
          )}
        </span>
      );

      tokenIndex = nextTokenIndex - 1;
      annotationIndex += 1;
      continue;
    }

    if (token.type === "separator") {
      renderedContent.push(
        <span className="fathers-annotation-separator" key={`${segmentId}:separator:${tokenIndex}`}>
          {token.text}
        </span>
      );
      continue;
    }

    const isSelectedInEditor =
      annotationMode &&
      activeEditorRange !== null &&
      token.wordIndex !== undefined &&
      token.wordIndex >= activeEditorRange.startToken &&
      token.wordIndex <= activeEditorRange.endToken;
    const canAddAnnotation =
      annotationMode && token.wordIndex !== undefined && token.wordIndex === nextSequentialTokenIndex;

    renderedContent.push(
      annotationMode ? (
        <span
          className={`fathers-annotation-word-wrap${isSelectedInEditor ? " is-selected" : ""}`}
          key={`${segmentId}:word:${token.wordIndex}`}
        >
          <span className="fathers-annotation-word-text">{token.text}</span>
          {canAddAnnotation ? (
            <button
              aria-label={`Add Greek undertext for ${token.text}`}
              className="fathers-annotation-add-button"
              onClick={() => handleWordSelection(token.wordIndex as number)}
              type="button"
            >
              +
            </button>
          ) : null}
        </span>
      ) : (
        <span key={`${segmentId}:word:${token.wordIndex}`}>{token.text}</span>
      )
    );
  }

  return (
    <div className="fathers-segment-english-block">
      <p className="verse-text verse-text-body fathers-segment-english fathers-annotation-line">
        {renderedContent}
      </p>
      {annotationMode ? (
        <div className="fathers-annotation-mode-copy">
          {activeEditor ? (
            <p className="reader-toolbar-meta">
              Greek undertext for: <strong>{selectedSpanText}</strong>
            </p>
          ) : (
            <p className="reader-toolbar-meta">
              Use the `+` button beside the next word to add Greek undertext in order.
            </p>
          )}
        </div>
      ) : null}
      {annotationMode && activeEditor ? (
        <div className="fathers-annotation-editor" role="group" aria-label="Greek undertext editor">
          <div className="fathers-annotation-editor-header">
            <div>
              <p className="fathers-annotation-editor-title">Greek undertext</p>
              <p className="fathers-annotation-editor-meta">{selectedSpanText}</p>
            </div>
            <button
              className="reader-inline-button"
              onClick={() => {
                setActiveEditor(null);
                setCustomGreekText("");
                setEditorError(null);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
          <div className="fathers-annotation-suggestions">
            <p className="fathers-annotation-editor-label">Suggestions</p>
            {isLoadingSuggestions ? (
              <p className="reader-toolbar-meta">Loading Greek suggestions…</p>
            ) : suggestions.length ? (
              <div className="fathers-annotation-suggestion-list">
                {suggestions.map((suggestion) => (
                  <button
                    className="fathers-annotation-suggestion"
                    key={`${segmentId}:${suggestion.entryKey}:${suggestion.greekText}`}
                    onClick={() => handleSuggestionSave(suggestion)}
                    type="button"
                  >
                    <span className="fathers-annotation-suggestion-greek">{suggestion.greekText}</span>
                    <span className="fathers-annotation-suggestion-meta">
                      {suggestion.transliteration ?? suggestion.lemma}
                      {suggestion.gloss ? ` · ${suggestion.gloss}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="reader-toolbar-meta">No lexicon suggestions matched this English span yet.</p>
            )}
          </div>
          <div className="fathers-annotation-custom">
            <label className="reader-settings-field fathers-annotation-custom-field" htmlFor={`${segmentId}:custom-greek`}>
              <span>Custom Greek</span>
              <input
                id={`${segmentId}:custom-greek`}
                onChange={(event) => setCustomGreekText(event.currentTarget.value)}
                placeholder="Type Greek text"
                type="text"
                value={customGreekText}
              />
            </label>
            <div className="fathers-annotation-editor-actions">
              <button
                className="reader-inline-button"
                disabled={!customGreekText.trim() || isSavingCustom}
                onClick={() => void handleCustomSave()}
                type="button"
              >
                {isSavingCustom ? "Saving…" : "Save Greek"}
              </button>
              {activeEditor.existingAnnotation ? (
                <button
                  className="reader-inline-button reader-inline-button-subtle"
                  onClick={handleRemoveAnnotation}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          {editorError ? <p className="fathers-annotation-error">{editorError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
