"use client";

import { useEffect } from "react";

import { useBibleGreekUndertext } from "@/app/components/BibleGreekUndertextProvider";
import { FathersEnglishUndertextContent } from "@/app/components/FathersEnglishUndertextContent";
import { GreekInterlinearLine } from "@/app/components/GreekInterlinearLine";
import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { HebrewVerseTextContent } from "@/app/components/HebrewVerseTextContent";
import { useReaderVersion } from "@/app/components/ReaderVersionProvider";
import { VerseTranslationEditor } from "@/app/components/VerseTranslationEditor";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import {
  buildBibleGreekUndertextSuggestions,
  getBibleVerseAnnotationKey,
  tokenizeBibleEnglishText
} from "@/lib/bible/annotations";
import { getBibleVersionLabel } from "@/lib/bible/version";
import {
  getGreekTokenOccurrenceKey
} from "@/lib/bible/greek";
import type {
  BundledBibleVersion,
  EnglishUndertextAnnotation,
  EsvInterlinearDisplayVerse,
  GreekToken,
  Verse
} from "@/lib/bible/types";

const ESV_STRONGS_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "he",
  "her",
  "his",
  "i",
  "in",
  "is",
  "it",
  "its",
  "me",
  "my",
  "of",
  "on",
  "or",
  "our",
  "she",
  "that",
  "the",
  "their",
  "them",
  "these",
  "they",
  "this",
  "those",
  "through",
  "to",
  "us",
  "was",
  "we",
  "with",
  "you",
  "your"
]);

const ESV_STRONGS_WORD_PATTERN = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

type VerseListProps = {
  bookSlug: string;
  chapterNumber: number;
  interlinearVerseMap?: Record<number, EsvInterlinearDisplayVerse>;
  showInterlinearOnly?: boolean;
  showVerseNumbers?: boolean;
  showVerseText?: boolean;
  showCompanionVerseTranslation?: boolean;
  showSecondaryVerseTranslation?: boolean;
  showAnnotatedGreekUndertext?: boolean;
  showCustomVerseTranslation?: boolean;
  showGreekSurface?: boolean;
  showGreekLemma?: boolean;
  showGreekTransliteration?: boolean;
  showGreekGloss?: boolean;
  showGreekGrammarCards?: boolean;
  showExpandedGreekGrammarCards?: boolean;
  annotationMode?: boolean;
  highlightedVerseNumber?: number | null;
  highlightedVerseRange?: {
    start: number;
    end: number;
  } | null;
  secondaryVerseVersions?: readonly BundledBibleVersion[];
  secondaryVersesByVersion?: Partial<Record<BundledBibleVersion, Record<number, Verse>>>;
  showStrongs?: boolean;
  showVerseStrongs?: boolean;
  verses: Verse[];
};

function getTrEnglishGlossToken(gloss?: string | null) {
  if (!gloss) {
    return "";
  }

  const normalizedGloss = gloss
    .replace(/\s+/g, " ")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .trim();

  if (!normalizedGloss) {
    return "";
  }

  const firstSegment = normalizedGloss.split(/[;,/]/)[0]?.trim() ?? "";
  const cleanedSegment = firstSegment.replace(/\([^)]*\)/g, "").trim();

  if (!cleanedSegment) {
    return "";
  }

  const firstWords = cleanedSegment.split(/\s+/).slice(0, 3).join(" ").trim();
  return firstWords;
}

function getEsvStrongsCandidateWords(gloss?: string | null) {
  if (!gloss) {
    return [];
  }

  const normalizedGloss = gloss
    .replace(/\([^)]*\)/g, " ")
    .split(/[;,/]/)[0]
    ?.trim()
    .toLowerCase();

  if (!normalizedGloss) {
    return [];
  }

  ESV_STRONGS_WORD_PATTERN.lastIndex = 0;
  const matches = normalizedGloss.match(ESV_STRONGS_WORD_PATTERN) ?? [];
  ESV_STRONGS_WORD_PATTERN.lastIndex = 0;

  return Array.from(
    new Set(
      matches.filter((word) => !ESV_STRONGS_STOPWORDS.has(word) && word.length > 1)
    )
  );
}

function buildEsvEnglishStrongsMatches(english: string, greekTokens: GreekToken[]) {
  const englishTokens = tokenizeBibleEnglishText(english);
  const matchingTokensByWord = new Map<string, GreekToken[]>();

  for (const greekToken of greekTokens) {
    if (!greekToken.strongs) {
      continue;
    }

    for (const candidateWord of getEsvStrongsCandidateWords(greekToken.gloss)) {
      const existingMatches = matchingTokensByWord.get(candidateWord) ?? [];
      existingMatches.push(greekToken);
      matchingTokensByWord.set(candidateWord, existingMatches);
    }
  }

  const occurrenceByWord = new Map<string, number>();

  return englishTokens.map((englishToken) => {
    if (englishToken.type !== "word") {
      return {
        token: englishToken,
        matchedGreekToken: null as GreekToken | null
      };
    }

    const normalizedWord = englishToken.text.trim().toLowerCase();
    const wordOccurrence = occurrenceByWord.get(normalizedWord) ?? 0;
    occurrenceByWord.set(normalizedWord, wordOccurrence + 1);

    return {
      token: englishToken,
      matchedGreekToken: matchingTokensByWord.get(normalizedWord)?.[wordOccurrence] ?? null
    };
  });
}

export function VerseList({
  bookSlug,
  chapterNumber,
  interlinearVerseMap,
  showInterlinearOnly = false,
  showVerseNumbers = true,
  showVerseText,
  showCompanionVerseTranslation = true,
  showSecondaryVerseTranslation = false,
  showAnnotatedGreekUndertext = true,
  showCustomVerseTranslation = true,
  showGreekSurface = true,
  showGreekLemma = true,
  showGreekTransliteration = true,
  showGreekGloss = true,
  showGreekGrammarCards = false,
  showExpandedGreekGrammarCards = false,
  annotationMode = false,
  highlightedVerseNumber,
  highlightedVerseRange,
  secondaryVerseVersions = [],
  secondaryVersesByVersion,
  showStrongs = false,
  showVerseStrongs = true,
  verses
}: VerseListProps) {
  const { version } = useReaderVersion();
  const isStandaloneGreekVersion = version === "greek" || version === "tr";
  const isStandaloneHebrewVersion = version === "mt";
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
    showGreekSurface ||
    showGreekLemma ||
    showGreekTransliteration ||
    showGreekGloss ||
    showGreekGrammarCards;

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
        const activeSecondaryVerses = showSecondaryVerseTranslation
          ? secondaryVerseVersions
              .map((secondaryVerseVersion) => ({
                version: secondaryVerseVersion,
                verse: secondaryVersesByVersion?.[secondaryVerseVersion]?.[verse.number] ?? null
              }))
              .filter(
                (
                  secondaryVerse
                ): secondaryVerse is { version: BundledBibleVersion; verse: Verse } =>
                  Boolean(secondaryVerse.verse?.text.trim())
              )
          : [];
        const esvEnglishStrongsMatches =
          version === "esv" && activeGreekVerse?.tokens?.length
            ? buildEsvEnglishStrongsMatches(verse.text, activeGreekVerse.tokens)
            : null;
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
                        showExpandedGrammarDetails={showExpandedGreekGrammarCards}
                        showGrammarCards={showGreekGrammarCards}
                        showStrongsNumbers={version === "tr" && showVerseStrongs}
                        verse={verse}
                      />
                    ) : isStandaloneHebrewVersion && verse.hebrewTokens?.length ? (
                      <HebrewVerseTextContent
                        className="verse-text verse-text-hebrew"
                        highlightedStrongsNumber={null}
                        onOpenStrongs={(strongsNumber, label) => openStrongs(strongsNumber, label)}
                        showGloss={showGreekGloss}
                        showLemma={showGreekLemma}
                        showStrongsNumbers={showVerseStrongs}
                        showTransliteration={showGreekTransliteration}
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
                    ) : version === "esv" &&
                      showVerseStrongs &&
                      activeGreekVerse?.tokens?.length &&
                      esvEnglishStrongsMatches &&
                      !showBibleAnnotationLine ? (
                      <p className="verse-text verse-text-body verse-text-esv-strongs">
                        {esvEnglishStrongsMatches.map(({ token, matchedGreekToken }, tokenIndex) =>
                          token.type === "separator" ? (
                            <span key={`${verse.number}:separator:${tokenIndex}`}>{token.text}</span>
                          ) : matchedGreekToken?.strongs ? (
                            <button
                              aria-label={`${token.text} ${matchedGreekToken.strongs}`}
                              className="verse-esv-strongs-word"
                              key={`${verse.number}:word:${tokenIndex}:${token.text}`}
                              onClick={() => handleGreekTokenSelection(matchedGreekToken)}
                              type="button"
                            >
                              <span className="verse-esv-strongs-word-text">{token.text}</span>
                              <span className="verse-esv-strongs-number">
                                {matchedGreekToken.strongs}
                              </span>
                            </button>
                          ) : (
                            <span key={`${verse.number}:word:${tokenIndex}:${token.text}`}>
                              {token.text}
                            </span>
                          )
                        )}
                      </p>
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
                    <>
                      {version === "tr" && verse.greekTokens?.length ? (
                        <div className="verse-text verse-text-companion-translation verse-text-tr-gloss-line">
                          {verse.greekTokens.map((token, tokenIndex) => {
                            const glossToken = getTrEnglishGlossToken(token.gloss);

                            if (!glossToken || !token.strongs) {
                              return null;
                            }

                            return (
                              <button
                                aria-label={`${glossToken} ${token.strongs}`}
                                className="verse-tr-gloss-token"
                                key={`${verse.number}:${tokenIndex}:${token.surface}:${token.strongs}`}
                                onClick={() => handleGreekTokenSelection(token)}
                                type="button"
                              >
                                <span className="verse-tr-gloss-text">{glossToken}</span>
                                <span className="verse-tr-gloss-strongs">{token.strongs}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {canAnnotateGreekVersionTranslation && showBibleAnnotationLine ? (
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
                      )}
                    </>
                  ) : null}
                  {activeSecondaryVerses.map(({ version: secondaryVerseVersion, verse: secondaryVerse }) => (
                    <div className="verse-secondary-version-block" key={`${verse.number}:${secondaryVerseVersion}`}>
                      <p className="verse-secondary-version-label">
                        {getBibleVersionLabel(secondaryVerseVersion)}
                      </p>
                      {secondaryVerseVersion === "kjv" && secondaryVerse.tokens?.length ? (
                        <VerseTextContent
                          className="verse-text verse-text-body verse-text-rich verse-text-secondary-translation"
                          onOpenStrongs={(strongsNumbers) =>
                            openStrongs(strongsNumbers, strongsNumbers.join(" "))
                          }
                          showOriginalLanguageGloss={showGreekGloss}
                          showOriginalLanguageLemma={showGreekLemma}
                          showOriginalLanguageSourceLine={showGreekSurface}
                          showOriginalLanguageSurface={showGreekSurface}
                          showOriginalLanguageTransliteration={showGreekTransliteration}
                          showStrongs
                          verse={secondaryVerse}
                        />
                      ) : secondaryVerseVersion === "mt" && secondaryVerse.hebrewTokens?.length ? (
                        <HebrewVerseTextContent
                          className="verse-text verse-text-hebrew verse-text-secondary-translation"
                          onOpenStrongs={(strongsNumber, label) => openStrongs(strongsNumber, label)}
                          showGloss={showGreekGloss}
                          showLemma={showGreekLemma}
                          showStrongsNumbers={showVerseStrongs}
                          showTransliteration={showGreekTransliteration}
                          verse={secondaryVerse}
                        />
                      ) : (
                        <p className="verse-text verse-text-body verse-text-secondary-translation">
                          {secondaryVerse.text}
                        </p>
                      )}
                    </div>
                  ))}
                </>
              ) : null}
              {activeGreekVerse && shouldShowGreekTokens ? (
                <GreekInterlinearLine
                  bookSlug={bookSlug}
                  chapterNumber={chapterNumber}
                  greekLearningScopeKey={greekLearningScopeKey}
                  onOpenGreekDictionary={handleGreekTokenSelection}
                  showExpandedGrammarDetails={showExpandedGreekGrammarCards}
                  showGloss={showGreekGloss}
                  showGrammarCards={showGreekGrammarCards}
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
                  greekTokens={activeGreekTokens}
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
