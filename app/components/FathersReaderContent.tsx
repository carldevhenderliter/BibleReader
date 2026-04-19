"use client";

import Link from "next/link";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { ReaderCustomizationShell } from "@/app/components/ReaderCustomizationShell";
import { ReaderStrongsPanel } from "@/app/components/ReaderStrongsPanel";
import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";
import { useLookup } from "@/app/components/LookupProvider";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import type { GreekToken } from "@/lib/bible/types";
import type { FathersWorkPayload } from "@/lib/fathers/types";

type FathersReaderContentProps = {
  payload: FathersWorkPayload;
};

export function FathersReaderContent({ payload }: FathersReaderContentProps) {
  const { settings } = useReaderCustomization();
  const { isSplitViewActive } = useLookup();
  const { activeUtilityPane, openGreekDictionary } = useReaderWorkspace();
  const hasGreekReaderAid = payload.segments.some((segment) => segment.greek.trim().length > 0);

  return (
    <ReaderCustomizationShell className="reader-shell reader-customizable-shell">
      <section className="reader-card reader-reading-card">
        <div className="reader-topline">
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
              <Link className="secondary-link" href="/fathers">
                Back To Fathers
              </Link>
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
