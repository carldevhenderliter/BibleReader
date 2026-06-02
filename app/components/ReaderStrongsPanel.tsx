"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { HebrewVerseTextContent } from "@/app/components/HebrewVerseTextContent";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { formatBdagArticle } from "@/lib/bible/bdag";
import { getBookTestamentBySlug } from "@/lib/bible/book-order";
import {
  getGreekLiddellScottEntry,
  getGreekLemmaEntry,
  getGreekVerseOccurrences,
  normalizeGreekFormLookupValue
} from "@/lib/bible/greek";
import {
  getStrongsEntries,
  getStrongsEntry,
  getStrongsVerseOccurrencesWithTokens,
  getVerseEntriesForVersion,
  normalizeStrongsNumber,
  type StrongsParallelVerseVersion,
  type VerseReferenceAnchor
} from "@/lib/bible/strongs";
import {
  getStrongsEnglishHighlightPhrases,
  getStrongsGreekHighlightPhrases
} from "@/lib/bible/strongs-highlighting";
import { formatThayerSection } from "@/lib/bible/thayer";
import type {
  BibleSearchVerseEntry,
  BundledBibleVersion,
  GreekInflectedForm,
  GreekLemmaEntry,
  LiddellScottEntry,
  LiddellScottReference,
  StrongsEntry
} from "@/lib/bible/types";
import { getBibleVersionLabel, getInstalledBundledBibleVersions } from "@/lib/bible/version";
import { findFathersSegmentsByGreekLemma, normalizeFathersGreekText } from "@/lib/fathers/search";
import type { FathersLemmaMatch } from "@/lib/fathers/types";

type OutsideScriptureLookupState = {
  status: "loading" | "loaded";
  matches: FathersLemmaMatch[];
};

type BibleOccurrencesState = {
  status: "loading" | "loaded";
  matches: Array<BibleSearchVerseEntry & { href?: string }>;
};

type BibleOccurrenceVersionEntriesState = {
  status: "loading" | "loaded";
  matches: StrongsParallelVerseVersion[];
};

type LiddellScottLookupState = {
  status: "loading" | "loaded";
  entry: LiddellScottEntry | null;
};

type OccurrenceTestamentFilter = "all" | "old" | "new";

type StrongsTab = "bible" | "dictionaries" | "bdag" | "outside-bible";
type DictionarySection = "lsj" | "thayer" | "bdag";

type DictionaryDisclosureState = Record<string, Partial<Record<DictionarySection, boolean>>>;

function getAvailableTabs(entry: StrongsEntry): StrongsTab[] {
  const tabs: StrongsTab[] = ["bible"];

  if (entry.language === "greek") {
    tabs.push("dictionaries");
  } else if (entry.bdagArticles?.length) {
    tabs.push("bdag");
  }

  if (entry.language === "greek") {
    tabs.push("outside-bible");
  }

  return tabs;
}

function getGreekAvailableTabs() {
  const tabs: StrongsTab[] = ["bible", "dictionaries"];
  tabs.push("outside-bible");
  return tabs;
}

function getTabLabel(tab: StrongsTab) {
  if (tab === "bible") {
    return "Verses In Bible";
  }

  if (tab === "dictionaries") {
    return "Dictionaries";
  }

  if (tab === "bdag") {
    return "BDAG";
  }

  return "Outside Bible";
}

function getDictionarySectionLabel(section: DictionarySection) {
  if (section === "lsj") {
    return "Liddell-Scott";
  }

  if (section === "thayer") {
    return "Thayer";
  }

  return "BDAG";
}

function sanitizeBasicDefinitionPhrase(value: string) {
  return value
    .replace(/\([^)]{0,160}\)/g, " ")
    .replace(/[“”"]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(?:or|and)\s+/i, "")
    .replace(/^[-,:;.\s]+/g, "")
    .replace(/[-,:;.\s]+$/g, "")
    .trim();
}

function isReadableBasicDefinitionPhrase(value: string) {
  const normalized = value.toLowerCase();
  const wordCount = Array.from(value.matchAll(/\b[\p{L}]+(?:[’'][\p{L}]+)?\b/gu)).length;

  return (
    normalized.length >= 2 &&
    value.length <= 48 &&
    wordCount > 0 &&
    wordCount <= 6 &&
    !/\d/.test(value) &&
    !/null/i.test(value) &&
    !/\b(?:common|corresponding|derived|epic|found|periods|prose|reckoning|handled|public|treasury|title|branch|various|verbal)\b/i.test(
      normalized
    ) &&
    !/^[A-Z][a-z]{0,4}$/.test(value)
  );
}

function splitBasicDefinitionPhrases(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .replace(/[\u2014\u2013]/g, ",")
    .split(/[;,/]|\bor\b/gi)
    .map((part) => sanitizeBasicDefinitionPhrase(part))
    .filter((part) => isReadableBasicDefinitionPhrase(part));
}

function splitLiddellScottFallbackPhrases(value?: string | null) {
  if (!value?.trim()) {
    return [];
  }

  return value
    .replace(/\([^)]{0,160}\)/g, " ")
    .replace(/[\p{Script=Greek}]+/gu, " ")
    .replace(/\b[A-Z][A-Za-z]*\.[A-Za-z0-9.:-]+/g, " ")
    .replace(/\b(?:cf|opp|v|exc|usu|sts|freq|esp|al|etc|infr|supr|metaph)\.?\b/gi, " ")
    .split(/[;:,.]/)
    .map((part) => sanitizeBasicDefinitionPhrase(part))
    .filter((part) => isReadableBasicDefinitionPhrase(part));
}

function getLiddellScottBasicDefinitions(
  entry: LiddellScottEntry,
  greekEntry?: GreekLemmaEntry | null,
  strongsEntry?: StrongsEntry | null
) {
  const seen = new Set<string>();

  return [
    ...splitBasicDefinitionPhrases(greekEntry?.shortDefinition),
    ...splitBasicDefinitionPhrases(greekEntry?.longDefinition),
    ...splitBasicDefinitionPhrases(strongsEntry?.definition),
    ...splitBasicDefinitionPhrases(strongsEntry?.outlineUsage),
    ...splitLiddellScottFallbackPhrases(entry.summary)
  ].filter((definition) => {
    const normalized = definition.toLowerCase();

    if (seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  }).slice(0, 6);
}

function formatLiddellScottReference(reference: LiddellScottReference) {
  const expandedLabel = [reference.authorName, reference.workName].filter(Boolean).join(", ");

  return expandedLabel ? `${reference.rawCitation} • ${expandedLabel}` : reference.rawCitation;
}

function formatLiddellScottSectionLabel(label: string) {
  return label === "Opening" ? "Opening" : `Section ${label}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripLiddellScottReferences(
  text: string,
  references: readonly LiddellScottReference[]
) {
  let stripped = text;

  for (const reference of references) {
    const citationPattern = new RegExp(`\\b${escapeRegExp(reference.rawCitation)}\\b`, "g");
    stripped = stripped.replace(citationPattern, "");
  }

  return stripped
    .replace(/\(\s*[,;:]?\s*\)/g, "")
    .replace(/\[\s*[,;:]?\s*\]/g, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,+/g, ", ")
    .replace(/;\s*;+/g, "; ")
    .replace(/:\s*:+/g, ": ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/([,.;:])(?=[A-Za-zΑ-Ωα-ω])/g, "$1 ")
    .replace(/,\s*(?=(?:etc\.|al\.))/g, " ")
    .replace(/,\s*cf\.(?=[,;:.]|$)/g, "")
    .replace(/\bcf\.(?=[,;:.]|$)/g, "")
    .replace(/,\s*(?=[;:.])/g, "")
    .replace(/;\s*(?=[;:.])/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function renderHighlightedGreekContext(context: string, lemma: string) {
  const normalizedLemma = normalizeFathersGreekText(lemma);
  const segments = context.match(/[\p{Script=Greek}]+|[^\p{Script=Greek}]+/gu) ?? [context];

  return segments.map((segment, index) => {
    if (!/[\p{Script=Greek}]/u.test(segment)) {
      return <span key={`${segment}:${index}`}>{segment}</span>;
    }

    return normalizeFathersGreekText(segment) === normalizedLemma ? (
      <mark className="strongs-inline-match" key={`${segment}:${index}`}>
        {segment}
      </mark>
    ) : (
      <span key={`${segment}:${index}`}>{segment}</span>
    );
  });
}

function renderBdagArticles(entry: StrongsEntry) {
  if (!entry.bdagArticles?.length) {
    return <p className="strongs-entry-copy">No BDAG article is available for this lemma.</p>;
  }

  return (
    <>
      {entry.bdagArticles.map((article) => {
        const formattedArticle = formatBdagArticle(article);

        return (
          <section
            className="strongs-entry-bdag-article"
            key={`${entry.id}:${article.headword}:${article.transliteration}`}
          >
            <div className="strongs-entry-bdag-layout">
              <section className="strongs-entry-bdag-card">
                <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                  Headword
                </p>
                <p className="strongs-entry-meta">{formattedArticle.headwordLine}</p>
              </section>
              <section className="strongs-entry-bdag-card">
                <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                  Plain Meaning
                </p>
                <p className="strongs-entry-copy strongs-entry-copy-bdag">
                  {formattedArticle.plainMeaning}
                </p>
              </section>
              {formattedArticle.commonUse ? (
                <section className="strongs-entry-bdag-card">
                  <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                    Common Use
                  </p>
                  <p className="strongs-entry-copy strongs-entry-copy-bdag">
                    {formattedArticle.commonUse}
                  </p>
                </section>
              ) : null}
              {formattedArticle.ntNote ? (
                <section className="strongs-entry-bdag-card">
                  <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                    New Testament Use
                  </p>
                  <p className="strongs-entry-copy strongs-entry-copy-bdag">
                    {formattedArticle.ntNote}
                  </p>
                </section>
              ) : null}
              {formattedArticle.keyTerms.length > 0 ? (
                <section className="strongs-entry-bdag-card">
                  <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                    Key Terms
                  </p>
                  <div className="strongs-entry-bdag-chip-list">
                    {formattedArticle.keyTerms.map((term) => (
                      <span
                        className="strongs-entry-bdag-chip"
                        key={`${entry.id}:${article.headword}:${term}`}
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="strongs-entry-bdag-card">
                <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                  Full BDAG
                </p>
                <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
                  {formattedArticle.fullArticle}
                </p>
              </section>
            </div>
          </section>
        );
      })}
    </>
  );
}

function renderThayerSection(entry: StrongsEntry | null) {
  if (!entry?.outlineUsage?.trim()) {
    return <p className="strongs-entry-copy">No Thayer definition is available for this lemma.</p>;
  }

  const section = formatThayerSection(entry);

  if (!section) {
    return <p className="strongs-entry-copy">No Thayer definition is available for this lemma.</p>;
  }

  return (
    <div className="strongs-entry-thayer-layout">
      <p className="strongs-entry-section-label">Thayer</p>
      {section.rootWord ? (
        <section className="strongs-entry-thayer-card">
          <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
            Root Word
          </p>
          {section.rootWord.strongsId || section.rootWord.lemma ? (
            <p className="strongs-entry-meta">
              {[section.rootWord.strongsId, section.rootWord.lemma].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="strongs-entry-copy">
            {section.rootWord.gloss ?? section.rootWord.raw}
          </p>
        </section>
      ) : null}
      {section.closestDefinition ? (
        <section className="strongs-entry-thayer-card">
          <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
            Closest Definition to the Origin
          </p>
          <p className="strongs-entry-copy">{section.closestDefinition}</p>
        </section>
      ) : null}
      {section.coreMeanings.length > 0 ? (
        <section className="strongs-entry-thayer-card">
          <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
            Core Meanings
          </p>
          <div className="strongs-entry-thayer-chip-list">
            {section.coreMeanings.map((meaning) => (
              <span className="strongs-entry-thayer-chip" key={`core:${meaning}`}>
                {meaning}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {section.extendedMeanings.length > 0 ? (
        <section className="strongs-entry-thayer-card">
          <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
            Extended Meanings
          </p>
          <div className="strongs-entry-thayer-chip-list">
            {section.extendedMeanings.map((meaning) => (
              <span className="strongs-entry-thayer-chip" key={`extended:${meaning}`}>
                {meaning}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="strongs-entry-thayer-card">
        <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
          Full Thayer
        </p>
        <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
          {section.fullThayer}
        </p>
      </section>
    </div>
  );
}

function renderLiddellScottEntry(
  entry: LiddellScottEntry,
  greekEntry?: GreekLemmaEntry | null,
  strongsEntry?: StrongsEntry | null
) {
  const basicDefinitions = getLiddellScottBasicDefinitions(entry, greekEntry, strongsEntry);

  return (
    <div className="strongs-entry-thayer-layout">
      <section className="strongs-entry-thayer-card">
        <p className="strongs-entry-section-label strongs-entry-section-label-subtle">Headword</p>
        <p className="strongs-entry-meta">{entry.headword}</p>
      </section>
      {entry.transliterations.length > 0 ? (
        <section className="strongs-entry-thayer-card">
          <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
            Transliteration
          </p>
          <p className="strongs-entry-copy">{entry.transliterations.join(" · ")}</p>
        </section>
      ) : null}
      <section className="strongs-entry-thayer-card">
        <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
          Basic Definitions
        </p>
        {basicDefinitions.length > 0 ? (
          <div className="strongs-entry-thayer-chip-list">
            {basicDefinitions.map((definition) => (
              <span className="strongs-entry-thayer-chip" key={`${entry.headword}:${definition}`}>
                {definition}
              </span>
            ))}
          </div>
        ) : (
          <p className="strongs-entry-copy">{entry.summary}</p>
        )}
      </section>
      <section className="strongs-entry-thayer-card">
        <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
          Original Liddell-Scott
        </p>
        {entry.sections.length > 0 ? (
          <div className="strongs-entry-lsj-sections">
            {entry.sections.map((section) => (
              <section className="strongs-entry-lsj-section" key={section.id}>
                <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                  {formatLiddellScottSectionLabel(section.label)}
                </p>
                <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
                  {stripLiddellScottReferences(section.text, section.references)}
                </p>
                {section.references.length > 0 ? (
                  <div className="strongs-entry-thayer-chip-list">
                    {section.references.map((reference) => (
                      <span
                        className="strongs-entry-thayer-chip"
                        key={`${section.id}:${reference.rawCitation}`}
                      >
                        {formatLiddellScottReference(reference)}
                      </span>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        ) : (
          <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
            {entry.entry}
          </p>
        )}
      </section>
    </div>
  );
}

export function ReaderStrongsPanel() {
  const {
    activeGreekSelection,
    activeStrongsLabel,
    activeStrongsNumbers,
    openGreekDictionary,
    openGreekGrammarChart,
    openStrongs
  } = useReaderWorkspace();
  const [entries, setEntries] = useState<StrongsEntry[]>([]);
  const [greekEntry, setGreekEntry] = useState<GreekLemmaEntry | null>(null);
  const [greekStrongsEntry, setGreekStrongsEntry] = useState<StrongsEntry | null>(null);
  const [greekOccurrenceEntries, setGreekOccurrenceEntries] = useState<
    Record<string, GreekLemmaEntry | null>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, StrongsTab>>({});
  const [dictionaryDisclosures, setDictionaryDisclosures] =
    useState<DictionaryDisclosureState>({});
  const [bibleOccurrences, setBibleOccurrences] = useState<Record<string, BibleOccurrencesState>>({});
  const [selectedBibleOccurrenceVersions, setSelectedBibleOccurrenceVersions] = useState<
    Record<string, BundledBibleVersion[]>
  >({});
  const [bibleOccurrenceTestamentFilters, setBibleOccurrenceTestamentFilters] = useState<
    Record<string, OccurrenceTestamentFilter>
  >({});
  const [selectedBibleOccurrenceBooks, setSelectedBibleOccurrenceBooks] = useState<
    Record<string, string[]>
  >({});
  const [liddellScottLookup, setLiddellScottLookup] = useState<
    Record<string, LiddellScottLookupState>
  >({});
  const [bibleOccurrenceVersionEntries, setBibleOccurrenceVersionEntries] = useState<
    Record<string, Partial<Record<BundledBibleVersion, BibleOccurrenceVersionEntriesState>>>
  >({});
  const [strongsTokenLemmaMap, setStrongsTokenLemmaMap] = useState<Record<string, string>>({});
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});
  const asyncLoadSessionRef = useRef(0);
  const installedVersions = useMemo(
    () => [...getInstalledBundledBibleVersions()],
    []
  );
  const isGreekDictionaryMode = activeGreekSelection !== null;
  const activeGreekModeSelection = activeGreekSelection;
  const activeGreekEntryKey =
    activeGreekModeSelection?.entryKey ?? activeGreekModeSelection?.strongs ?? null;
  const activePanelTitle =
    activeGreekModeSelection?.lemma ??
    activeStrongsLabel?.trim() ??
    activeStrongsNumbers[0] ??
    "Strongs details";
  const selectedGreekForm = useMemo(() => {
    if (!greekEntry || !activeGreekModeSelection?.selectedForm) {
      return null;
    }

    const normalizedSelectedForm = normalizeGreekFormLookupValue(activeGreekModeSelection.selectedForm);

    return (
      greekEntry.forms.find(
        (form) => normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm
      ) ?? null
    );
  }, [activeGreekModeSelection?.selectedForm, greekEntry]);
  const selectedGreekFormDetails: GreekInflectedForm | null = useMemo(() => {
    if (selectedGreekForm) {
      return selectedGreekForm;
    }

    if (!activeGreekModeSelection?.selectedForm) {
      return null;
    }

    return {
      form: activeGreekModeSelection.selectedForm,
      morphology: activeGreekModeSelection.selectedFormMorphology ?? "",
      decodedMorphology: activeGreekModeSelection.selectedFormDecodedMorphology ?? undefined,
      definition: undefined
    };
  }, [
    activeGreekModeSelection?.selectedFormDecodedMorphology,
    activeGreekModeSelection?.selectedForm,
    activeGreekModeSelection?.selectedFormMorphology,
    selectedGreekForm
  ]);
  const activeGreekGrammarChartSelection = useMemo(() => {
    if (!selectedGreekFormDetails) {
      return null;
    }

    return {
      entryKey: activeGreekEntryKey ?? activeGreekModeSelection?.entryKey ?? "",
      strongs: activeGreekModeSelection?.strongs ?? greekEntry?.strongs ?? null,
      lemma: greekEntry?.lemma ?? activeGreekModeSelection?.lemma ?? "",
      label: activeGreekModeSelection?.label ?? greekEntry?.lemma ?? null,
      selectedForm: selectedGreekFormDetails.form,
      selectedFormMorphology: selectedGreekFormDetails.morphology ?? null,
      selectedFormDecodedMorphology: selectedGreekFormDetails.decodedMorphology ?? null
    };
  }, [
    activeGreekModeSelection?.label,
    activeGreekModeSelection?.lemma,
    activeGreekModeSelection?.strongs,
    activeGreekEntryKey,
    greekEntry?.lemma,
    greekEntry?.strongs,
    selectedGreekFormDetails
  ]);

  useEffect(() => {
    return () => {
      asyncLoadSessionRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isGreekDictionaryMode) {
      asyncLoadSessionRef.current += 1;
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      return;
    }

    if (!activeGreekEntryKey) {
      asyncLoadSessionRef.current += 1;
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    asyncLoadSessionRef.current += 1;
    setIsLoading(true);
    setEntries([]);
    setActiveTabs({});
    setBibleOccurrences({});
    setSelectedBibleOccurrenceVersions({});
    setBibleOccurrenceTestamentFilters({});
    setSelectedBibleOccurrenceBooks({});
    setLiddellScottLookup({});
    setBibleOccurrenceVersionEntries({});
    setOutsideScripture({});
    setDictionaryDisclosures({});

    void Promise.all([
      getGreekLemmaEntry(activeGreekEntryKey),
      activeGreekModeSelection?.strongs
        ? getStrongsEntry(activeGreekModeSelection.strongs)
        : Promise.resolve(null)
    ]).then(([nextGreekEntry, nextGreekStrongsEntry]) => {
        if (isCancelled) {
          return;
        }

        setGreekEntry(nextGreekEntry);
        setGreekStrongsEntry(nextGreekStrongsEntry);
        setIsLoading(false);
        if (nextGreekEntry) {
          setActiveTabs({
            [nextGreekEntry.entryKey]: "bible"
          });
        }
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [
    activeGreekEntryKey,
    activeGreekModeSelection?.selectedForm,
    activeGreekModeSelection?.strongs,
    isGreekDictionaryMode
  ]);

  useEffect(() => {
    if (isGreekDictionaryMode) {
      asyncLoadSessionRef.current += 1;
      return;
    }

    if (activeStrongsNumbers.length === 0) {
      asyncLoadSessionRef.current += 1;
      setEntries([]);
      setIsLoading(false);
      setActiveTabs({});
      setBibleOccurrences({});
      setSelectedBibleOccurrenceVersions({});
      setBibleOccurrenceTestamentFilters({});
      setSelectedBibleOccurrenceBooks({});
      setLiddellScottLookup({});
      setBibleOccurrenceVersionEntries({});
      setGreekOccurrenceEntries({});
      setOutsideScripture({});
      setDictionaryDisclosures({});
      return;
    }

    let isCancelled = false;
    asyncLoadSessionRef.current += 1;
    setIsLoading(true);
    setActiveTabs({});
    setBibleOccurrences({});
    setSelectedBibleOccurrenceVersions({});
    setBibleOccurrenceTestamentFilters({});
    setSelectedBibleOccurrenceBooks({});
    setLiddellScottLookup({});
    setBibleOccurrenceVersionEntries({});
    setGreekOccurrenceEntries({});
    setOutsideScripture({});
    setDictionaryDisclosures({});

    void getStrongsEntries(activeStrongsNumbers).then((nextEntries) => {
      if (!isCancelled) {
        setEntries(nextEntries);
        setIsLoading(false);
        setActiveTabs(
          nextEntries.reduce<Record<string, StrongsTab>>((tabs, entry) => {
            tabs[entry.id] = "bible";
            return tabs;
          }, {})
        );
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [activeStrongsNumbers, isGreekDictionaryMode]);

  useEffect(() => {
    const activeIds = [...entries.map((entry) => entry.id), ...(greekEntry ? [greekEntry.entryKey] : [])];
    const asyncLoadSession = asyncLoadSessionRef.current;

    activeIds.forEach((entryId) => {
      if (bibleOccurrences[entryId]) {
        return;
      }

      setBibleOccurrences((current) => ({
        ...current,
        [entryId]: {
          status: "loading",
          matches: []
        }
      }));

      const lookupPromise =
        greekEntry?.entryKey === entryId
          ? getGreekVerseOccurrences(
              entryId,
              isGreekDictionaryMode &&
                activeGreekModeSelection?.entryKey === entryId
                ? activeGreekModeSelection.selectedForm ?? null
                : null
            )
          : getStrongsVerseOccurrencesWithTokens(entryId);

      void lookupPromise.then((matches) => {
        if (asyncLoadSessionRef.current !== asyncLoadSession) {
          return;
        }

        setBibleOccurrences((current) => ({
          ...current,
          [entryId]: {
            status: "loaded",
            matches
          }
        }));
      });
    });
  }, [
    activeGreekModeSelection?.entryKey,
    activeGreekModeSelection?.selectedForm,
    bibleOccurrences,
    entries,
    greekEntry,
    isGreekDictionaryMode
  ]);

  useEffect(() => {
    const greekEntryIds = entries
      .filter((entry) => entry.language === "greek")
      .map((entry) => entry.id)
      .filter((entryId) => !(entryId in greekOccurrenceEntries));

    if (greekEntryIds.length === 0) {
      return;
    }

    let isCancelled = false;

    greekEntryIds.forEach((entryId) => {
      void getGreekLemmaEntry(entryId).then((entry) => {
        if (isCancelled) {
          return;
        }

        setGreekOccurrenceEntries((current) => ({
          ...current,
          [entryId]: entry
        }));
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [entries, greekOccurrenceEntries]);

  useEffect(() => {
    const nextDefaults: Record<string, BundledBibleVersion[]> = {};
    const nextAvailableVersions: Record<string, readonly BundledBibleVersion[]> = {};

    if (greekEntry) {
      nextAvailableVersions[greekEntry.entryKey] =
        getAvailableBibleOccurrenceVersions("greek-dictionary");
      nextDefaults[greekEntry.entryKey] = getDefaultBibleOccurrenceVersions("greek-dictionary");
    }

    for (const entry of entries) {
      nextAvailableVersions[entry.id] = getAvailableBibleOccurrenceVersions(entry.language);
      nextDefaults[entry.id] = getDefaultBibleOccurrenceVersions(entry.language);
    }

    setSelectedBibleOccurrenceVersions((current) => {
      let changed = false;
      const nextState = { ...current };

      for (const [entryId, defaultVersions] of Object.entries(nextDefaults)) {
        const selectedVersions = nextState[entryId];
        const availableVersions = nextAvailableVersions[entryId] ?? [];

        const normalizedSelection =
          selectedVersions?.filter((selectedVersion) => availableVersions.includes(selectedVersion)) ?? [];

        if (normalizedSelection.length === 0) {
          nextState[entryId] = defaultVersions;
          changed = true;
        } else if (
          !selectedVersions ||
          normalizedSelection.length !== selectedVersions.length
        ) {
          nextState[entryId] = normalizedSelection;
          changed = true;
        }
      }

      return changed ? nextState : current;
    });
  }, [entries, greekEntry, installedVersions]);

  useEffect(() => {
    const asyncLoadSession = asyncLoadSessionRef.current;

    const loadEntriesForVersion = async (
      entryId: string,
      version: BundledBibleVersion,
      anchors: readonly VerseReferenceAnchor[]
    ) => {
      const matches = await getVerseEntriesForVersion(anchors, version);

      if (asyncLoadSessionRef.current !== asyncLoadSession) {
        return;
      }

      setBibleOccurrenceVersionEntries((current) => ({
        ...current,
        [entryId]: {
          ...(current[entryId] ?? {}),
          [version]: {
            status: "loaded",
            matches
          }
        }
      }));
    };

    const loadTargets = new Map<
      string,
      {
        entryId: string;
        version: BundledBibleVersion;
        anchors: VerseReferenceAnchor[];
      }
    >();

    if (greekEntry) {
      const occurrences = bibleOccurrences[greekEntry.entryKey];
      const selectedVersions =
        selectedBibleOccurrenceVersions[greekEntry.entryKey] ??
        getDefaultBibleOccurrenceVersions("greek-dictionary");

      if (occurrences?.status === "loaded" && occurrences.matches.length > 0) {
        const anchors = occurrences.matches.map(
          (match): VerseReferenceAnchor => ({
            bookSlug: match.bookSlug,
            chapterNumber: match.chapterNumber,
            verseNumber: match.verseNumber
          })
        );

        for (const selectedVersion of selectedVersions) {
          if (selectedVersion === "greek") {
            continue;
          }

          loadTargets.set(`${greekEntry.entryKey}:${selectedVersion}`, {
            entryId: greekEntry.entryKey,
            version: selectedVersion,
            anchors
          });
        }

        if (selectedVersions.includes("kjv") && installedVersions.includes("greek")) {
          loadTargets.set(`${greekEntry.entryKey}:greek`, {
            entryId: greekEntry.entryKey,
            version: "greek",
            anchors
          });
        }
      }
    }

    for (const entry of entries) {
      const occurrences = bibleOccurrences[entry.id];
      const selectedVersions =
        selectedBibleOccurrenceVersions[entry.id] ?? getDefaultBibleOccurrenceVersions(entry.language);

      if (occurrences?.status === "loaded" && occurrences.matches.length > 0) {
        const anchors = occurrences.matches.map(
          (match): VerseReferenceAnchor => ({
            bookSlug: match.bookSlug,
            chapterNumber: match.chapterNumber,
            verseNumber: match.verseNumber
          })
        );

        for (const selectedVersion of selectedVersions) {
          if (selectedVersion === "kjv") {
            continue;
          }

          loadTargets.set(`${entry.id}:${selectedVersion}`, {
            entryId: entry.id,
            version: selectedVersion,
            anchors
          });
        }

        if (
          entry.language === "greek" &&
          selectedVersions.includes("kjv") &&
          installedVersions.includes("greek")
        ) {
          loadTargets.set(`${entry.id}:greek`, {
            entryId: entry.id,
            version: "greek",
            anchors
          });
        }
      }
    }

    for (const { entryId, version: selectedVersion, anchors } of loadTargets.values()) {
      if (bibleOccurrenceVersionEntries[entryId]?.[selectedVersion]) {
        continue;
      }

      setBibleOccurrenceVersionEntries((current) => ({
        ...current,
        [entryId]: {
          ...(current[entryId] ?? {}),
          [selectedVersion]: {
            status: "loading",
            matches: []
          }
        }
      }));

      void loadEntriesForVersion(entryId, selectedVersion, anchors);
    }
  }, [
    bibleOccurrenceVersionEntries,
    bibleOccurrences,
    entries,
    greekEntry,
    installedVersions,
    selectedBibleOccurrenceVersions
  ]);

  useEffect(() => {
    const neededStrongsNumbers = new Set<string>();

    const collectNeededNumbers = (entryId: string, sourceIsKjv: boolean) => {
      const selectedVersions =
        selectedBibleOccurrenceVersions[entryId] ?? getDefaultBibleOccurrenceVersions("greek-dictionary");
      const kjvState = selectedVersions.includes("kjv")
        ? (
            bibleOccurrenceVersionEntries[entryId]?.kjv ??
            (sourceIsKjv && bibleOccurrences[entryId]?.status === "loaded"
              ? {
                  status: "loaded" as const,
                  matches: bibleOccurrences[entryId]?.matches ?? []
                }
              : null)
          )
        : null;

      if (!kjvState || kjvState.status !== "loaded") {
        return;
      }

      for (const match of kjvState.matches) {
        const tokens = "entry" in match ? (match.entry?.tokens ?? []) : (match.tokens ?? []);

        for (const token of tokens) {
          for (const strongsNumber of token.strongsNumbers ?? []) {
            if (strongsNumber) {
              neededStrongsNumbers.add(normalizeStrongsNumber(strongsNumber));
            }
          }
        }
      }
    };

    if (greekEntry) {
      collectNeededNumbers(greekEntry.entryKey, false);
    }

    for (const entry of entries) {
      if (entry.language === "greek") {
        collectNeededNumbers(entry.id, true);
      }
    }

    const missingStrongsNumbers = Array.from(neededStrongsNumbers).filter(
      (strongsNumber) => !strongsTokenLemmaMap[strongsNumber]
    );

    if (missingStrongsNumbers.length === 0) {
      return;
    }

    let isCancelled = false;

    void getStrongsEntries(missingStrongsNumbers).then((resolvedEntries) => {
      if (isCancelled) {
        return;
      }

      setStrongsTokenLemmaMap((current) => ({
        ...current,
        ...resolvedEntries.reduce<Record<string, string>>((lemmaMap, entry) => {
          lemmaMap[entry.id] = entry.lemma;

          return lemmaMap;
        }, {})
      }));
    });

    return () => {
      isCancelled = true;
    };
  }, [
    bibleOccurrences,
    bibleOccurrenceVersionEntries,
    entries,
    greekEntry,
    selectedBibleOccurrenceVersions,
    strongsTokenLemmaMap
  ]);

  async function handleFindOutsideScripture(lemma: string, strongsKey: string) {
    setOutsideScripture((current) => ({
      ...current,
      [strongsKey]: {
        status: "loading",
        matches: current[strongsKey]?.matches ?? []
      }
    }));

    const matches = await findFathersSegmentsByGreekLemma(lemma);

    setOutsideScripture((current) => ({
      ...current,
      [strongsKey]: {
        status: "loaded",
        matches
      }
    }));
  }

  async function handleFindLiddellScott(entryKey: string) {
    const asyncLoadSession = asyncLoadSessionRef.current;

    setLiddellScottLookup((current) => ({
      ...current,
      [entryKey]: {
        status: "loading",
        entry: current[entryKey]?.entry ?? null
      }
    }));

    const entry = await getGreekLiddellScottEntry(entryKey);

    if (asyncLoadSessionRef.current !== asyncLoadSession) {
      return;
    }

    setLiddellScottLookup((current) => ({
      ...current,
      [entryKey]: {
        status: "loaded",
        entry
      }
    }));
  }

  function handleToggleDictionarySection(entryKey: string, section: DictionarySection) {
    const nextIsOpen = !(dictionaryDisclosures[entryKey]?.[section] ?? false);

    setDictionaryDisclosures((current) => {
      const nextEntryState = {
        ...(current[entryKey] ?? {}),
        [section]: nextIsOpen
      };

      return {
        ...current,
        [entryKey]: nextEntryState
      };
    });

    if (section === "lsj" && nextIsOpen && !liddellScottLookup[entryKey]) {
      void handleFindLiddellScott(entryKey);
    }
  }

  function handleSelectTab(strongsKey: string, tab: StrongsTab, greekLemma?: string) {
    setActiveTabs((current) => ({
      ...current,
      [strongsKey]: tab
    }));

    if (tab === "outside-bible" && greekLemma && !outsideScripture[strongsKey]) {
      void handleFindOutsideScripture(greekLemma, strongsKey);
    }
  }

  function getAvailableBibleOccurrenceVersions(language: StrongsEntry["language"] | "greek-dictionary") {
    if (language === "greek" || language === "greek-dictionary") {
      return installedVersions;
    }

    return installedVersions.filter((version) => version !== "greek" && version !== "tr");
  }

  function getDefaultBibleOccurrenceVersion(
    language: StrongsEntry["language"] | "greek-dictionary"
  ) {
    const versions = getAvailableBibleOccurrenceVersions(language);

    if (versions.length === 0) {
      return null;
    }

    if ((language === "greek" || language === "greek-dictionary") && versions.includes("greek")) {
      return "greek";
    }

    if (language === "hebrew" && versions.includes("mt")) {
      return "mt";
    }

    if (versions.includes("kjv")) {
      return "kjv";
    }

    return versions[0] ?? null;
  }

  function getDefaultBibleOccurrenceVersions(
    language: StrongsEntry["language"] | "greek-dictionary"
  ) {
    const defaultVersion = getDefaultBibleOccurrenceVersion(language);

    return defaultVersion ? [defaultVersion] : [];
  }

  function getBibleOccurrenceSourceVersion(mode: "strongs" | "greek") {
    return mode === "greek" ? "greek" : "kjv";
  }

  function getGreekHighlightPhrases(entryId: string) {
    const sourceEntry =
      (greekEntry?.entryKey === entryId ? greekEntry : null) ?? greekOccurrenceEntries[entryId] ?? null;

    return getStrongsGreekHighlightPhrases(entryId, {
      sourceEntry
    });
  }

  function renderTextWithGreekHighlights(text: string, phrases: readonly string[]) {
    const normalizedPhrases = Array.from(
      new Set(
        phrases
          .map((phrase) => phrase.trim())
          .filter(Boolean)
          .sort((left, right) => right.length - left.length)
      )
    );

    if (normalizedPhrases.length === 0) {
      return text;
    }

    const pattern = new RegExp(
      normalizedPhrases
        .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
      "gu"
    );
    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;

      if (index > cursor) {
        parts.push(text.slice(cursor, index));
      }

      parts.push(
        <mark className="strongs-inline-match" key={`${index}:${match[0]}`}>
          {text.slice(index, index + match[0].length)}
        </mark>
      );
      cursor = index + match[0].length;
    }

    if (cursor < text.length) {
      parts.push(text.slice(cursor));
    }

    return parts.length > 0 ? parts : text;
  }

  function renderKjvStackedOccurrence(
    entryId: string,
    highlightStrongsNumber: string | null,
    kjvVerse: BibleSearchVerseEntry,
    greekVerse: BibleSearchVerseEntry | null
  ) {
    return (
      <div className="strongs-entry-bible-verse-stack">
        <p className="strongs-entry-copy strongs-entry-bible-verse-text strongs-entry-bible-verse-text-kjv">
          {(kjvVerse.tokens ?? []).map((token, index) => {
            if (!token.strongsNumbers?.length) {
              return (
                <span
                  className="strongs-text-segment"
                  key={`${kjvVerse.verseNumber}:${index}:${token.text}`}
                >
                  {token.text}
                </span>
              );
            }

            const tokenStrongsNumbers = token.strongsNumbers ?? [];

            const tokenLemmas = Array.from(
              new Set(
                tokenStrongsNumbers
                  .map((strongsNumber) => strongsTokenLemmaMap[normalizeStrongsNumber(strongsNumber)] ?? "")
                  .filter(Boolean)
              )
            );

            return (
              <button
                aria-label={`${token.text.trim()} ${tokenStrongsNumbers.join(" ")}`}
                className={`strongs-token${tokenLemmas.length ? " strongs-token-interlinear" : ""}${
                  highlightStrongsNumber &&
                  tokenStrongsNumbers.some(
                    (strongsNumber) =>
                      normalizeStrongsNumber(strongsNumber) ===
                      normalizeStrongsNumber(highlightStrongsNumber)
                  )
                    ? " strongs-token-match"
                    : ""
                }`}
                key={`${kjvVerse.verseNumber}:${index}:${token.text}`}
                onClick={() => openStrongs(tokenStrongsNumbers, tokenStrongsNumbers.join(" "))}
                type="button"
              >
                <span className="strongs-token-surface">
                  <span>{token.text}</span>
                  <span className="strongs-token-numbers">{tokenStrongsNumbers.join(" ")}</span>
                </span>
                {tokenLemmas.length ? (
                  <span className="strongs-token-lemma">{tokenLemmas.join(" · ")}</span>
                ) : null}
              </button>
            );
          })}
        </p>
        {greekVerse ? (
          greekVerse.greekTokens?.length ? (
            <GreekVerseTextContent
              className="strongs-entry-copy strongs-entry-bible-verse-text strongs-entry-bible-verse-text-greek-companion verse-text-greek"
              enableGreekLearning={false}
              highlightedEntryKey={entryId}
              onOpenGreekDictionary={openGreekDictionary}
              verse={{
                number: greekVerse.verseNumber,
                text: greekVerse.text,
                greekTokens: greekVerse.greekTokens
              }}
            />
          ) : (
            <p
              className="strongs-entry-copy strongs-entry-bible-verse-text strongs-entry-bible-verse-text-greek-companion verse-text-greek"
              lang="el"
            >
              {renderTextWithGreekHighlights(greekVerse.text, getGreekHighlightPhrases(entryId))}
            </p>
          )
        ) : null}
      </div>
    );
  }

  function renderBibleOccurrences(
    entryId: string,
    mode: "strongs" | "greek",
    language: StrongsEntry["language"] | "greek-dictionary",
    highlightStrongsNumber: string | null = null
  ) {
    const sourceVersion = getBibleOccurrenceSourceVersion(mode);
    const occurrences = bibleOccurrences[entryId];
    const availableVersions = getAvailableBibleOccurrenceVersions(language);
    const selectedVersions =
      selectedBibleOccurrenceVersions[entryId] ?? getDefaultBibleOccurrenceVersions(language);
    const testamentFilter = bibleOccurrenceTestamentFilters[entryId] ?? "all";
    const versionStates = Object.fromEntries(
      selectedVersions.map((version) => [
        version,
        bibleOccurrenceVersionEntries[entryId]?.[version] ?? null
      ])
    ) as Partial<Record<BundledBibleVersion, BibleOccurrenceVersionEntriesState | null>>;
    const greekCompanionState =
      selectedVersions.includes("kjv") &&
      (language === "greek" || language === "greek-dictionary") &&
      !selectedVersions.includes("greek")
        ? bibleOccurrenceVersionEntries[entryId]?.greek ?? null
        : null;
    const isOccurrencesLoading = !occurrences || occurrences.status === "loading";
    const hasOccurrences = (occurrences?.matches.length ?? 0) > 0;
    const occurrenceBooks = Array.from(
      new Map(
        (occurrences?.matches ?? []).map((match) => [
          match.bookSlug,
          {
            slug: match.bookSlug,
            name: match.bookName,
            testament: getBookTestamentBySlug(match.bookSlug)
          }
        ])
      ).values()
    );
    const selectedBooks = selectedBibleOccurrenceBooks[entryId] ?? occurrenceBooks.map((book) => book.slug);
    const visibleFilterBooks = occurrenceBooks.filter((book) => {
      if (testamentFilter === "old") {
        return book.testament === "Old";
      }

      if (testamentFilter === "new") {
        return book.testament === "New";
      }

      return true;
    });
    const filteredOccurrences = (occurrences?.matches ?? []).flatMap((match, index) => {
      const bookTestament = getBookTestamentBySlug(match.bookSlug);
      const matchesTestament =
        testamentFilter === "all" ||
        (testamentFilter === "old" && bookTestament === "Old") ||
        (testamentFilter === "new" && bookTestament === "New");

      if (!matchesTestament || !selectedBooks.includes(match.bookSlug)) {
        return [];
      }

      return [{ match, index }];
    });

    const toggleSelectedVersion = (version: BundledBibleVersion) => {
      setSelectedBibleOccurrenceVersions((current) => {
        const currentSelection = current[entryId] ?? getDefaultBibleOccurrenceVersions(language);
        const nextSelection = currentSelection.includes(version)
          ? currentSelection.length > 1
            ? currentSelection.filter((selectedVersion) => selectedVersion !== version)
            : currentSelection
          : availableVersions.filter((candidate) => currentSelection.includes(candidate) || candidate === version);

        return {
          ...current,
          [entryId]: nextSelection
        };
      });
    };

    return (
      <div className="strongs-entry-bible-section">
        <div className="strongs-entry-bible-toolbar">
          <p className="strongs-entry-section-label">Verses In Bible</p>
          <div className="strongs-entry-bible-filter-group">
            <p className="strongs-entry-section-label strongs-entry-section-label-subtle">Versions</p>
            <div
              aria-label={`Display versions for ${entryId}`}
              className="strongs-entry-bible-version-selector"
              role="group"
            >
              {availableVersions.map((version) => (
                <button
                  aria-pressed={selectedVersions.includes(version)}
                  className={`reader-inline-button strongs-entry-bible-version-button${
                    selectedVersions.includes(version) ? " is-active" : ""
                  }`}
                  key={`${entryId}:${version}`}
                  onClick={() => toggleSelectedVersion(version)}
                  type="button"
                >
                  {getBibleVersionLabel(version)}
                </button>
              ))}
            </div>
          </div>
        </div>
        {hasOccurrences ? (
          <>
            <div className="strongs-entry-bible-filter-group">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">Scope</p>
              <div
                aria-label={`Testament filter for ${entryId}`}
                className="strongs-entry-bible-version-selector strongs-entry-bible-version-selector-compact"
                role="group"
              >
                <button
                  aria-label="All Books"
                  aria-pressed={testamentFilter === "all"}
                  className={`reader-inline-button strongs-entry-bible-version-button${
                    testamentFilter === "all" ? " is-active" : ""
                  }`}
                  onClick={() =>
                    setBibleOccurrenceTestamentFilters((current) => ({
                      ...current,
                      [entryId]: "all"
                    }))
                  }
                  type="button"
                >
                  All
                </button>
                <button
                  aria-label="Old Testament"
                  aria-pressed={testamentFilter === "old"}
                  className={`reader-inline-button strongs-entry-bible-version-button${
                    testamentFilter === "old" ? " is-active" : ""
                  }`}
                  onClick={() =>
                    setBibleOccurrenceTestamentFilters((current) => ({
                      ...current,
                      [entryId]: "old"
                    }))
                  }
                  type="button"
                >
                  OT
                </button>
                <button
                  aria-label="New Testament"
                  aria-pressed={testamentFilter === "new"}
                  className={`reader-inline-button strongs-entry-bible-version-button${
                    testamentFilter === "new" ? " is-active" : ""
                  }`}
                  onClick={() =>
                    setBibleOccurrenceTestamentFilters((current) => ({
                      ...current,
                      [entryId]: "new"
                    }))
                  }
                  type="button"
                >
                  NT
                </button>
              </div>
            </div>
            {visibleFilterBooks.length > 0 ? (
              <div className="strongs-entry-bible-filter-group">
                <p className="strongs-entry-section-label strongs-entry-section-label-subtle">Books</p>
                <div
                  aria-label={`Book filter for ${entryId}`}
                  className="strongs-entry-bible-book-filter"
                  role="group"
                >
                  {visibleFilterBooks.map((book) => {
                    const isSelected = selectedBooks.includes(book.slug);

                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`strongs-entry-bible-book-chip${isSelected ? " is-active" : ""}`}
                        key={`${entryId}:${book.slug}`}
                        onClick={() =>
                          setSelectedBibleOccurrenceBooks((current) => {
                            const currentSelection =
                              current[entryId] ??
                              occurrenceBooks.map((occurrenceBook) => occurrenceBook.slug);
                            const nextSelection = currentSelection.includes(book.slug)
                              ? currentSelection.filter((slug) => slug !== book.slug)
                              : [...currentSelection, book.slug];

                            return {
                              ...current,
                              [entryId]: nextSelection
                            };
                          })
                        }
                        type="button"
                      >
                        <span className="strongs-entry-bible-book-chip-kicker">
                          {book.testament === "Old" ? "OT" : "NT"}
                        </span>
                        <span>{book.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
        {isOccurrencesLoading ? (
          <p className="strongs-entry-meta">
            {mode === "greek" ? "Loading Greek verse occurrences…" : "Loading KJV verse occurrences…"}
          </p>
        ) : null}
        {!isOccurrencesLoading && !hasOccurrences ? (
          <p className="strongs-entry-copy">
            {mode === "greek"
              ? "No Greek Bible occurrences were found for this entry."
              : "No KJV verse occurrences were found for this Strong’s number."}
          </p>
        ) : null}
        {selectedVersions.some((version) => {
          if (version === sourceVersion) {
            return false;
          }

          const versionState = versionStates[version] ?? null;
          return !versionState || versionState.status === "loading";
        }) ? (
          <p className="strongs-entry-meta">
            Loading{" "}
            {selectedVersions.map((version) => getBibleVersionLabel(version)).join(" + ")} verses…
          </p>
        ) : null}
        {hasOccurrences ? (
          <div className="strongs-entry-bible-verses">
            {filteredOccurrences.length === 0 ? (
              <p className="strongs-entry-copy">No verses match the current filters.</p>
            ) : (
              filteredOccurrences.map(({ match, index }) => {
                const highlightPhrases = getStrongsEnglishHighlightPhrases(entryId, match, mode);
                const greekHighlightPhrases = getStrongsGreekHighlightPhrases(entryId, {
                  sourceEntry:
                    (greekEntry?.entryKey === entryId ? greekEntry : null) ??
                    greekOccurrenceEntries[entryId] ??
                    null,
                  match
                });

                return (
                  <article
                    className="strongs-entry-bible-verse"
                    key={`${entryId}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                  >
                    <p className="strongs-entry-meta">
                      {match.bookName} {match.chapterNumber}:{match.verseNumber}
                    </p>
                    <div className="strongs-entry-bible-version-list">
                      {selectedVersions.map((selectedVersion) => {
                        const versionState = versionStates[selectedVersion] ?? null;
                        const versionMatch =
                          selectedVersion === sourceVersion
                            ? match
                            : (versionState?.matches[index]?.entry ?? null);

                        return (
                          <div
                            className="strongs-entry-bible-version-row"
                            key={`${entryId}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}:${selectedVersion}`}
                          >
                            <p className="strongs-entry-meta strongs-entry-bible-version-label">
                              {getBibleVersionLabel(selectedVersion)}
                            </p>
                            {versionMatch ? (
                              selectedVersion === "kjv" &&
                              (language === "greek" || language === "greek-dictionary") ? (
                                renderKjvStackedOccurrence(
                                  entryId,
                                  highlightStrongsNumber,
                                  versionMatch,
                                  greekCompanionState?.status === "loaded"
                                    ? (greekCompanionState.matches[index]?.entry ?? null)
                                    : null
                                )
                              ) : selectedVersion === "greek" ? (
                                versionMatch.greekTokens?.length ? (
                                  <GreekVerseTextContent
                                    className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-greek"
                                    enableGreekLearning={false}
                                    highlightedEntryKey={entryId}
                                    onOpenGreekDictionary={openGreekDictionary}
                                    verse={{
                                      number: versionMatch.verseNumber,
                                      text: versionMatch.text,
                                      greekTokens: versionMatch.greekTokens
                                    }}
                                  />
                                ) : (
                                  <VerseTextContent
                                    className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-greek"
                                    highlightedPhrases={greekHighlightPhrases}
                                    verse={{
                                      number: versionMatch.verseNumber,
                                      text: versionMatch.text
                                    }}
                                  />
                                )
                              ) : selectedVersion === "mt" ? (
                                versionMatch.hebrewTokens?.length ? (
                                  <HebrewVerseTextContent
                                    className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-hebrew"
                                    highlightedStrongsNumber={highlightStrongsNumber}
                                    onOpenStrongs={(strongsNumber, label) =>
                                      openStrongs(strongsNumber, label)
                                    }
                                    showStrongsNumbers
                                    verse={{
                                      number: versionMatch.verseNumber,
                                      text: versionMatch.text,
                                      hebrewTokens: versionMatch.hebrewTokens
                                    }}
                                  />
                                ) : (
                                  <VerseTextContent
                                    className="strongs-entry-copy strongs-entry-bible-verse-text verse-text-hebrew"
                                    highlightedPhrases={[]}
                                    verse={{
                                      number: versionMatch.verseNumber,
                                      text: versionMatch.text
                                    }}
                                  />
                                )
                              ) : (
                                <VerseTextContent
                                  className="strongs-entry-copy strongs-entry-bible-verse-text"
                                  highlightedPhrases={selectedVersion === "kjv" ? [] : highlightPhrases}
                                  highlightedStrongsNumber={
                                    selectedVersion === "kjv" ? highlightStrongsNumber : null
                                  }
                                  onOpenStrongs={(strongsNumbers) =>
                                    openStrongs(strongsNumbers, strongsNumbers.join(" "))
                                  }
                                  showStrongs={selectedVersion === "kjv"}
                                  verse={{
                                    number: versionMatch.verseNumber,
                                    text: versionMatch.text,
                                    translationText: versionMatch.translationText,
                                    tokens: versionMatch.tokens,
                                    greekTokens: versionMatch.greekTokens
                                  }}
                                />
                              )
                            ) : !versionState || versionState.status === "loading" ? null : (
                              <p className="strongs-entry-copy">
                                This verse is not available in {getBibleVersionLabel(selectedVersion)}.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selectedVersions.includes("kjv") &&
                    (language === "greek" || language === "greek-dictionary") &&
                    !selectedVersions.includes("greek") &&
                    greekCompanionState?.status === "loading" ? (
                      <p className="strongs-entry-meta">Loading Greek verse…</p>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderOutsideBibleSection(strongsNumber: string, lemma: string) {
    const state = outsideScripture[strongsNumber];

    if (state?.status === "loading") {
      return (
        <p className="strongs-entry-meta">
          Searching the Apostolic Fathers for this Greek lemma…
        </p>
      );
    }

    if (state?.status === "loaded" && state.matches.length) {
      return Object.entries(
        state.matches.reduce<Record<string, FathersLemmaMatch[]>>((groups, match) => {
          groups[match.workTitle] = groups[match.workTitle]
            ? [...groups[match.workTitle], match]
            : [match];

          return groups;
        }, {})
      ).map(([workTitle, matches]) => (
        <section className="strongs-entry-fathers-group" key={`${strongsNumber}:${workTitle}`}>
          <h4 className="strongs-entry-fathers-title">{workTitle}</h4>
          <div className="strongs-entry-fathers-list">
            {matches.map((match) => (
              <article className="strongs-entry-fathers-hit" key={match.segmentId}>
                <p className="strongs-entry-meta">
                  {match.label}
                  {match.ref !== match.label ? ` (${match.ref})` : ""}
                </p>
                <div className="strongs-entry-fathers-interlinear">
                  <div className="strongs-entry-fathers-line-pair">
                    <p className="strongs-entry-copy strongs-entry-fathers-greek">
                      {renderHighlightedGreekContext(match.greekContext, lemma)}
                    </p>
                    <p className="strongs-entry-copy strongs-entry-fathers-english">
                      {match.englishContext}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ));
    }

    if (state?.status === "loaded") {
      return (
        <p className="strongs-entry-copy">
          No Apostolic Fathers matches found for this lemma.
        </p>
      );
    }

    return <p className="strongs-entry-meta">Select this tab to search the Apostolic Fathers.</p>;
  }

  function renderLiddellScottSection(
    entryKey: string,
    sourceGreekEntry?: GreekLemmaEntry | null,
    sourceStrongsEntry?: StrongsEntry | null
  ) {
    const state = liddellScottLookup[entryKey];

    if (state?.status === "loading") {
      return <p className="strongs-entry-meta">Loading Liddell-Scott…</p>;
    }

    if (state?.status === "loaded" && state.entry) {
      return renderLiddellScottEntry(state.entry, sourceGreekEntry, sourceStrongsEntry);
    }

    if (state?.status === "loaded") {
      return <p className="strongs-entry-copy">No Liddell-Scott entry is available for this lemma.</p>;
    }

    return <p className="strongs-entry-meta">Open this section to load the Liddell-Scott lexicon.</p>;
  }

  function renderDictionaryDisclosure(
    entryKey: string,
    section: DictionarySection,
    content: ReactNode
  ) {
    const isOpen = dictionaryDisclosures[entryKey]?.[section] ?? false;
    const label = getDictionarySectionLabel(section);
    const contentId = `${entryKey}-${section}-dictionary-panel`;

    return (
      <section className="strongs-entry-dictionary-disclosure" key={`${entryKey}:${section}`}>
        <button
          aria-controls={contentId}
          aria-expanded={isOpen}
          className={`strongs-entry-dictionary-toggle${isOpen ? " is-open" : ""}`}
          onClick={() => handleToggleDictionarySection(entryKey, section)}
          type="button"
        >
          <span className="strongs-entry-dictionary-toggle-icon" aria-hidden="true">
            ▸
          </span>
          <span>{label}</span>
        </button>
        {isOpen ? (
          <div className="strongs-entry-dictionary-body" id={contentId}>
            {content}
          </div>
        ) : null}
      </section>
    );
  }

  function renderDictionarySections(
    entryKey: string,
    sourceGreekEntry?: GreekLemmaEntry | null,
    sourceStrongsEntry?: StrongsEntry | null
  ) {
    const sections: ReactNode[] = [
      renderDictionaryDisclosure(
        entryKey,
        "lsj",
        renderLiddellScottSection(entryKey, sourceGreekEntry, sourceStrongsEntry)
      )
    ];

    if (sourceStrongsEntry?.outlineUsage?.trim()) {
      sections.push(
        renderDictionaryDisclosure(entryKey, "thayer", renderThayerSection(sourceStrongsEntry))
      );
    }

    if (sourceStrongsEntry?.bdagArticles?.length) {
      sections.push(
        renderDictionaryDisclosure(entryKey, "bdag", renderBdagArticles(sourceStrongsEntry))
      );
    }

    return <div className="strongs-entry-dictionary-list">{sections}</div>;
  }

  function renderGreekDictionaryCard(entry: GreekLemmaEntry) {
    const strongsKey = entry.entryKey;
    const activeTab = activeTabs[strongsKey] ?? "bible";

    return (
      <article className="strongs-entry-card greek-dictionary-card" key={entry.entryKey}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{entry.strongs ?? entry.entryKey}</span>
          <span className="strongs-entry-language">Greek dictionary</span>
        </div>
        <p className="strongs-entry-lemma greek-dictionary-lemma">{entry.lemma}</p>
        <div className="greek-dictionary-meta-list">
          <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
          {entry.pronunciation ? (
            <p className="strongs-entry-meta">Pronunciation: {entry.pronunciation}</p>
          ) : null}
        </div>
        <div
          className="strongs-entry-tabs"
          role="tablist"
          aria-label={`${entry.strongs ?? entry.entryKey} study tabs`}
        >
          {getGreekAvailableTabs().map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={`lookup-pane-tab${activeTab === tab ? " is-active" : ""}`}
              key={`${entry.entryKey}:${tab}`}
              onClick={() => handleSelectTab(entry.entryKey, tab, entry.lemma)}
              role="tab"
              type="button"
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        <div className="greek-dictionary-definition">
          <p className="strongs-entry-section-label">Lemma Definition</p>
          <p className="strongs-entry-copy">{entry.shortDefinition}</p>
          {entry.longDefinition && !greekStrongsEntry?.outlineUsage?.trim() ? (
            <p className="strongs-entry-copy greek-dictionary-long-definition">
              {entry.longDefinition}
            </p>
          ) : null}
          {activeGreekGrammarChartSelection ? (
            <button
              className="reader-inline-button"
              onClick={() => openGreekGrammarChart(activeGreekGrammarChartSelection)}
              type="button"
            >
              Open charts
            </button>
          ) : null}
        </div>
        {activeTab === "bible" ? (
          <div className="strongs-entry-tab-panel">
            {renderBibleOccurrences(
              entry.entryKey,
              "greek",
              "greek-dictionary",
              entry.strongs ?? greekStrongsEntry?.id ?? null
            )}
          </div>
        ) : null}
        {activeTab === "dictionaries" ? (
          <div className="strongs-entry-tab-panel">
            <p className="strongs-entry-section-label">Dictionaries</p>
            {renderDictionarySections(entry.entryKey, entry, greekStrongsEntry)}
          </div>
        ) : null}
        {activeTab === "outside-bible" ? (
          <div className="strongs-entry-tab-panel strongs-entry-outside-scripture-results">
            <p className="strongs-entry-section-label">Verses Found Outside Bible</p>
            {renderOutsideBibleSection(entry.entryKey, entry.lemma)}
          </div>
        ) : null}
      </article>
    );
  }

  function renderStrongsEntryCard(entry: StrongsEntry) {
    const activeTab = activeTabs[entry.id] ?? "bible";

    return (
      <article className="strongs-entry-card" key={entry.id}>
        <div className="strongs-entry-header">
          <span className="strongs-entry-number">{entry.id}</span>
          <span className="strongs-entry-language">
            {entry.language === "hebrew" ? "Hebrew" : "Greek"}
          </span>
        </div>
        <p className="strongs-entry-lemma">{entry.lemma}</p>
        {entry.transliteration ? (
          <p className="strongs-entry-meta">Transliteration: {entry.transliteration}</p>
        ) : null}
        {entry.partOfSpeech ? (
          <p className="strongs-entry-meta">Part of speech: {entry.partOfSpeech}</p>
        ) : null}
        {entry.definition ? <p className="strongs-entry-copy">{entry.definition}</p> : null}
        {entry.language !== "greek" && entry.outlineUsage ? (
          <p className="strongs-entry-copy">{entry.outlineUsage}</p>
        ) : null}
        {entry.rootWord ? <p className="strongs-entry-meta">Root word: {entry.rootWord}</p> : null}
        <div className="strongs-entry-tabs" role="tablist" aria-label={`${entry.id} study tabs`}>
          {getAvailableTabs(entry).map((tab) => (
            <button
              aria-selected={activeTab === tab}
              className={`lookup-pane-tab${activeTab === tab ? " is-active" : ""}`}
              key={`${entry.id}:${tab}`}
              onClick={() =>
                handleSelectTab(entry.id, tab, entry.language === "greek" ? entry.lemma : undefined)
              }
              role="tab"
              type="button"
            >
              {getTabLabel(tab)}
            </button>
          ))}
        </div>
        {activeTab === "bible" ? (
          <div className="strongs-entry-tab-panel">
            {renderBibleOccurrences(entry.id, "strongs", entry.language, entry.id)}
          </div>
        ) : null}
        {activeTab === "dictionaries" && entry.language === "greek" ? (
          <div className="strongs-entry-tab-panel">
            <p className="strongs-entry-section-label">Dictionaries</p>
            {renderDictionarySections(entry.id, greekOccurrenceEntries[entry.id] ?? null, entry)}
          </div>
        ) : null}
        {activeTab === "bdag" && entry.bdagArticles?.length ? (
          <div className="strongs-entry-tab-panel strongs-entry-bdag-body">
            <p className="strongs-entry-section-label">BDAG</p>
            {renderBdagArticles(entry)}
          </div>
        ) : null}
        {activeTab === "outside-bible" && entry.language === "greek" ? (
          <div className="strongs-entry-tab-panel strongs-entry-outside-scripture-results">
            <p className="strongs-entry-section-label">Verses Found Outside Bible</p>
            {renderOutsideBibleSection(entry.id, entry.lemma)}
          </div>
        ) : null}
      </article>
    );
  }

  function renderStudyPanel() {
    if (activeStrongsNumbers.length === 0 && !activeGreekSelection) {
      return (
        <p className="reader-notebook-empty">
          Search for a Strong’s number, Greek lemma, inflected form, transliteration, or gloss,
          or open a tagged word to study it here.
        </p>
      );
    }

    if (isLoading) {
      return (
        <p className="reader-notebook-empty">
          {isGreekDictionaryMode ? "Loading Greek dictionary…" : "Loading Strongs details…"}
        </p>
      );
    }

    if (isGreekDictionaryMode) {
      return greekEntry ? (
        <div className="reader-strongs-list">{renderGreekDictionaryCard(greekEntry)}</div>
      ) : (
        <p className="reader-notebook-empty">
          No Greek dictionary entry is available for this selection.
        </p>
      );
    }

    if (entries.length === 0) {
      return (
        <p className="reader-notebook-empty">
          No Strongs entry details are available for this selection.
        </p>
      );
    }

    return <div className="reader-strongs-list">{entries.map((entry) => renderStrongsEntryCard(entry))}</div>;
  }

  return (
    <div className="reader-strongs-panel">
      <div className="reader-notebook-header">
        <div>
          <p className="reader-notebook-kicker">
            {isGreekDictionaryMode ? "Greek Dictionary" : "Strongs Study"}
          </p>
          <h3 className="reader-notebook-title">{activePanelTitle}</h3>
        </div>
      </div>
      {renderStudyPanel()}
    </div>
  );
}
