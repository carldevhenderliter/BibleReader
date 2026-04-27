"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { getStrongsEntry, normalizeStrongsNumber } from "@/lib/bible/strongs";
import type {
  EnglishToken,
  EnglishUndertextAnnotation,
  SearchScope,
  StrongsEntry,
  VerseToken
} from "@/lib/bible/types";
import {
  annotationContainsWord,
  buildGreekUndertextSuggestions,
  type FathersScriptureLookupResult,
  findIntersectingAnnotation,
  getAddableFathersAnnotationWordIndexes,
  getFathersEnglishSpanText,
  removeSegmentAnnotation,
  replaceSegmentAnnotation,
  searchGreekUndertextSuggestions,
  searchScriptureUndertextPassages,
  resolveCustomGreekUndertext
} from "@/lib/fathers/annotations";

type FathersEnglishUndertextContentProps = {
  contentId: string;
  english: string;
  englishTokens?: EnglishToken[];
  annotations: EnglishUndertextAnnotation[];
  annotationMode: boolean;
  annotationInteractionMode?: "button" | "word-click";
  annotationModePrompt?: string;
  autoApplySingleWordSuggestion?: boolean;
  separateSentencesByLine?: boolean;
  lineClassName?: string;
  autoSuggestionsBuilder?: (
    selectedText: string,
    selectedWords: string[]
  ) => Promise<UndertextSuggestion[]>;
  onChangeAnnotations: (contentId: string, annotations: EnglishUndertextAnnotation[]) => void;
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
  existingAnnotation: EnglishUndertextAnnotation | null;
  anchorRect: DOMRect;
};

type UndertextSuggestion = {
  greekText: string;
  entryKey: string;
  lemma: string;
  strongs?: string;
  transliteration?: string;
  gloss?: string;
  source?: "verse-token" | "lexicon";
};

type ScriptureDefinitionState = {
  strongsNumber: string;
  tokenText: string;
  entry: StrongsEntry | null;
};

const GREEK_KEYBOARD_ROWS = [
  ["α", "β", "γ", "δ", "ε", "ζ", "η", "θ", "ι", "κ", "λ", "μ"],
  ["ν", "ξ", "ο", "π", "ρ", "σ", "ς", "τ", "υ", "φ", "χ", "ψ", "ω"],
  ["ά", "έ", "ή", "ί", "ό", "ύ", "ώ", "ἀ", "ἁ", "ἐ", "ἑ", "ἰ", "ἱ"],
  ["ὀ", "ὁ", "ὐ", "ὑ", "ὠ", "ὡ", "ᾶ", "ῖ", "ῦ", "ῶ", "·", " "]
] as const;

const SCRIPTURE_SCOPE_OPTIONS: ReadonlyArray<{ value: SearchScope; label: string }> = [
  { value: "all", label: "Whole Bible" },
  { value: "old-testament", label: "Old Testament" },
  { value: "new-testament", label: "New Testament" }
];

function isSentenceBreakSeparator(text: string) {
  return /[.!?](?:["'”’)\]]*)\s*$/u.test(text.trim());
}

function getSelectedWords(
  englishTokens: EnglishToken[],
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
  englishTokens: EnglishToken[],
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

function renderScriptureSearchTokens({
  tokens,
  activeStrongsNumber,
  onOpenDefinition
}: {
  tokens?: VerseToken[];
  activeStrongsNumber?: string | null;
  onOpenDefinition: (strongsNumber: string, tokenText: string) => void;
}) {
  if (!tokens?.length) {
    return null;
  }

  return (
    <div className="fathers-scripture-search-token-list">
      {tokens.map((token, index) => {
        const strongsNumbers = Array.from(
          new Set((token.strongsNumbers ?? []).map((value) => normalizeStrongsNumber(value)))
        );

        return (
          <span className="fathers-scripture-search-token" key={`${index}:${token.text}`}>
            <span className="fathers-scripture-search-token-text">{token.text.trimStart()}</span>
            {strongsNumbers.length ? (
              <span className="fathers-scripture-search-token-strongs-list">
                {strongsNumbers.map((strongsNumber) => (
                  <button
                    aria-label={`Show ${strongsNumber} definition for ${token.text.trim()}`}
                    className={`fathers-scripture-search-token-strongs${
                      activeStrongsNumber === strongsNumber ? " is-active" : ""
                    }`}
                    key={`${index}:${strongsNumber}`}
                    onClick={() => onOpenDefinition(strongsNumber, token.text.trim())}
                    type="button"
                  >
                    {strongsNumber}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export function FathersEnglishUndertextContent({
  contentId,
  english,
  englishTokens,
  annotations,
  annotationMode,
  annotationInteractionMode = "button",
  annotationModePrompt = "Use `+` on any unannotated word to add Greek undertext wherever you want.",
  autoApplySingleWordSuggestion = false,
  separateSentencesByLine = false,
  lineClassName = "verse-text verse-text-body fathers-segment-english",
  autoSuggestionsBuilder = buildGreekUndertextSuggestions,
  onChangeAnnotations,
  onOpenGreekDictionary
}: FathersEnglishUndertextContentProps) {
  const [activeEditor, setActiveEditor] = useState<ActiveEditorState | null>(null);
  const [customGreekText, setCustomGreekText] = useState("");
  const [activeSuggestionsTab, setActiveSuggestionsTab] = useState<
    "auto" | "search" | "scripture" | "definition"
  >("auto");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UndertextSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<UndertextSuggestion[]>([]);
  const [scriptureQuery, setScriptureQuery] = useState("");
  const [scriptureScope, setScriptureScope] = useState<SearchScope>("all");
  const [scriptureResults, setScriptureResults] = useState<FathersScriptureLookupResult[]>([]);
  const [activeScriptureDefinition, setActiveScriptureDefinition] =
    useState<ScriptureDefinitionState | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isScriptureLoading, setIsScriptureLoading] = useState(false);
  const [isDefinitionLoading, setIsDefinitionLoading] = useState(false);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [scriptureError, setScriptureError] = useState<string | null>(null);
  const [definitionError, setDefinitionError] = useState<string | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const definitionRequestIdRef = useRef(0);

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
      setActiveSuggestionsTab("auto");
      setSearchQuery("");
      setSearchResults([]);
      setScriptureQuery("");
      setScriptureScope("all");
      setScriptureResults([]);
      setActiveScriptureDefinition(null);
      setSearchError(null);
      setScriptureError(null);
      setDefinitionError(null);
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

    void autoSuggestionsBuilder(selectedSpanText, selectedWords)
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
  }, [activeEditor, annotationMode, autoSuggestionsBuilder, selectedSpanText, selectedWords]);

  useEffect(() => {
    if (!activeEditor?.existingAnnotation) {
      setCustomGreekText("");
      return;
    }

    setCustomGreekText(activeEditor.existingAnnotation.greekText);
  }, [activeEditor]);

  if (!englishTokens?.length) {
    return <p className={lineClassName}>{english}</p>;
  }

  const closeEditor = () => {
    setActiveEditor(null);
    setCustomGreekText("");
    setActiveSuggestionsTab("auto");
    setSearchQuery("");
    setSearchResults([]);
    setScriptureQuery("");
    setScriptureScope("all");
    setScriptureResults([]);
    setActiveScriptureDefinition(null);
    setEditorError(null);
    setSearchError(null);
    setScriptureError(null);
    setDefinitionError(null);
  };

  const openEditor = (
    startToken: number,
    endToken: number,
    anchorElement: HTMLElement
  ) => {
    const existingAnnotation = findIntersectingAnnotation(annotations, startToken, endToken);

    setEditorError(null);
    setSearchError(null);
    setScriptureError(null);
    setActiveSuggestionsTab("auto");
    setSearchQuery("");
    setSearchResults([]);
    setScriptureQuery("");
    setScriptureResults([]);
    setActiveScriptureDefinition(null);
    setDefinitionError(null);
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
      setSearchError(null);
      setScriptureError(null);
      setActiveSuggestionsTab("auto");
      setSearchQuery("");
      setSearchResults([]);
      setScriptureQuery("");
      setScriptureScope("all");
      setScriptureResults([]);
      setActiveScriptureDefinition(null);
      setActiveEditor({
        startToken: existingAnnotation.startToken,
        endToken: existingAnnotation.endToken,
        existingAnnotation,
        anchorRect: anchorElement.getBoundingClientRect()
      });
      return;
    }

    if (annotationInteractionMode === "word-click" && autoApplySingleWordSuggestion) {
      void handleDirectWordClick(wordIndex, anchorElement);
      return;
    }

    openEditor(wordIndex, wordIndex, anchorElement);
  };

  const handleOpenScriptureDefinition = (strongsNumber: string, tokenText: string) => {
    const normalizedStrongsNumber = normalizeStrongsNumber(strongsNumber);
    const requestId = definitionRequestIdRef.current + 1;
    definitionRequestIdRef.current = requestId;

    setActiveSuggestionsTab("definition");
    setDefinitionError(null);
    setIsDefinitionLoading(true);
    setActiveScriptureDefinition({
      strongsNumber: normalizedStrongsNumber,
      tokenText,
      entry: null
    });

    void getStrongsEntry(normalizedStrongsNumber)
      .then((entry) => {
        if (definitionRequestIdRef.current !== requestId) {
          return;
        }

        setActiveScriptureDefinition({
          strongsNumber: normalizedStrongsNumber,
          tokenText,
          entry
        });
        setIsDefinitionLoading(false);
      })
      .catch(() => {
        if (definitionRequestIdRef.current !== requestId) {
          return;
        }

        setActiveScriptureDefinition({
          strongsNumber: normalizedStrongsNumber,
          tokenText,
          entry: null
        });
        setIsDefinitionLoading(false);
        setDefinitionError("Unable to load the Strong’s definition right now.");
      });
  };

  const handleSuggestionSave = (suggestion: UndertextSuggestion) => {
    const nextEditor = activeEditor;

    if (!nextEditor) {
      return;
    }

    const nextAnnotation = {
      contentId,
      startToken: nextEditor.startToken,
      endToken: nextEditor.endToken,
      greekText: suggestion.greekText,
      entryKey: suggestion.entryKey,
      lemma: suggestion.lemma,
      strongs: suggestion.strongs,
      transliteration: suggestion.transliteration,
      gloss: suggestion.gloss,
      source: suggestion.source ?? ("lexicon" as const)
    };

    onChangeAnnotations(
      contentId,
      replaceSegmentAnnotation(annotations, nextAnnotation)
    );
    setActiveEditor({
      ...nextEditor,
      existingAnnotation: nextAnnotation
    });
    setCustomGreekText(nextAnnotation.greekText);
    setEditorError(null);
  };

  const applySuggestionToRange = (
    startToken: number,
    endToken: number,
    suggestion: UndertextSuggestion
  ) => {
    const nextAnnotation = {
      contentId,
      startToken,
      endToken,
      greekText: suggestion.greekText,
      entryKey: suggestion.entryKey,
      lemma: suggestion.lemma,
      strongs: suggestion.strongs,
      transliteration: suggestion.transliteration,
      gloss: suggestion.gloss,
      source: suggestion.source ?? ("lexicon" as const)
    };

    onChangeAnnotations(contentId, replaceSegmentAnnotation(annotations, nextAnnotation));
    return nextAnnotation;
  };

  const handleDirectWordClick = async (wordIndex: number, anchorElement: HTMLElement) => {
    if (!englishTokens?.length) {
      openEditor(wordIndex, wordIndex, anchorElement);
      return;
    }

    const selectedText = getFathersEnglishSpanText(englishTokens, wordIndex, wordIndex);
    const selectedWords = getSelectedWords(englishTokens, wordIndex, wordIndex);

    try {
      const nextSuggestions = await autoSuggestionsBuilder(selectedText, selectedWords);

      if (nextSuggestions[0]) {
        applySuggestionToRange(wordIndex, wordIndex, nextSuggestions[0]);
        setEditorError(null);
        return;
      }
    } catch {
      // Fall through to the editor when suggestion lookup fails.
    }

    openEditor(wordIndex, wordIndex, anchorElement);
  };

  const handleCustomSave = async () => {
    if (!activeEditor || !customGreekText.trim()) {
      return;
    }

    setIsSavingCustom(true);
    setEditorError(null);

    try {
      const resolvedSuggestion = await resolveCustomGreekUndertext(customGreekText);
      const nextAnnotation = {
        contentId,
        startToken: activeEditor.startToken,
        endToken: activeEditor.endToken,
        greekText: customGreekText.trim(),
        entryKey: resolvedSuggestion?.entryKey,
        lemma: resolvedSuggestion?.lemma,
        strongs: resolvedSuggestion?.strongs,
        transliteration: resolvedSuggestion?.transliteration,
        gloss: resolvedSuggestion?.gloss,
        source: "custom" as const
      };

      onChangeAnnotations(
        contentId,
        replaceSegmentAnnotation(annotations, nextAnnotation)
      );
      setActiveEditor({
        ...activeEditor,
        existingAnnotation: nextAnnotation
      });
      setCustomGreekText(nextAnnotation.greekText);
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
      contentId,
      removeSegmentAnnotation(annotations, activeEditor.existingAnnotation)
    );
    setActiveEditor({
      ...activeEditor,
      existingAnnotation: null
    });
    setCustomGreekText("");
    setEditorError(null);
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

    const maxWidth = Math.min(760, window.innerWidth - 24);
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
  }, [activeEditor]);

  useEffect(() => {
    if (!activeEditor || activeSuggestionsTab !== "search") {
      setSearchResults([]);
      setIsSearchLoading(false);
      setSearchError(null);
      return;
    }

    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearchLoading(false);
      setSearchError(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsSearchLoading(true);
      setSearchError(null);

      void searchGreekUndertextSuggestions(trimmedQuery)
        .then((nextResults) => {
          if (isCancelled) {
            return;
          }

          setSearchResults(nextResults);
          setIsSearchLoading(false);
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }

          setSearchResults([]);
          setIsSearchLoading(false);
          setSearchError("Unable to search the Greek dictionary right now.");
        });
    }, 180);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeEditor, activeSuggestionsTab, searchQuery]);

  useEffect(() => {
    if (!activeEditor || activeSuggestionsTab !== "scripture") {
      setScriptureResults([]);
      setIsScriptureLoading(false);
      setScriptureError(null);
      return;
    }

    const trimmedQuery = scriptureQuery.trim();

    if (!trimmedQuery) {
      setScriptureResults([]);
      setIsScriptureLoading(false);
      setScriptureError(null);
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsScriptureLoading(true);
      setScriptureError(null);

      void searchScriptureUndertextPassages(trimmedQuery, scriptureScope)
        .then((nextResults) => {
          if (isCancelled) {
            return;
          }

          setScriptureResults(nextResults);
          setIsScriptureLoading(false);
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }

          setScriptureResults([]);
          setIsScriptureLoading(false);
          setScriptureError("Unable to search scripture right now.");
        });
    }, 180);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeEditor, activeSuggestionsTab, scriptureQuery, scriptureScope]);

  const renderedContent: ReactNode[] = [];
  const renderedLines: ReactNode[][] = [[]];
  const splitSentences = !annotationMode && separateSentencesByLine;
  let annotationIndex = 0;

  const pushRenderedNode = (node: ReactNode) => {
    if (splitSentences) {
      renderedLines[renderedLines.length - 1]?.push(node);
      return;
    }

    renderedContent.push(node);
  };

  const pushSentenceBreak = () => {
    if (!splitSentences) {
      return;
    }

    const currentLine = renderedLines[renderedLines.length - 1];

    if (currentLine && currentLine.length > 0) {
      renderedLines.push([]);
    }
  };

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

      pushRenderedNode(
        <span
          className={`fathers-annotation-group${isActiveEditor ? " is-editing" : ""}`}
          key={`${contentId}:annotation:${nextAnnotation.startToken}:${nextAnnotation.endToken}`}
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
      pushRenderedNode(
        <span className="fathers-annotation-separator" key={`${contentId}:separator:${tokenIndex}`}>
          {token.text}
        </span>
      );

      if (splitSentences && isSentenceBreakSeparator(token.text)) {
        pushSentenceBreak();
      }
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

    pushRenderedNode(
      annotationMode ? (
        <span
          className={`fathers-annotation-word-wrap${isSelectedInEditor ? " is-selected" : ""}`}
          key={`${contentId}:word:${token.wordIndex}`}
        >
          {canAddAnnotation && annotationInteractionMode === "word-click" ? (
            <button
              aria-label={`Show Greek undertext for ${token.text}`}
              className="fathers-annotation-word-button"
              onClick={(event) =>
                handleWordSelection(token.wordIndex as number, event.currentTarget)
              }
              type="button"
            >
              <span className="fathers-annotation-word-text">{token.text}</span>
            </button>
          ) : (
            <span className="fathers-annotation-word-text">{token.text}</span>
          )}
          {canAddAnnotation && annotationInteractionMode === "button" ? (
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
        <span key={`${contentId}:word:${token.wordIndex}`}>{token.text}</span>
      )
    );
  }

  const sentenceLines = splitSentences
    ? renderedLines.filter((line) => line.length > 0)
    : [];

  return (
    <div className="fathers-segment-english-block">
      {splitSentences ? (
        <div className="fathers-segment-english-sentences">
          {sentenceLines.map((line, index) => (
            <p
              className={`${lineClassName} fathers-sentence-line`}
              key={`${contentId}:sentence-line:${index}`}
            >
              {line}
            </p>
          ))}
        </div>
      ) : (
        <p className={`${lineClassName} fathers-annotation-line`}>
          {renderedContent}
        </p>
      )}
      {annotationMode ? (
        <div className="fathers-annotation-mode-copy">
          {activeEditor ? (
            <p className="reader-toolbar-meta">
              Greek undertext for: <strong>{selectedSpanText}</strong>
            </p>
          ) : (
            <p className="reader-toolbar-meta">
              {annotationModePrompt}
            </p>
          )}
        </div>
      ) : null}
      {annotationMode && activeEditor && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                className="fathers-annotation-popup-backdrop"
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
                <div className="fathers-annotation-popup-layout">
                  <section className="fathers-annotation-suggestions">
                    <div
                      aria-label="Suggestion modes"
                      className="fathers-annotation-tabbar"
                      role="tablist"
                    >
                      <button
                        aria-selected={activeSuggestionsTab === "auto"}
                        className={`fathers-annotation-tab${
                          activeSuggestionsTab === "auto" ? " is-active" : ""
                        }`}
                        onClick={() => setActiveSuggestionsTab("auto")}
                        role="tab"
                        type="button"
                      >
                        Auto
                      </button>
                      <button
                        aria-selected={activeSuggestionsTab === "search"}
                        className={`fathers-annotation-tab${
                          activeSuggestionsTab === "search" ? " is-active" : ""
                        }`}
                        onClick={() => setActiveSuggestionsTab("search")}
                        role="tab"
                        type="button"
                      >
                        Search
                      </button>
                      <button
                        aria-selected={activeSuggestionsTab === "scripture"}
                        className={`fathers-annotation-tab${
                          activeSuggestionsTab === "scripture" ? " is-active" : ""
                        }`}
                        onClick={() => setActiveSuggestionsTab("scripture")}
                        role="tab"
                        type="button"
                      >
                        Scripture
                      </button>
                      {activeScriptureDefinition ? (
                        <button
                          aria-selected={activeSuggestionsTab === "definition"}
                          className={`fathers-annotation-tab${
                            activeSuggestionsTab === "definition" ? " is-active" : ""
                          }`}
                          onClick={() => setActiveSuggestionsTab("definition")}
                          role="tab"
                          type="button"
                        >
                          Definition
                        </button>
                      ) : null}
                    </div>
                    {activeSuggestionsTab === "auto" ? (
                      <>
                        <p className="fathers-annotation-editor-label">Suggestions</p>
                        {isLoadingSuggestions ? (
                          <p className="reader-toolbar-meta">Loading Greek suggestions…</p>
                        ) : suggestions.length ? (
                          <div className="fathers-annotation-suggestion-list">
                            {suggestions.map((suggestion) => (
                              <button
                                className="fathers-annotation-suggestion"
                                key={`${contentId}:${suggestion.entryKey}:${suggestion.greekText}`}
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
                      </>
                    ) : activeSuggestionsTab === "search" ? (
                      <div className="fathers-annotation-search-panel">
                        <label
                          className="reader-settings-field fathers-annotation-search-field"
                          htmlFor={`${contentId}:english-search`}
                        >
                          <span>English search</span>
                          <input
                            id={`${contentId}:english-search`}
                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                            placeholder="Type English meaning"
                            type="search"
                            value={searchQuery}
                          />
                        </label>
                        {isSearchLoading ? (
                          <p className="reader-toolbar-meta">Searching Greek dictionary…</p>
                        ) : searchError ? (
                          <p className="fathers-annotation-error">{searchError}</p>
                        ) : !searchQuery.trim() ? (
                          <p className="reader-toolbar-meta">
                            Type English to search the Greek dictionary as you type.
                          </p>
                        ) : searchResults.length ? (
                          <div className="fathers-annotation-suggestion-list">
                            {searchResults.map((suggestion) => (
                              <button
                                className="fathers-annotation-suggestion"
                                key={`${contentId}:search:${suggestion.entryKey}:${suggestion.greekText}`}
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
                            No Greek dictionary entries matched that English search yet.
                          </p>
                        )}
                      </div>
                    ) : activeSuggestionsTab === "scripture" ? (
                      <div className="fathers-annotation-search-panel">
                        <div className="fathers-scripture-search-controls">
                          <label
                            className="reader-settings-field fathers-annotation-search-field"
                            htmlFor={`${contentId}:scripture-search`}
                          >
                            <span>Scripture lookup</span>
                            <input
                              id={`${contentId}:scripture-search`}
                              onChange={(event) => setScriptureQuery(event.currentTarget.value)}
                              placeholder="Type a word or phrase"
                              type="search"
                              value={scriptureQuery}
                            />
                          </label>
                          <label
                            className="reader-settings-field fathers-scripture-search-scope"
                            htmlFor={`${contentId}:scripture-scope`}
                          >
                            <span>Testament</span>
                            <select
                              id={`${contentId}:scripture-scope`}
                              onChange={(event) =>
                                setScriptureScope(event.currentTarget.value as SearchScope)
                              }
                              value={scriptureScope}
                            >
                              {SCRIPTURE_SCOPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {isScriptureLoading ? (
                          <p className="reader-toolbar-meta">Searching scripture…</p>
                        ) : scriptureError ? (
                          <p className="fathers-annotation-error">{scriptureError}</p>
                        ) : !scriptureQuery.trim() ? (
                          <p className="reader-toolbar-meta">
                            Search the KJV and choose the whole Bible, the Old Testament, or the New Testament.
                          </p>
                        ) : scriptureResults.length ? (
                          <div className="fathers-scripture-search-results">
                            {scriptureResults.map((result) => (
                              <article className="fathers-scripture-search-result" key={result.id}>
                                <div className="fathers-scripture-search-header">
                                  <p className="fathers-scripture-search-reference">{result.label}</p>
                                  <p className="fathers-scripture-search-description">
                                    {result.description}
                                  </p>
                                </div>
                                <p className="fathers-scripture-search-preview">{result.preview}</p>
                                {renderScriptureSearchTokens({
                                  tokens: result.tokens,
                                  activeStrongsNumber: activeScriptureDefinition?.strongsNumber ?? null,
                                  onOpenDefinition: handleOpenScriptureDefinition
                                })}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className="reader-toolbar-meta">
                            No scripture verses matched that lookup yet.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="fathers-annotation-search-panel">
                        <p className="fathers-annotation-editor-label">Strong’s Definition</p>
                        {isDefinitionLoading ? (
                          <p className="reader-toolbar-meta">Loading Strong’s definition…</p>
                        ) : definitionError ? (
                          <p className="fathers-annotation-error">{definitionError}</p>
                        ) : activeScriptureDefinition?.entry ? (
                          <article className="strongs-entry-card fathers-annotation-strongs-card">
                            <div className="strongs-entry-header">
                              <span className="strongs-entry-number">
                                {activeScriptureDefinition.entry.id}
                              </span>
                              <span className="strongs-entry-language">
                                {activeScriptureDefinition.entry.language === "hebrew"
                                  ? "Hebrew Strong’s"
                                  : "Greek Strong’s"}
                              </span>
                            </div>
                            <p className="strongs-entry-lemma">
                              {activeScriptureDefinition.entry.lemma}
                            </p>
                            <p className="strongs-entry-meta">
                              Word clicked: {activeScriptureDefinition.tokenText}
                            </p>
                            {activeScriptureDefinition.entry.transliteration ? (
                              <p className="strongs-entry-meta">
                                Transliteration: {activeScriptureDefinition.entry.transliteration}
                              </p>
                            ) : null}
                            {activeScriptureDefinition.entry.partOfSpeech ? (
                              <p className="strongs-entry-meta">
                                Part of speech: {activeScriptureDefinition.entry.partOfSpeech}
                              </p>
                            ) : null}
                            {activeScriptureDefinition.entry.definition ? (
                              <p className="strongs-entry-copy">
                                {activeScriptureDefinition.entry.definition}
                              </p>
                            ) : null}
                            {activeScriptureDefinition.entry.outlineUsage ? (
                              <p className="strongs-entry-copy">
                                {activeScriptureDefinition.entry.outlineUsage}
                              </p>
                            ) : null}
                            {activeScriptureDefinition.entry.rootWord ? (
                              <p className="strongs-entry-meta">
                                Root word: {activeScriptureDefinition.entry.rootWord}
                              </p>
                            ) : null}
                          </article>
                        ) : activeScriptureDefinition ? (
                          <p className="reader-toolbar-meta">
                            No Strong’s definition is available for {activeScriptureDefinition.strongsNumber}.
                          </p>
                        ) : (
                          <p className="reader-toolbar-meta">
                            Click a Strong’s number in the Scripture tab to open its definition here.
                          </p>
                        )}
                      </div>
                    )}
                  </section>
                  <section className="fathers-annotation-custom">
                    <label
                      className="reader-settings-field fathers-annotation-custom-field"
                      htmlFor={`${contentId}:custom-greek`}
                    >
                      <span>Custom Greek</span>
                      <input
                        id={`${contentId}:custom-greek`}
                        onChange={(event) => setCustomGreekText(event.currentTarget.value)}
                        placeholder="Type Greek text"
                        ref={customInputRef}
                        type="text"
                        value={customGreekText}
                      />
                    </label>
                    <div className="fathers-greek-keyboard" role="group" aria-label="Greek keyboard">
                      {GREEK_KEYBOARD_ROWS.map((row, rowIndex) => (
                        <div className="fathers-greek-keyboard-row" key={`${contentId}:row:${rowIndex}`}>
                          {row.map((keyValue) => (
                            <button
                              aria-label={keyValue === " " ? "Insert space" : `Insert ${keyValue}`}
                              className={`fathers-greek-key${keyValue === " " ? " is-space-key" : ""}`}
                              key={`${contentId}:key:${rowIndex}:${keyValue}`}
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
                        {isSavingCustom ? "Saving…" : "Save custom Greek"}
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
                  </section>
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
