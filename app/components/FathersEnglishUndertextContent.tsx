"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  annotationContainsWord,
  buildGreekUndertextSuggestions,
  findIntersectingAnnotation,
  getAddableFathersAnnotationWordIndexes,
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
  anchorRect: DOMRect;
};

const GREEK_KEYBOARD_ROWS = [
  ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ"],
  ["ν", "ξ", "ο", "π", "ρ", "σ", "ς", "τ", "υ", "φ", "χ", "ψ", "ω"],
  ["ά", "έ", "ή", "ί", "ό", "ύ", "ώ", "ἀ", "ἁ", "ἐ", "ἑ", "ἰ", "ἱ"],
  ["ὀ", "ὁ", "ὐ", "ὑ", "ὠ", "ὡ", "ᾶ", "ῖ", "ῦ", "ῶ", "·", " "]
] as const;

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
  const customInputRef = useRef<HTMLInputElement | null>(null);

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

  const closeEditor = () => {
    setActiveEditor(null);
    setCustomGreekText("");
    setEditorError(null);
  };

  const openEditor = (
    startToken: number,
    endToken: number,
    anchorElement: HTMLElement
  ) => {
    const existingAnnotation = findIntersectingAnnotation(annotations, startToken, endToken);

    setEditorError(null);
    setActiveEditor({
      startToken: existingAnnotation?.startToken ?? startToken,
      endToken: existingAnnotation?.endToken ?? endToken,
      existingAnnotation,
      anchorRect: anchorElement.getBoundingClientRect()
    });
  };

  const handleWordSelection = (wordIndex: number, anchorElement: HTMLElement) => {
    if (!annotationMode) {
      return;
    }

    const existingAnnotation = annotations.find((annotation) => annotationContainsWord(annotation, wordIndex));

    if (existingAnnotation) {
      setEditorError(null);
      setActiveEditor({
        startToken: existingAnnotation.startToken,
        endToken: existingAnnotation.endToken,
        existingAnnotation,
        anchorRect: anchorElement.getBoundingClientRect()
      });
      return;
    }

    openEditor(wordIndex, wordIndex, anchorElement);
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
    closeEditor();
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
      closeEditor();
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
    closeEditor();
  };

  const insertGreekText = (text: string) => {
    const input = customInputRef.current;
    const selectionStart = input?.selectionStart ?? customGreekText.length;
    const selectionEnd = input?.selectionEnd ?? customGreekText.length;

    setCustomGreekText((current) => {
      const nextValue = current.slice(0, selectionStart) + text + current.slice(selectionEnd);

      window.requestAnimationFrame(() => {
        const nextCursorPosition = selectionStart + text.length;

        customInputRef.current?.focus();
        customInputRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });

      return nextValue;
    });
  };

  const deleteGreekTextBackward = () => {
    const input = customInputRef.current;
    const selectionStart = input?.selectionStart ?? customGreekText.length;
    const selectionEnd = input?.selectionEnd ?? customGreekText.length;

    if (selectionStart === 0 && selectionEnd === 0) {
      return;
    }

    setCustomGreekText((current) => {
      let nextValue = current;
      let nextCursorPosition = selectionStart;

      if (selectionStart !== selectionEnd) {
        nextValue = current.slice(0, selectionStart) + current.slice(selectionEnd);
      } else {
        nextValue =
          current.slice(0, Math.max(0, selectionStart - 1)) + current.slice(selectionEnd);
        nextCursorPosition = Math.max(0, selectionStart - 1);
      }

      window.requestAnimationFrame(() => {
        customInputRef.current?.focus();
        customInputRef.current?.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });

      return nextValue;
    });
  };

  const addableWordIndexes = new Set(
    getAddableFathersAnnotationWordIndexes(englishTokens, annotations)
  );

  const activeEditorRange =
    activeEditor !== null
      ? {
          startToken: activeEditor.startToken,
          endToken: activeEditor.endToken
        }
      : null;

  const popupStyle = useMemo(() => {
    if (!activeEditor || typeof window === "undefined") {
      return undefined;
    }

    const maxWidth = Math.min(420, window.innerWidth - 24);
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(viewportPadding, activeEditor.anchorRect.left),
      window.innerWidth - maxWidth - viewportPadding
    );
    const top = Math.min(
      Math.max(viewportPadding, activeEditor.anchorRect.bottom + 10),
      window.innerHeight - 220
    );

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${maxWidth}px`
    };
  }, [activeEditor]);

  useEffect(() => {
    if (!activeEditor) {
      return;
    }

    window.requestAnimationFrame(() => {
      customInputRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeEditor();
      }
    };
    const handleViewportChange = () => {
      closeEditor();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [activeEditor]);

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
              onClick={(event) =>
                openEditor(
                  nextAnnotation.startToken,
                  nextAnnotation.endToken,
                  event.currentTarget
                )
              }
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
      annotationMode && token.wordIndex !== undefined && addableWordIndexes.has(token.wordIndex);

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
              onClick={(event) =>
                handleWordSelection(token.wordIndex as number, event.currentTarget)
              }
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
              Start on any word with `+`, then keep adding from the edges of what you have already annotated.
            </p>
          )}
        </div>
      ) : null}
      {annotationMode && activeEditor && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                aria-label="Close Greek undertext editor"
                className="fathers-annotation-popup-backdrop"
                onClick={closeEditor}
                type="button"
              />
              <aside
                aria-label="Greek undertext editor"
                className="fathers-annotation-popup"
                role="dialog"
                style={popupStyle}
              >
                <div className="fathers-annotation-editor-header">
                  <div>
                    <p className="fathers-annotation-editor-title">Greek undertext</p>
                    <p className="fathers-annotation-editor-meta">{selectedSpanText}</p>
                  </div>
                  <button className="reader-inline-button" onClick={closeEditor} type="button">
                    Close
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
                          <span className="fathers-annotation-suggestion-greek">
                            {suggestion.greekText}
                          </span>
                          <span className="fathers-annotation-suggestion-meta">
                            {suggestion.transliteration ?? suggestion.lemma}
                            {suggestion.gloss ? ` · ${suggestion.gloss}` : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="reader-toolbar-meta">
                      No lexicon suggestions matched this English span yet.
                    </p>
                  )}
                </div>
                <div className="fathers-annotation-custom">
                  <label
                    className="reader-settings-field fathers-annotation-custom-field"
                    htmlFor={`${segmentId}:custom-greek`}
                  >
                    <span>Custom Greek</span>
                    <input
                      id={`${segmentId}:custom-greek`}
                      onChange={(event) => setCustomGreekText(event.currentTarget.value)}
                      placeholder="Type Greek text"
                      ref={customInputRef}
                      type="text"
                      value={customGreekText}
                    />
                  </label>
                  <div className="fathers-greek-keyboard" role="group" aria-label="Greek keyboard">
                    {GREEK_KEYBOARD_ROWS.map((row, rowIndex) => (
                      <div className="fathers-greek-keyboard-row" key={`${segmentId}:row:${rowIndex}`}>
                        {row.map((keyValue) => (
                          <button
                            aria-label={keyValue === " " ? "Insert space" : `Insert ${keyValue}`}
                            className={`fathers-greek-key${keyValue === " " ? " is-space-key" : ""}`}
                            key={`${segmentId}:key:${rowIndex}:${keyValue}`}
                            onClick={() => insertGreekText(keyValue)}
                            type="button"
                          >
                            {keyValue === " " ? "Space" : keyValue}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="fathers-greek-keyboard-row">
                      <button
                        aria-label="Delete Greek character"
                        className="fathers-greek-key fathers-greek-key-action"
                        onClick={deleteGreekTextBackward}
                        type="button"
                      >
                        ⌫
                      </button>
                    </div>
                  </div>
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
              </aside>
            </>,
            document.body
          )
        : null}
    </div>
  );
}
