"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { ReaderControls } from "@/app/components/ReaderControls";
import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ReaderSettingsPanel } from "@/app/components/ReaderSettingsPanel";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useReaderToplineVisibility } from "@/app/components/useReaderToplineVisibility";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { GreekToken } from "@/lib/bible/types";
import type { FathersWorkMeta, FathersWorkPayload } from "@/lib/fathers/types";

type FathersReaderContentProps = {
  payload: FathersWorkPayload;
  works: FathersWorkMeta[];
};

export function FathersReaderContent({ payload, works }: FathersReaderContentProps) {
  const { isPanelOpen, settings } = useReaderCustomization();
  const { isSplitViewActive } = useLookup();
  const { activeUtilityPane, openGreekDictionary } = useReaderWorkspace();
  const hasGreekReaderAid = payload.segments.some((segment) => segment.greek.trim().length > 0);
  const [activeSectionId, setActiveSectionId] = useState(payload.segments[0]?.id ?? "");
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
    const initialHash = window.location.hash.replace(/^#/, "");

    if (!initialHash) {
      return;
    }

    const target = payload.segments.find((segment) => segment.id === initialHash);

    if (!target) {
      return;
    }

    setActiveSectionId(target.id);

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
    document.getElementById(sectionId)?.scrollIntoView?.({ block: "start" });
    window.history.replaceState({}, "", `#${sectionId}`);
  };

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
                works={workOptions}
                libraryHref="/fathers"
              />
            </div>
          </div>
        </div>
        <div className="reading-surface fathers-reading-surface">
          {payload.segments.map((segment, index) => (
            <article className="fathers-segment-card" id={segment.id} key={segment.id}>
              <div className="fathers-segment-header">
                <p className="reader-toolbar-summary fathers-segment-label">{segment.label}</p>
                {segment.ref !== segment.label ? (
                  <p className="reader-toolbar-meta fathers-segment-ref">{segment.ref}</p>
                ) : null}
              </div>
              {segment.greek.trim() ? (
                <GreekVerseTextContent
                  className="verse-text verse-text-greek fathers-segment-greek"
                  displayMode="stacked"
                  onOpenGreekDictionary={openGreekDictionary}
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
              <p className="verse-text verse-text-body fathers-segment-english">{segment.english}</p>
            </article>
          ))}
        </div>
        {!isSplitViewActive && activeUtilityPane === "strongs" ? (
          <div className="reading-surface reader-notebook-surface">
            <ReaderStrongsPanel />
          </div>
        ) : null}
      </section>
    </ReaderCustomizationShell>
  );
}
