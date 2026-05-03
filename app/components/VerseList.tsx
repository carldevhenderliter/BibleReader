"use client";

import { useEffect } from "react";

import { useBibleGreekUndertext } from "@/app/components/BibleGreekUndertextProvider";
import { FathersEnglishUndertextContent } from "@/app/components/FathersEnglishUndertextContent";
import { GreekInterlinearLine } from "@/app/components/GreekInterlinearLine";
import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseTranslationEditor } from "@/app/components/VerseTranslationEditor";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import {
  buildBibleGreekUndertextSuggestions,
  getBibleVerseAnnotationKey,
  tokenizeBibleEnglishText
} from "@/lib/bible/annotations";
import {
  getGreekTokenOccurrenceKey
} from "@/lib/bible/greek";
import type {
  EnglishUndertextAnnotation,
  EsvInterlinearDisplayVerse,
  GreekToken,
  Verse
} from "@/lib/bible/types";

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
  interlinearVerseMap?: Record<number, EsvInterlinearDisplayVerse>;
  showInterlinearOnly?: boolean;
  showVerseNumbers?: boolean;
  showVerseText?: boolean;
  showCompanionVerseTranslation?: boolean;
  showAnnotatedGreekUndertext?: boolean;
  showCustomVerseTranslation?: boolean;
  showGreekSurface?: boolean;
  showGreekLemma?: boolean;
  showGreekTransliteration?: boolean;
  showGreekGloss?: boolean;
  annotationMode?: boolean;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
  showStrongs?: boolean;
  verses: Verse[];
};

export function VerseList({
  bookSlug,
  chapterNumber,
  interlinearVerseMap,
  showInterlinearOnly = false,
  showVerseNumbers = true,
  showVerseText,
  showCompanionVerseTranslation = true,
  showAnnotatedGreekUndertext = true,
  showCustomVerseTranslation = true,
  showGreekSurface = true,
  showGreekLemma = true,
  showGreekTransliteration = true,
  showGreekGloss = true,
  annotationMode = false,
  highlightedVerseNumber,
  highlightedVerseRange,
  showStrongs = false,
  verses
}: VerseListProps) {
  const { version } = useReaderVersion();
  const isStandaloneGreekVersion = version === "greek" || version === "tr";
  const {
    isGreekLearningMode,
    openGreekDictionary,
    openStrongs,
    startGreekLearningSession
  } = useReaderWorkspace();
  const { getVerseAnnotations, saveVerseAnnotations } = useBibleGreekUndertext();
  const activeHighlightedVerseNumber = highlightedVerseNumber ?? null;
  const activeHighlightedVerseRange = highlightedVerseRange ?? null;
  const shouldShowVerseText = showVerseText ?? !showInterlinearOnly;
  const shouldShowGreekTokens =
    showGreekSurface || showGreekLemma || showGreekTransliteration || showGreekGloss;

  useEffect(() => {
    const scrollTargetVerseNumber =
      activeHighlightedVerseRange?.start ?? activeHighlightedVerseNumber ?? null;

    if (!scrollTargetVerseNumber) {
      return;
    }

    const element = document.getElementById(
      `verse-${bookSlug}-${chapterNumber}-${scrollTargetVerseNumber}`
    );

    element?.scrollIntoView?.({ block: "center" });
  }, [activeHighlightedVerseNumber, activeHighlightedVerseRange, bookSlug, chapterNumber]);

  return (
    <div className="verse-stack">
      {verses.map((verse) => {
        const greekVersionInterlinearVerse =
          isStandaloneGreekVersion && verse.greekTokens?.length
            ? {
                number: verse.number,
                baseGreek: verse.text,
                greek: verse.text,
                tokens: verse.greekTokens
              }
            : null;
        const activeGreekVerse =
          greekVersionInterlinearVerse ?? interlinearVerseMap?.[verse.number] ?? null;
        const isHighlighted =
          activeHighlightedVerseRange !== null
            ? verse.number >= activeHighlightedVerseRange.start &&
              verse.number <= activeHighlightedVerseRange.end
            : activeHighlightedVerseNumber === verse.number;
        const verseKey = getBibleVerseAnnotationKey(bookSlug, chapterNumber, verse.number);
        const verseAnnotations = getVerseAnnotations(verseKey);
        const activeGreekTokens = activeGreekVerse?.tokens ?? verse.greekTokens ?? [];
        const canAnnotateGreekVersionTranslation =
          isStandaloneGreekVersion &&
          Boolean(verse.greekTokens?.length) &&
          Boolean(verse.translationText?.trim()) &&
          showCompanionVerseTranslation;
        const canAnnotateInterlinearVerse =
          !isStandaloneGreekVersion &&
          Boolean(activeGreekVerse?.tokens?.length) &&
          shouldShowVerseText;
        const bibleAnnotationText = canAnnotateGreekVersionTranslation
          ? verse.translationText?.trim() ?? ""
          : canAnnotateInterlinearVerse
            ? verse.text
            : "";
        const bibleAnnotationTokens = bibleAnnotationText
          ? tokenizeBibleEnglishText(bibleAnnotationText)
          : [];
        const undertextAnnotations: EnglishUndertextAnnotation[] = verseAnnotations.map(
          (annotation) => ({
            contentId: verseKey,
            startToken: annotation.startToken,
            endToken: annotation.endToken,
            greekText: annotation.greekText,
            entryKey: annotation.entryKey,
            lemma: annotation.lemma,
            strongs: annotation.strongs,
            transliteration: annotation.transliteration,
            gloss: annotation.gloss,
            source: annotation.source
          })
        );
        const showBibleAnnotationLine =
          (annotationMode ||
            (showAnnotatedGreekUndertext && undertextAnnotations.length > 0)) &&
          bibleAnnotationTokens.length > 0;
        const greekLearningScopeKey = `verse:${version}:${bookSlug}:${chapterNumber}:${verse.number}`;
        const startLearningSession = (occurrenceKey: string | null) => {
          const activeGreekLearningQueue =
            activeGreekVerse?.tokens?.map((token, tokenIndex) => ({
              entryKey: token.entryKey ?? token.strongs ?? token.lemma,
              strongs: token.strongs ?? null,
              lemma: token.lemma,
              label: token.lemma,
              occurrenceKey:
                token.occurrenceKey ??
                getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verse.number, tokenIndex),
              selectedForm: token.surface,
              selectedFormMorphology: token.morphology ?? null,
              selectedFormDecodedMorphology: token.decodedMorphology ?? null,
              matchedQuery: token.surface,
              transliteration: token.transliteration ?? null,
              gloss: token.gloss ?? null
            })) ?? [];

          if (activeGreekLearningQueue.length === 0) {
            return;
          }

          startGreekLearningSession(
            activeGreekLearningQueue,
            occurrenceKey,
            greekLearningScopeKey
          );
        };
        const handleGreekTokenSelection = (token: GreekToken) => {
          const entryKey = token.entryKey ?? token.strongs ?? token.lemma;

          if (isGreekLearningMode) {
            startLearningSession(token.occurrenceKey ?? null);
            return;
          }

          openGreekDictionary({
            entryKey,
            strongs: token.strongs ?? null,
            lemma: token.lemma,
            label: token.lemma,
            occurrenceKey: token.occurrenceKey ?? null,
            selectedForm: token.surface,
            selectedFormMorphology: token.morphology ?? null,
            selectedFormDecodedMorphology: token.decodedMorphology ?? null,
            matchedQuery: token.surface,
            transliteration: token.transliteration ?? null,
            gloss: token.gloss ?? null
          });
        };

        return (
          <div
            className={`verse-row${isHighlighted ? " is-highlighted" : ""}`}
            id={`verse-${bookSlug}-${chapterNumber}-${verse.number}`}
            key={verse.number}
          >
            {showVerseNumbers ? (
              <span className="verse-number" aria-hidden="true">
                {verse.number}
              </span>
            ) : null}
            <div className="verse-content">
              {shouldShowVerseText || (isStandaloneGreekVersion && showCompanionVerseTranslation) ? (
                <>
                  {shouldShowVerseText ? (
                    isStandaloneGreekVersion && verse.greekTokens?.length ? (
                      <GreekVerseTextContent
                        className="verse-text verse-text-greek"
                        greekLearningScopeKey={greekLearningScopeKey}
                        getOccurrenceKey={(token, tokenIndex) =>
                          token.occurrenceKey ??
                          getGreekTokenOccurrenceKey(
                            bookSlug,
                            chapterNumber,
                            verse.number,
                            tokenIndex
                          )
                        }
                        onOpenGreekDictionary={(selection) => {
                          if (isGreekLearningMode) {
                            startLearningSession(selection.occurrenceKey ?? null);
                            return;
                          }

                          openGreekDictionary(selection);
                        }}
                        showStrongsNumbers={version === "tr"}
                        verse={verse}
                      />
                    ) : showStrongs && verse.tokens?.length ? (
                      <VerseTextContent
                        className="verse-text verse-text-body verse-text-rich"
                        onOpenStrongs={(strongsNumbers) =>
                          openStrongs(strongsNumbers, strongsNumbers.join(" "))
                        }
                        showOriginalLanguageGloss={showGreekGloss}
                        showOriginalLanguageLemma={showGreekLemma}
                        showOriginalLanguageSourceLine={
                          version === "kjv" && showGreekSurface
                        }
                        showOriginalLanguageSurface={showGreekSurface}
                        showOriginalLanguageTransliteration={showGreekTransliteration}
                        showStrongs
                        verse={verse}
                      />
                    ) : canAnnotateInterlinearVerse && showBibleAnnotationLine ? (
                      <FathersEnglishUndertextContent
                        annotationMode={annotationMode}
                        showAnnotatedUndertext={showAnnotatedGreekUndertext}
                        annotationInteractionMode="word-click"
                        annotationModePrompt="Click any English word to place the matching Greek under it."
                        annotations={undertextAnnotations}
                        autoApplySingleWordSuggestion
                        autoSuggestionsBuilder={(selectedText, selectedWords) =>
                          buildBibleGreekUndertextSuggestions(
                            selectedText,
                            selectedWords,
                            activeGreekTokens
                          )
                        }
                        contentId={verseKey}
                        english={verse.text}
                        englishTokens={bibleAnnotationTokens}
                        lineClassName="verse-text verse-text-body"
                        onChangeAnnotations={(contentId, nextAnnotations) =>
                          saveVerseAnnotations(
                            contentId,
                            nextAnnotations.map((annotation) => ({
                              verseKey: contentId,
                              startToken: annotation.startToken,
                              endToken: annotation.endToken,
                              greekText: annotation.greekText,
                              entryKey: annotation.entryKey,
                              lemma: annotation.lemma,
                              strongs: annotation.strongs,
                              transliteration: annotation.transliteration,
                              gloss: annotation.gloss,
                              source: annotation.source
                            }))
                          )
                        }
                        onOpenGreekDictionary={openGreekDictionary}
                      />
                    ) : (
                      <VerseTextContent className="verse-text verse-text-body" verse={verse} />
                    )
                  ) : null}
                  {isStandaloneGreekVersion &&
                  showCompanionVerseTranslation &&
                  verse.translationText?.trim() ? (
                    canAnnotateGreekVersionTranslation && showBibleAnnotationLine ? (
                      <FathersEnglishUndertextContent
                        annotationMode={annotationMode}
                        showAnnotatedUndertext={showAnnotatedGreekUndertext}
                        annotationInteractionMode="word-click"
                        annotationModePrompt="Click any English word to place the matching Greek under it."
                        annotations={undertextAnnotations}
                        autoApplySingleWordSuggestion
                        autoSuggestionsBuilder={(selectedText, selectedWords) =>
                          buildBibleGreekUndertextSuggestions(
                            selectedText,
                            selectedWords,
                            activeGreekTokens
                          )
                        }
                        contentId={verseKey}
                        english={verse.translationText}
                        englishTokens={bibleAnnotationTokens}
                        lineClassName="verse-text verse-text-companion-translation"
                        onChangeAnnotations={(contentId, nextAnnotations) =>
                          saveVerseAnnotations(
                            contentId,
                            nextAnnotations.map((annotation) => ({
                              verseKey: contentId,
                              startToken: annotation.startToken,
                              endToken: annotation.endToken,
                              greekText: annotation.greekText,
                              entryKey: annotation.entryKey,
                              lemma: annotation.lemma,
                              strongs: annotation.strongs,
                              transliteration: annotation.transliteration,
                              gloss: annotation.gloss,
                              source: annotation.source
                            }))
                          )
                        }
                        onOpenGreekDictionary={openGreekDictionary}
                      />
                    ) : (
                      <p className="verse-text verse-text-companion-translation">
                        {verse.translationText}
                      </p>
                    )
                  ) : null}
                </>
              ) : null}
              {activeGreekVerse && shouldShowGreekTokens ? (
                <GreekInterlinearLine
                  bookSlug={bookSlug}
                  chapterNumber={chapterNumber}
                  greekLearningScopeKey={greekLearningScopeKey}
                  onOpenGreekDictionary={handleGreekTokenSelection}
                  showGloss={showGreekGloss}
                  showLemma={showGreekLemma}
                  showSurface={showGreekSurface}
                  showTransliteration={showGreekTransliteration}
                  verse={activeGreekVerse}
                />
              ) : null}
              {showCustomVerseTranslation ? (
                <VerseTranslationEditor
                  bookSlug={bookSlug}
                  chapterNumber={chapterNumber}
                  verseNumber={verse.number}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
