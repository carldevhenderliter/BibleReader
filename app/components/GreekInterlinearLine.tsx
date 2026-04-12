"use client";

import { useEffect, useMemo, useState } from "react";

import { useGreekGlossOverrides } from "@/app/components/GreekGlossOverridesProvider";
import {
  getGreekGlossOptions,
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
  getGreekTokenOccurrenceKey,
  resolveGreekTokenGloss
} from "@/lib/bible/greek";
import type { EsvInterlinearDisplayVerse, GreekGlossOption, GreekLemmaEntry, GreekToken } from "@/lib/bible/types";

type GreekInterlinearLineProps = {
  bookSlug: string;
  chapterNumber: number;
  verse: EsvInterlinearDisplayVerse;
  onOpenGreekDictionary: (token: GreekToken) => void;
};

export function GreekInterlinearLine({
  bookSlug,
  chapterNumber,
  verse,
  onOpenGreekDictionary
}: GreekInterlinearLineProps) {
  const { clearOverride, getOverride, saveOverride } = useGreekGlossOverrides();
  const [entriesByStrongs, setEntriesByStrongs] = useState<Record<string, GreekLemmaEntry>>({});
  const [openOccurrenceKey, setOpenOccurrenceKey] = useState<string | null>(null);
  const [openMorphologyOccurrenceKey, setOpenMorphologyOccurrenceKey] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const tokenEntries = useMemo(
    () =>
      verse.tokens?.map((token, tokenIndex) => {
        const occurrenceKey =
          token.occurrenceKey ??
          getGreekTokenOccurrenceKey(bookSlug, chapterNumber, verse.number, tokenIndex);
        const entry = entriesByStrongs[token.strongs] ?? null;
        const override = getOverride(occurrenceKey);
        const glossOptions = entry ? getGreekGlossOptions(entry, token.gloss) : [];
        const defaultGloss = resolveGreekTokenGloss(token, entry, null);
        const effectiveGloss = resolveGreekTokenGloss(token, entry, override);
        const morphologyDetails = getGreekMorphologyDetails(token);

        return {
          token,
          tokenIndex,
          occurrenceKey,
          entry,
          override,
          glossOptions,
          defaultGloss,
          effectiveGloss,
          morphologyDetails
        };
      }) ?? [],
    [bookSlug, chapterNumber, entriesByStrongs, getOverride, verse]
  );

  useEffect(() => {
    if (!verse.tokens?.length) {
      setEntriesByStrongs({});
      return;
    }

    let isCancelled = false;
    const uniqueStrongs = Array.from(new Set(verse.tokens.map((token) => token.strongs).filter(Boolean)));

    void Promise.all(
      uniqueStrongs.map(async (strongs) => {
        const entry = await getGreekLemmaEntry(strongs);

        return entry ? ([strongs, entry] as const) : null;
      })
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      setEntriesByStrongs(
        Object.fromEntries(
          results.filter((result): result is readonly [string, GreekLemmaEntry] => result !== null)
        )
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [verse.tokens]);

  if (!verse.tokens?.length) {
    return (
      <p className="verse-text verse-interlinear-text" lang="el">
        {verse.greek}
      </p>
    );
  }

  function handleSelectGloss(
    occurrenceKey: string,
    token: GreekToken,
    selectedGloss: string,
    option?: GreekGlossOption
  ) {
    const tokenEntry = tokenEntries.find((entry) => entry.occurrenceKey === occurrenceKey);

    if (tokenEntry && selectedGloss.trim() === tokenEntry.defaultGloss.trim()) {
      clearOverride(occurrenceKey);
    } else {
      saveOverride({
        occurrenceKey,
        strongs: token.strongs,
        lemma: token.lemma,
        selectedGloss: selectedGloss.trim(),
        optionId: option?.id,
        source: "lemma-option"
      });
    }

    setOpenOccurrenceKey(null);
    setOpenMorphologyOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
  }

  function handleSaveCustomGloss(occurrenceKey: string, token: GreekToken) {
    const trimmedDraft = customDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    saveOverride({
      occurrenceKey,
      strongs: token.strongs,
      lemma: token.lemma,
      selectedGloss: trimmedDraft,
      source: "custom"
    });
    setOpenOccurrenceKey(null);
    setOpenMorphologyOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
  }

  function handleOpenGlossPicker(
    occurrenceKey: string,
    effectiveGloss: string,
    overrideSource?: "lemma-option" | "custom"
  ) {
    setOpenMorphologyOccurrenceKey(null);
    setOpenOccurrenceKey((current) => (current === occurrenceKey ? null : occurrenceKey));
    setIsCustomMode(overrideSource === "custom");
    setCustomDraft(overrideSource === "custom" ? effectiveGloss : "");
  }

  function handleOpenMorphologyInfo(occurrenceKey: string) {
    setOpenOccurrenceKey(null);
    setIsCustomMode(false);
    setCustomDraft("");
    setOpenMorphologyOccurrenceKey((current) => (current === occurrenceKey ? null : occurrenceKey));
  }

  return (
    <div className="verse-interlinear" lang="el">
      {tokenEntries.map(
        ({
          token,
          tokenIndex,
          occurrenceKey,
          glossOptions,
          defaultGloss,
          effectiveGloss,
          override,
          morphologyDetails
        }) => (
          <span
            className="verse-greek-token-wrap"
            key={`${verse.number}:${tokenIndex}:${token.surface}`}
          >
            <span className="verse-greek-token-stack">
              <button
                aria-label={`${token.surface} ${token.lemma} ${token.strongs}`}
                className="verse-greek-token"
                onClick={() => onOpenGreekDictionary(token)}
                type="button"
              >
                <span className="verse-greek-surface">{token.surface}</span>
                <span className="verse-greek-lemma">{token.lemma}</span>
              </button>
              {morphologyDetails ? (
                <>
                  <button
                    aria-expanded={openMorphologyOccurrenceKey === occurrenceKey}
                    aria-label={`Explain morphology for ${token.surface}: ${morphologyDetails.label}`}
                    className="verse-greek-morphology"
                    onClick={() => handleOpenMorphologyInfo(occurrenceKey)}
                    type="button"
                  >
                    {morphologyDetails.label}
                  </button>
                  {openMorphologyOccurrenceKey === occurrenceKey ? (
                    <div
                      aria-label={`Morphology for ${token.surface}`}
                      className="verse-greek-morphology-picker"
                      role="dialog"
                    >
                      <div className="verse-greek-gloss-picker-header">
                        <p className="verse-greek-gloss-picker-title">{morphologyDetails.label}</p>
                        <button
                          aria-label="Close morphology details"
                          className="reader-inline-button"
                          onClick={() => setOpenMorphologyOccurrenceKey(null)}
                          type="button"
                        >
                          Close
                        </button>
                      </div>
                      <div className="verse-greek-morphology-list">
                        {morphologyDetails.terms.map((term) => (
                          <article
                            className="verse-greek-morphology-item"
                            key={`${occurrenceKey}:${term.key}`}
                          >
                            <p className="verse-greek-morphology-term">{term.label}</p>
                            <p className="verse-greek-morphology-copy">{term.definition}</p>
                          </article>
                        ))}
                      </div>
                      {morphologyDetails.fullDescription ? (
                        <p className="verse-greek-morphology-meta">
                          {morphologyDetails.fullDescription}
                          {token.decodedMorphology && token.morphology
                            ? ` (${token.morphology})`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
              <button
                aria-expanded={openOccurrenceKey === occurrenceKey}
                aria-label={`Choose English gloss for ${token.surface}`}
                className={`verse-greek-gloss${override ? " is-overridden" : ""}`}
                onClick={() =>
                  handleOpenGlossPicker(occurrenceKey, effectiveGloss, override?.source)
                }
                type="button"
              >
                {effectiveGloss || "Choose gloss"}
              </button>
              {openOccurrenceKey === occurrenceKey ? (
                <div
                  aria-label={`English gloss choices for ${token.surface}`}
                  className="verse-greek-gloss-picker"
                  role="dialog"
                >
                  <div className="verse-greek-gloss-picker-header">
                    <p className="verse-greek-gloss-picker-title">{token.surface}</p>
                    <button
                      aria-label="Close gloss picker"
                      className="reader-inline-button"
                      onClick={() => {
                        setOpenOccurrenceKey(null);
                        setOpenMorphologyOccurrenceKey(null);
                        setIsCustomMode(false);
                        setCustomDraft("");
                      }}
                      type="button"
                    >
                      Close
                    </button>
                  </div>
                  <div className="verse-greek-gloss-options">
                    {glossOptions.map((option) => (
                      <button
                        aria-pressed={effectiveGloss === option.label}
                        className={`verse-greek-gloss-option${
                          effectiveGloss === option.label ? " is-active" : ""
                        }`}
                        key={`${occurrenceKey}:${option.id}`}
                        onClick={() => handleSelectGloss(occurrenceKey, token, option.label, option)}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      aria-pressed={isCustomMode}
                      className={`verse-greek-gloss-option${isCustomMode ? " is-active" : ""}`}
                      onClick={() => {
                        setIsCustomMode(true);
                        setCustomDraft(override?.source === "custom" ? effectiveGloss : "");
                      }}
                      type="button"
                    >
                      Custom…
                    </button>
                    {override ? (
                      <button
                        className="verse-greek-gloss-option"
                        onClick={() => {
                          clearOverride(occurrenceKey);
                          setOpenOccurrenceKey(null);
                          setOpenMorphologyOccurrenceKey(null);
                          setIsCustomMode(false);
                          setCustomDraft("");
                        }}
                        type="button"
                      >
                        Reset to default
                      </button>
                    ) : null}
                  </div>
                  {isCustomMode ? (
                    <div className="verse-greek-gloss-custom">
                      <label className="reader-settings-field" htmlFor={`custom-gloss:${occurrenceKey}`}>
                        <span>Custom gloss</span>
                        <input
                          id={`custom-gloss:${occurrenceKey}`}
                          onChange={(event) => setCustomDraft(event.target.value)}
                          placeholder={defaultGloss || "Enter English gloss"}
                          type="text"
                          value={customDraft}
                        />
                      </label>
                      <button
                        className="reader-inline-button"
                        onClick={() => handleSaveCustomGloss(occurrenceKey, token)}
                        type="button"
                      >
                        Save gloss
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </span>
            {token.trailingPunctuation ? (
              <span aria-hidden="true" className="verse-greek-punctuation">
                {token.trailingPunctuation}
              </span>
            ) : null}
          </span>
        )
      )}
    </div>
  );
}
