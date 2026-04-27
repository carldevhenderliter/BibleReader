"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FathersEnglishUndertextContent } from "@/app/components/FathersEnglishUndertextContent";
import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { ReaderCopyButton } from "@/app/components/ReaderCopyButton";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { EnglishUndertextAnnotation, GreekToken } from "@/lib/bible/types";
import { saveFathersAnnotationFile } from "@/lib/fathers/annotation-save";
import { isNa1GreekAnnotationWork } from "@/lib/fathers/annotations";
import type {
  FathersGreekUndertextAnnotation,
  FathersGreekUndertextAnnotationFile,
  FathersGreekUndertextAnnotationRecord,
  FathersWorkMeta,
  FathersWorkPayload
} from "@/lib/fathers/types";

type FathersReaderContentProps = {
  payload: FathersWorkPayload;
  works: FathersWorkMeta[];
};

type LazyFathersSegmentSectionProps = {
  segmentId: string;
  forceRender: boolean;
  initialRender: boolean;
  onRenderSection: (segmentId: string) => void;
  children: React.ReactNode;
};

function splitFathersEnglishSentences(text: string) {
  const matches =
    text.match(/[^.!?]+(?:[.!?]+["'”’)\]]*)?(?:\s+|$)/gu)?.map((sentence) => sentence.trim()) ?? [];

  return matches.filter(Boolean);
}

function renderFathersEnglishBlock(text: string, separateSentencesByLine: boolean) {
  if (!separateSentencesByLine) {
    return <p className="verse-text verse-text-body fathers-segment-english">{text}</p>;
  }

  const sentences = splitFathersEnglishSentences(text);

  if (!sentences.length) {
    return <p className="verse-text verse-text-body fathers-segment-english">{text}</p>;
  }

  return (
    <div className="fathers-segment-english-sentences">
      {sentences.map((sentence, index) => (
        <p className="verse-text verse-text-body fathers-segment-english fathers-sentence-line" key={`${index}:${sentence}`}>
          {sentence}
        </p>
      ))}
    </div>
  );
}

function LazyFathersSegmentSection({
  segmentId,
  forceRender,
  initialRender,
  onRenderSection,
  children
}: LazyFathersSegmentSectionProps) {
  const [shouldRenderSection, setShouldRenderSection] = useState(initialRender || forceRender);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialRender || forceRender) {
      setShouldRenderSection(true);
    }
  }, [forceRender, initialRender]);

  useEffect(() => {
    if (!shouldRenderSection) {
      return;
    }

    onRenderSection(segmentId);
  }, [onRenderSection, segmentId, shouldRenderSection]);

  useEffect(() => {
    if (shouldRenderSection || forceRender) {
      return;
    }

    const sectionElement = sectionRef.current;

    if (!sectionElement) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRenderSection(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldRenderSection(true);
        }
      },
      {
        rootMargin: "1400px 0px"
      }
    );

    observer.observe(sectionElement);

    return () => {
      observer.disconnect();
    };
  }, [forceRender, shouldRenderSection]);

  return (
    <article className="fathers-segment-card" id={segmentId} ref={sectionRef}>
      {shouldRenderSection ? children : <div className="fathers-segment-placeholder" />}
    </article>
  );
}

export function FathersReaderContent({ payload, works }: FathersReaderContentProps) {
  const { isPanelOpen, settings } = useReaderCustomization();
  const { isSplitViewActive } = useLookup();
  const {
    activeUtilityPane,
    clearGreekLearningQuiz,
    isGreekLearningMode,
    openGreekDictionary,
    startGreekLearningSession,
    setIsGreekLearningMode
  } = useReaderWorkspace();
  const hasGreekReaderAid = payload.segments.some((segment) => segment.greek.trim().length > 0);
  const shouldShowFathersGreek =
    settings.showGreekSurface ||
    settings.showGreekLemma ||
    settings.showGreekTransliteration ||
    settings.showGreekGloss;
  const shouldShowFathersEnglish = settings.showVerseText;
  const hasGreekLearningSurface = payload.segments.some((segment) =>
    Boolean(segment.greekLexicalTokens?.length)
  );
  const isNa1AnnotationWork = isNa1GreekAnnotationWork(payload.work);
  const forceRenderAllSections = settings.disableLazyLoading;
  const [activeSectionId, setActiveSectionId] = useState(payload.segments[0]?.id ?? "");
  const [annotationMode, setAnnotationMode] = useState(false);
  const [annotationSaveStatus, setAnnotationSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [annotationSaveMessage, setAnnotationSaveMessage] = useState<string | null>(null);
  const [prioritizedSectionIds, setPrioritizedSectionIds] = useState<string[]>(() =>
    (settings.disableLazyLoading ? payload.segments : payload.segments.slice(0, 8)).map(
      (segment) => segment.id
    )
  );
  const [renderedSectionIds, setRenderedSectionIds] = useState<string[]>(() =>
    (settings.disableLazyLoading ? payload.segments : payload.segments.slice(0, 8)).map(
      (segment) => segment.id
    )
  );
  const [segmentAnnotations, setSegmentAnnotations] = useState<FathersGreekUndertextAnnotationRecord>(
    () =>
      Object.fromEntries(
        payload.segments.map((segment) => [segment.id, segment.greekUndertextAnnotations ?? []])
      )
  );
  const [persistedSegmentAnnotations, setPersistedSegmentAnnotations] =
    useState<FathersGreekUndertextAnnotationRecord>(() =>
      Object.fromEntries(
        payload.segments.map((segment) => [segment.id, segment.greekUndertextAnnotations ?? []])
      )
    );
  const readingSurfaceRef = useRef<HTMLDivElement | null>(null);
  const isToplineVisible = useReaderToplineVisibility(isPanelOpen);
  const sectionOptions = useMemo(
    () =>
      payload.segments.map((segment) => ({
        value: segment.id,
        label: segment.label
      })),
    [payload.segments]
  );
  const workOptions = useMemo(
    () =>
      works.map((work) => ({
        slug: work.slug,
        title: work.title
      })),
    [works]
  );
  useEffect(() => {
    setActiveSectionId(payload.segments[0]?.id ?? "");
  }, [payload.segments]);

  useEffect(() => {
    setAnnotationMode(false);
    setAnnotationSaveStatus("idle");
    setAnnotationSaveMessage(null);
    const nextAnnotations = Object.fromEntries(
      payload.segments.map((segment) => [segment.id, segment.greekUndertextAnnotations ?? []])
    );
    const initialSectionIds = (
      settings.disableLazyLoading ? payload.segments : payload.segments.slice(0, 8)
    ).map((segment) => segment.id);
    setPrioritizedSectionIds(initialSectionIds);
    setRenderedSectionIds(initialSectionIds);
    setSegmentAnnotations(nextAnnotations);
    setPersistedSegmentAnnotations(nextAnnotations);
  }, [payload.segments, payload.work.slug, settings.disableLazyLoading]);

  useEffect(() => {
    clearGreekLearningQuiz();
  }, [clearGreekLearningQuiz, payload.work.slug, renderedSectionIds]);

  const handleRenderSection = useCallback((segmentId: string) => {
    setRenderedSectionIds((current) =>
      current.includes(segmentId) ? current : [...current, segmentId]
    );
  }, []);

  useEffect(() => {
    const initialHash = window.location.hash.replace(/^#/, "");

    if (!initialHash) {
      return;
    }

    const target = payload.segments.find((segment) => segment.id === initialHash);

    if (!target) {
      return;
    }

    setActiveSectionId(target.id);
    setPrioritizedSectionIds((current) =>
      current.includes(target.id) ? current : [...current, target.id]
    );

    window.requestAnimationFrame(() => {
      document.getElementById(target.id)?.scrollIntoView?.({ block: "start" });
    });
  }, [payload.segments]);

  useEffect(() => {
    if (!payload.segments.length) {
      return;
    }

    const segmentElements = payload.segments
      .map((segment) => document.getElementById(segment.id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    if (!segmentElements.length) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setActiveSectionId(segmentElements[0]?.id ?? "");
      return;
    }

    let activeEntries = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeEntries.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            activeEntries.delete(entry.target.id);
          }
        });

        const nextActiveId =
          Array.from(activeEntries.entries()).sort((left, right) => left[1] - right[1])[0]?.[0] ??
          segmentElements
            .map((element) => ({
              id: element.id,
              distance: Math.abs(element.getBoundingClientRect().top - 180)
            }))
            .sort((left, right) => left.distance - right.distance)[0]?.id;

        if (nextActiveId) {
          setActiveSectionId(nextActiveId);
        }
      },
      {
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0, 0.2, 0.45]
      }
    );

    segmentElements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      activeEntries = new Map<string, number>();
    };
  }, [payload.segments]);

  const handleSectionChange = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setPrioritizedSectionIds((current) =>
      current.includes(sectionId) ? current : [...current, sectionId]
    );
    document.getElementById(sectionId)?.scrollIntoView?.({ block: "start" });
    window.history.replaceState({}, "", `#${sectionId}`);
  };

  const hasAnnotationChanges = payload.segments.some((segment) => {
    const initialAnnotations = JSON.stringify(persistedSegmentAnnotations[segment.id] ?? []);
    const currentAnnotations = JSON.stringify(segmentAnnotations[segment.id] ?? []);

    return initialAnnotations !== currentAnnotations;
  });

  const handleAnnotationsChange = (
    segmentId: string,
    nextAnnotations: EnglishUndertextAnnotation[]
  ) => {
    setSegmentAnnotations((current) => ({
      ...current,
      [segmentId]: nextAnnotations.map((annotation) => ({
        segmentId,
        startToken: annotation.startToken,
        endToken: annotation.endToken,
        greekText: annotation.greekText,
        entryKey: annotation.entryKey,
        lemma: annotation.lemma,
        strongs: annotation.strongs,
        transliteration: annotation.transliteration,
        gloss: annotation.gloss,
        source:
          annotation.source === "verse-token" ? "lexicon" : annotation.source
      }))
    }));
    setAnnotationSaveStatus("idle");
    setAnnotationSaveMessage(null);
  };

  const handleAnnotationSave = async () => {
    if (!isNa1AnnotationWork || !hasAnnotationChanges) {
      return;
    }

    setAnnotationSaveStatus("saving");
    setAnnotationSaveMessage(null);

    try {
      const annotationFile: FathersGreekUndertextAnnotationFile = {
        workSlug: payload.work.slug,
        annotations: segmentAnnotations
      };
      const saveMode = await saveFathersAnnotationFile(annotationFile);

      setAnnotationSaveStatus("saved");
      setAnnotationSaveMessage(
        saveMode === "filesystem"
          ? `Greek undertext annotations saved to ${payload.work.slug}.json.`
          : "Downloaded annotation JSON. Move it into data/fathers/annotations/ to keep it repo-tracked."
      );
      setPersistedSegmentAnnotations(segmentAnnotations);
    } catch (error) {
      setAnnotationSaveStatus("error");
      setAnnotationSaveMessage(
        error instanceof Error ? error.message : "Unable to save Greek undertext annotations."
      );
    }
  };

  const annotationActions = isNa1AnnotationWork ? (
    <>
      <button
        className={`reader-inline-button${annotationMode ? " is-active" : ""}`}
        onClick={() => {
          setAnnotationMode((current) => {
            return !current;
          });
        }}
        type="button"
      >
        {annotationMode ? "Done annotating" : "Annotate Greek"}
      </button>
      <button
        className="reader-inline-button"
        disabled={!hasAnnotationChanges || annotationSaveStatus === "saving"}
        onClick={() => void handleAnnotationSave()}
        type="button"
      >
        {annotationSaveStatus === "saving" ? "Saving…" : "Save Greek"}
      </button>
    </>
  ) : null;

  const trailingActions = (
    <>
      {hasGreekLearningSurface ? (
        <button
          className={`reader-inline-button${isGreekLearningMode ? " is-active" : ""}`}
          onClick={() => setIsGreekLearningMode(!isGreekLearningMode)}
          type="button"
        >
          {isGreekLearningMode ? "Stop Learning" : "Learn Greek"}
        </button>
      ) : null}
      <ReaderCopyButton targetRef={readingSurfaceRef} />
      {annotationActions}
    </>
  );

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <ReaderSettingsPanel hasGreekReaderAid={hasGreekReaderAid} mode="fathers" />
      <section className="reader-card reader-reading-card">
        <div className={`reader-topline${isToplineVisible ? "" : " is-hidden"}`}>
          <div className="reader-toolbar">
            <div className="reader-toolbar-copy">
              <p className="reader-toolbar-summary">
                {hasGreekReaderAid ? "Apostolic Fathers" : "Fathers Reader"}
              </p>
              <p className="reader-toolbar-title">{payload.work.title}</p>
              <p className="reader-toolbar-meta">
                {payload.work.author}
                {payload.work.compositionDate ? (
                  <>
                    <span className="reader-meta-separator" aria-hidden="true">
                      ·
                    </span>
                    {payload.work.compositionDate}
                  </>
                ) : null}
                <span className="reader-meta-separator" aria-hidden="true">
                  ·
                </span>
                {payload.segments.length} sections
              </p>
            </div>
            <div className="reader-toolbar-actions">
              <ReaderControls
                currentSectionId={activeSectionId}
                currentWorkSlug={payload.work.slug}
                mode="fathers"
                onSectionChange={handleSectionChange}
                sections={sectionOptions}
                trailingActions={trailingActions}
                works={workOptions}
                libraryHref="/fathers"
              />
            </div>
          </div>
        </div>
        <div className="reading-surface fathers-reading-surface" ref={readingSurfaceRef}>
          {payload.work.fullTextUrl ? (
            <p className="muted-copy fathers-source-link">
              Full text source:{" "}
              <a href={payload.work.fullTextUrl} rel="noreferrer" target="_blank">
                {payload.work.fullTextSource ?? payload.work.fullTextUrl}
              </a>
              {payload.work.authenticityNote ? ` · ${payload.work.authenticityNote}` : ""}
            </p>
          ) : payload.work.authenticityNote ? (
            <p className="muted-copy fathers-source-link">{payload.work.authenticityNote}</p>
          ) : null}
          {isNa1AnnotationWork && annotationSaveMessage ? (
            <div
              className={`fathers-annotation-status fathers-annotation-status-${annotationSaveStatus}`}
              role="status"
            >
              {annotationSaveMessage}
            </div>
          ) : null}
          {payload.segments.map((segment, index) => (
            <LazyFathersSegmentSection
              forceRender={forceRenderAllSections}
              initialRender={prioritizedSectionIds.includes(segment.id) || index < 8}
              key={segment.id}
              onRenderSection={handleRenderSection}
              segmentId={segment.id}
            >
              <div className="fathers-segment-header">
                <p className="reader-toolbar-summary fathers-segment-label">{segment.label}</p>
                {settings.showVerseNumbers && segment.ref !== segment.label ? (
                  <p className="reader-toolbar-meta fathers-segment-ref">{segment.ref}</p>
                ) : null}
              </div>
              {segment.greek.trim() && shouldShowFathersGreek ? (
                <GreekVerseTextContent
                  className="verse-text verse-text-greek fathers-segment-greek"
                  displayMode="stacked"
                  greekLearningScopeKey={`fathers:${payload.work.slug}:${segment.id}`}
                  getOccurrenceKey={(token, tokenIndex) =>
                    token.occurrenceKey ?? `${segment.id}:${tokenIndex}`
                  }
                  onOpenGreekDictionary={(selection) => {
                    if (isGreekLearningMode) {
                      const segmentGreekLearningQueue =
                        ((segment.greekLexicalTokens as GreekToken[] | undefined) ?? []).map(
                          (token, tokenIndex) => ({
                            entryKey: token.entryKey ?? token.strongs ?? token.lemma,
                            strongs: token.strongs ?? null,
                            lemma: token.lemma,
                            label: token.lemma,
                            occurrenceKey: token.occurrenceKey ?? `${segment.id}:${tokenIndex}`,
                            selectedForm: token.surface,
                            selectedFormMorphology: token.morphology ?? null,
                            selectedFormDecodedMorphology: token.decodedMorphology ?? null,
                            matchedQuery: token.surface,
                            transliteration: token.transliteration ?? null,
                            gloss: token.gloss ?? null
                          })
                        );

                      startGreekLearningSession(
                        segmentGreekLearningQueue,
                        selection.occurrenceKey ?? null,
                        `fathers:${payload.work.slug}:${segment.id}`
                      );
                      return;
                    }

                    openGreekDictionary(selection);
                  }}
                  showGloss={settings.showGreekGloss}
                  showLemma={settings.showGreekLemma}
                  showSurface={settings.showGreekSurface}
                  showTransliteration={settings.showGreekTransliteration}
                  verse={{
                    number: index + 1,
                    text: segment.greek,
                    greekTokens: (segment.greekLexicalTokens as GreekToken[] | undefined) ?? undefined
                  }}
                />
              ) : null}
              {shouldShowFathersEnglish
                ? isNa1AnnotationWork ? (
                      <FathersEnglishUndertextContent
                      annotationMode={annotationMode}
                      showAnnotatedUndertext={settings.showAnnotatedGreekUndertext}
                      annotations={(segmentAnnotations[segment.id] ?? []).map((annotation) => ({
                        contentId: segment.id,
                        startToken: annotation.startToken,
                        endToken: annotation.endToken,
                        greekText: annotation.greekText,
                        entryKey: annotation.entryKey,
                        lemma: annotation.lemma,
                        strongs: annotation.strongs,
                        transliteration: annotation.transliteration,
                        gloss: annotation.gloss,
                        source: annotation.source
                      }))}
                      contentId={segment.id}
                      english={segment.english}
                      englishTokens={segment.englishTokens}
                      onChangeAnnotations={handleAnnotationsChange}
                      onOpenGreekDictionary={openGreekDictionary}
                      separateSentencesByLine={settings.showFathersSentenceLines}
                    />
                  ) : (
                    renderFathersEnglishBlock(segment.english, settings.showFathersSentenceLines)
                  )
                : null}
            </LazyFathersSegmentSection>
          ))}
        </div>
        {!isSplitViewActive && activeUtilityPane === "strongs" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStrongsPanel />
          </div>
        ) : !isSplitViewActive && activeUtilityPane === "harmony" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderHarmonyWorkspace />
          </div>
        ) : null}
      </section>
    </ReaderCustomizationShell>
  );
}
