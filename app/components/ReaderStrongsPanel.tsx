"use client";

import { useEffect, useMemo, useState } from "react";

import { GreekVerseTextContent } from "@/app/components/GreekVerseTextContent";
import { VerseTextContent } from "@/app/components/VerseTextContent";
import { useReaderWorkspace } from "@/app/components/ReaderWorkspaceProvider";
import { getBookTestamentBySlug } from "@/lib/bible/book-order";
import {
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
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
import type {
  BibleSearchVerseEntry,
  BundledBibleVersion,
  GreekInflectedForm,
  GreekLemmaEntry,
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

type OccurrenceTestamentFilter = "all" | "old" | "new";

type StrongsTab = "bible" | "bdag" | "outside-bible";

function getAvailableTabs(entry: StrongsEntry): StrongsTab[] {
  const tabs: StrongsTab[] = ["bible"];

  if (entry.bdagArticles?.length) {
    tabs.push("bdag");
  }

  if (entry.language === "greek") {
    tabs.push("outside-bible");
  }

  return tabs;
}

function getGreekAvailableTabs(entry: StrongsEntry | null): StrongsTab[] {
  const tabs: StrongsTab[] = ["bible"];

  if (entry?.bdagArticles?.length) {
    tabs.push("bdag");
  }

  tabs.push("outside-bible");
  return tabs;
}

function getTabLabel(tab: StrongsTab) {
  if (tab === "bible") {
    return "Verses In Bible";
  }

  if (tab === "bdag") {
    return "BDAG";
  }

  return "Outside Bible";
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
        const summary = article.summary ?? { plainMeaning: article.entry };

        return (
          <section
            className="strongs-entry-bdag-article"
            key={`${entry.id}:${article.headword}:${article.transliteration}`}
          >
            <p className="strongs-entry-meta">
              {article.headword} ({article.transliteration})
            </p>
            <div className="strongs-entry-bdag-summary">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                BDAG Summary
              </p>
              <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.plainMeaning}</p>
              {summary.commonUse ? (
                <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.commonUse}</p>
              ) : null}
              {summary.ntNote ? (
                <p className="strongs-entry-copy strongs-entry-copy-bdag">{summary.ntNote}</p>
              ) : null}
            </div>
            <div className="strongs-entry-bdag-original">
              <p className="strongs-entry-section-label strongs-entry-section-label-subtle">
                Original BDAG
              </p>
              <p className="strongs-entry-copy strongs-entry-copy-bdag strongs-entry-copy-bdag-original">
                {article.entry}
              </p>
            </div>
          </section>
        );
      })}
    </>
  );
}

export function ReaderStrongsPanel() {
  const {
    activeGreekSelection,
    activeStrongsLabel,
    activeStrongsNumbers,
    openGreekDictionary,
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
  const [bibleOccurrences, setBibleOccurrences] = useState<Record<string, BibleOccurrencesState>>({});
  const [selectedBibleOccurrenceVersions, setSelectedBibleOccurrenceVersions] = useState<
    Record<string, BundledBibleVersion>
  >({});
  const [bibleOccurrenceTestamentFilters, setBibleOccurrenceTestamentFilters] = useState<
    Record<string, OccurrenceTestamentFilter>
  >({});
  const [selectedBibleOccurrenceBooks, setSelectedBibleOccurrenceBooks] = useState<
    Record<string, string[]>
  >({});
  const [bibleOccurrenceVersionEntries, setBibleOccurrenceVersionEntries] = useState<
    Record<string, Partial<Record<BundledBibleVersion, BibleOccurrenceVersionEntriesState>>>
  >({});
  const [outsideScripture, setOutsideScripture] = useState<
    Record<string, OutsideScriptureLookupState>
  >({});
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
  const selectedGreekMorphologyDetails = useMemo(() => {
    if (!selectedGreekFormDetails?.morphology && !selectedGreekFormDetails?.decodedMorphology) {
      return null;
    }

    return getGreekMorphologyDetails({
      morphology: selectedGreekFormDetails?.morphology,
      decodedMorphology: selectedGreekFormDetails?.decodedMorphology
    });
  }, [selectedGreekFormDetails?.decodedMorphology, selectedGreekFormDetails?.morphology]);

  useEffect(() => {
    if (!isGreekDictionaryMode) {
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      return;
    }

    if (!activeGreekEntryKey) {
      setGreekEntry(null);
      setGreekStrongsEntry(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setEntries([]);
    setActiveTabs({});
    setBibleOccurrences({});
    setSelectedBibleOccurrenceVersions({});
    setBibleOccurrenceTestamentFilters({});
    setSelectedBibleOccurrenceBooks({});
    setBibleOccurrenceVersionEntries({});
    setOutsideScripture({});

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
    activeGreekModeSelection?.strongs,
    isGreekDictionaryMode
  ]);

  useEffect(() => {
    if (isGreekDictionaryMode) {
      return;
    }

    if (activeStrongsNumbers.length === 0) {
      setEntries([]);
      setIsLoading(false);
      setActiveTabs({});
      setBibleOccurrences({});
      setSelectedBibleOccurrenceVersions({});
      setBibleOccurrenceTestamentFilters({});
      setSelectedBibleOccurrenceBooks({});
      setBibleOccurrenceVersionEntries({});
      setGreekOccurrenceEntries({});
      setOutsideScripture({});
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setActiveTabs({});
    setBibleOccurrences({});
    setSelectedBibleOccurrenceVersions({});
    setBibleOccurrenceTestamentFilters({});
    setSelectedBibleOccurrenceBooks({});
    setBibleOccurrenceVersionEntries({});
    setGreekOccurrenceEntries({});
    setOutsideScripture({});

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
          ? getGreekVerseOccurrences(entryId)
          : getStrongsVerseOccurrencesWithTokens(entryId);

      void lookupPromise.then((matches) => {
        setBibleOccurrences((current) => ({
          ...current,
          [entryId]: {
            status: "loaded",
            matches
          }
        }));
      });
    });
  }, [bibleOccurrences, entries, greekEntry]);

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
    const nextDefaults: Record<string, BundledBibleVersion> = {};
    const nextAvailableVersions: Record<string, readonly BundledBibleVersion[]> = {};

    if (greekEntry) {
      nextAvailableVersions[greekEntry.entryKey] =
        getAvailableBibleOccurrenceVersions("greek-dictionary");
      const defaultVersion = getDefaultBibleOccurrenceVersion("greek-dictionary");

      if (defaultVersion) {
        nextDefaults[greekEntry.entryKey] = defaultVersion;
      }
    }

    for (const entry of entries) {
      nextAvailableVersions[entry.id] = getAvailableBibleOccurrenceVersions(entry.language);
      const defaultVersion = getDefaultBibleOccurrenceVersion(entry.language);

      if (defaultVersion) {
        nextDefaults[entry.id] = defaultVersion;
      }
    }

    setSelectedBibleOccurrenceVersions((current) => {
      let changed = false;
      const nextState = { ...current };

      for (const [entryId, defaultVersion] of Object.entries(nextDefaults)) {
        const selectedVersion = nextState[entryId];
        const availableVersions = nextAvailableVersions[entryId] ?? [];

        if (!selectedVersion || !availableVersions.includes(selectedVersion)) {
          nextState[entryId] = defaultVersion;
          changed = true;
        }
      }

      return changed ? nextState : current;
    });
  }, [entries, greekEntry, installedVersions]);

  useEffect(() => {
    const loadEntriesForVersion = async (
      entryId: string,
      version: BundledBibleVersion,
      anchors: readonly VerseReferenceAnchor[]
    ) => {
      const matches = await getVerseEntriesForVersion(anchors, version);

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
        version: BundledBibleVersion;
        anchors: VerseReferenceAnchor[];
      }
    >();

    if (greekEntry) {
      const occurrences = bibleOccurrences[greekEntry.entryKey];
      const defaultVersion = getDefaultBibleOccurrenceVersion("greek-dictionary");
      const selectedVersion =
        selectedBibleOccurrenceVersions[greekEntry.entryKey] ?? defaultVersion;

      if (selectedVersion && occurrences?.status === "loaded" && occurrences.matches.length > 0) {
        loadTargets.set(greekEntry.entryKey, {
          version: selectedVersion,
          anchors: occurrences.matches.map(
            (match): VerseReferenceAnchor => ({
              bookSlug: match.bookSlug,
              chapterNumber: match.chapterNumber,
              verseNumber: match.verseNumber
            })
          )
        });
      }
    }

    for (const entry of entries) {
      const occurrences = bibleOccurrences[entry.id];
      const defaultVersion = getDefaultBibleOccurrenceVersion(entry.language);
      const selectedVersion = selectedBibleOccurrenceVersions[entry.id] ?? defaultVersion;

      if (selectedVersion && occurrences?.status === "loaded" && occurrences.matches.length > 0) {
        loadTargets.set(entry.id, {
          version: selectedVersion,
          anchors: occurrences.matches.map(
            (match): VerseReferenceAnchor => ({
              bookSlug: match.bookSlug,
              chapterNumber: match.chapterNumber,
              verseNumber: match.verseNumber
            })
          )
        });
      }
    }

    for (const [entryId, { version: selectedVersion, anchors }] of loadTargets.entries()) {
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
  }, [bibleOccurrenceVersionEntries, bibleOccurrences, entries, greekEntry, selectedBibleOccurrenceVersions]);

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

    return installedVersions.filter((version) => version !== "greek");
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

    if (versions.includes("kjv")) {
      return "kjv";
    }

    return versions[0] ?? null;
  }

  function getEnglishHighlightPhrases(
    entryId: string,
    match: BibleSearchVerseEntry,
    mode: "strongs" | "greek"
  ) {
    const tokenTextMatches = Array.from(
      new Set(
        (match.tokens ?? [])
          .filter((token) =>
            token.strongsNumbers?.some((strongsNumber) => normalizeStrongsNumber(strongsNumber) === entryId)
          )
          .map((token) => token.text.trim())
          .filter(Boolean)
      )
    );

    if (tokenTextMatches.length > 0) {
      return tokenTextMatches;
    }

    if (mode === "greek") {
      return Array.from(
        new Set(
          (match.greekTokens ?? [])
            .filter((token) => {
              const tokenEntryKey = token.entryKey ?? token.strongs ?? null;
              return tokenEntryKey === entryId;
            })
            .map((token) => token.gloss?.trim() ?? "")
            .filter(Boolean)
        )
      );
    }

    return [];
  }

  function getGreekHighlightPhrases(entryId: string) {
    const sourceEntry =
      (greekEntry?.entryKey === entryId ? greekEntry : null) ?? greekOccurrenceEntries[entryId] ?? null;

    if (!sourceEntry) {
      return [];
    }

    return Array.from(
      new Set(
        [
          sourceEntry.lemma,
          ...sourceEntry.forms.map((form) => form.form)
        ]
          .map((phrase) => phrase.trim())
          .filter(Boolean)
      )
    );
  }

  function renderBibleOccurrences(
    entryId: string,
    mode: "strongs" | "greek",
    language: StrongsEntry["language"] | "greek-dictionary",
    highlightStrongsNumber: string | null = null
  ) {
    const occurrences = bibleOccurrences[entryId];
    const availableVersions = getAvailableBibleOccurrenceVersions(language);
    const selectedVersion =
      selectedBibleOccurrenceVersions[entryId] ?? getDefaultBibleOccurrenceVersion(language);
    const testamentFilter = bibleOccurrenceTestamentFilters[entryId] ?? "all";
    const versionState = selectedVersion
      ? bibleOccurrenceVersionEntries[entryId]?.[selectedVersion] ?? null
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

    return (
      <div className="strongs-entry-bible-section">
        <div className="strongs-entry-bible-toolbar">
          <p className="strongs-entry-section-label">Verses In Bible</p>
          <div
            aria-label={`Display version for ${entryId}`}
            className="strongs-entry-bible-version-selector"
            role="group"
          >
            {availableVersions.map((version) => (
              <button
                aria-pressed={selectedVersion === version}
                className={`reader-inline-button strongs-entry-bible-version-button${
                  selectedVersion === version ? " is-active" : ""
                }`}
                key={`${entryId}:${version}`}
                onClick={() =>
                  setSelectedBibleOccurrenceVersions((current) => ({
                    ...current,
                    [entryId]: version
                  }))
                }
                type="button"
              >
                {getBibleVersionLabel(version)}
              </button>
            ))}
          </div>
        </div>
        {hasOccurrences ? (
          <>
            <div
              aria-label={`Testament filter for ${entryId}`}
              className="strongs-entry-bible-version-selector"
              role="group"
            >
              <button
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
                All Books
              </button>
              <button
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
                Old Testament
              </button>
              <button
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
                New Testament
              </button>
            </div>
            {visibleFilterBooks.length > 0 ? (
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
                            current[entryId] ?? occurrenceBooks.map((occurrenceBook) => occurrenceBook.slug);
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
        {selectedVersion && (!versionState || versionState.status === "loading") ? (
          <p className="strongs-entry-meta">Loading {getBibleVersionLabel(selectedVersion)} verses…</p>
        ) : null}
        {hasOccurrences ? (
          <div className="strongs-entry-bible-verses">
            {filteredOccurrences.length === 0 ? (
              <p className="strongs-entry-copy">No verses match the current filters.</p>
            ) : (
              filteredOccurrences.map(({ match, index }) => {
                const versionMatch = versionState?.matches[index]?.entry ?? null;
                const highlightPhrases = getEnglishHighlightPhrases(entryId, match, mode);
                const greekHighlightPhrases = getGreekHighlightPhrases(entryId);

                return (
                  <article
                    className="strongs-entry-bible-verse"
                    key={`${entryId}:${match.bookSlug}:${match.chapterNumber}:${match.verseNumber}`}
                  >
                    <p className="strongs-entry-meta">
                      {match.bookName} {match.chapterNumber}:{match.verseNumber}
                    </p>
                    {selectedVersion && versionMatch ? (
                      selectedVersion === "greek" ? (
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
                    ) : selectedVersion && (!versionState || versionState.status === "loading") ? null : (
                      <p className="strongs-entry-copy">
                        This verse is not available in{" "}
                        {selectedVersion ? getBibleVersionLabel(selectedVersion) : "that version"}.
                      </p>
                    )}
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

  function renderGreekDictionaryCard(entry: GreekLemmaEntry) {
    const strongsKey = entry.entryKey;
    const activeTab = activeTabs[strongsKey] ?? "bible";
    const selectedFormValue = activeGreekModeSelection?.selectedForm ?? null;
    const normalizedSelectedForm = selectedFormValue
      ? normalizeGreekFormLookupValue(selectedFormValue)
      : null;

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
        {selectedGreekFormDetails ? (
          <section className="greek-dictionary-selected-form">
            <p className="strongs-entry-section-label">Selected Form</p>
            <div className="greek-dictionary-selected-form-card">
              <p className="strongs-entry-lemma greek-dictionary-selected-form-value">
                {selectedGreekFormDetails.form}
              </p>
              <p className="strongs-entry-meta">
                {["Lemma: " + entry.lemma, entry.strongs ? `Strong’s: ${entry.strongs}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {selectedGreekFormDetails.morphology ? (
                <p className="strongs-entry-meta">
                  Morphology:{" "}
                  {selectedGreekFormDetails.decodedMorphology
                    ? `${selectedGreekFormDetails.decodedMorphology} (${selectedGreekFormDetails.morphology})`
                    : selectedGreekFormDetails.morphology}
                </p>
              ) : null}
              {selectedGreekMorphologyDetails ? (
                <div className="verse-greek-morphology-list">
                  {selectedGreekMorphologyDetails.terms.map((term) => (
                    <article
                      className="verse-greek-morphology-item"
                      key={`${entry.entryKey}:${selectedGreekFormDetails.form}:${term.key}`}
                    >
                      <p className="verse-greek-morphology-term">{term.label}</p>
                      <p className="verse-greek-morphology-copy">{term.definition}</p>
                      {term.example ? (
                        <p className="verse-greek-morphology-copy">{term.example}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : null}
              {selectedGreekFormDetails.definition ? (
                <p className="strongs-entry-copy">{selectedGreekFormDetails.definition}</p>
              ) : null}
            </div>
          </section>
        ) : null}
        <div className="greek-dictionary-definition">
          <p className="strongs-entry-section-label">Lemma Definition</p>
          <p className="strongs-entry-copy">{entry.shortDefinition}</p>
          {entry.longDefinition ? (
            <p className="strongs-entry-copy greek-dictionary-long-definition">
              {entry.longDefinition}
            </p>
          ) : null}
        </div>
        <section className="greek-dictionary-forms">
          <p className="strongs-entry-section-label">Inflected Forms</p>
          <div className="greek-dictionary-form-list">
            {entry.forms.map((form, index) => {
              const isSelected =
                normalizedSelectedForm !== null &&
                normalizeGreekFormLookupValue(form.form) === normalizedSelectedForm;

              return (
                <article
                  className={`greek-dictionary-form-row${isSelected ? " is-selected" : ""}`}
                  key={`${entry.entryKey}:${form.form}:${form.morphology}:${index}`}
                >
                  <p className="greek-dictionary-form-line">
                    <span className="greek-dictionary-form-text">{form.form}</span>
                    <span className="greek-dictionary-form-separator">—</span>
                    <span className="greek-dictionary-form-code">{form.morphology}</span>
                    {form.decodedMorphology ? (
                      <>
                        <span className="greek-dictionary-form-separator">—</span>
                        <span className="greek-dictionary-form-decoded">
                          {form.decodedMorphology}
                        </span>
                      </>
                    ) : null}
                    {form.definition ? (
                      <>
                        <span className="greek-dictionary-form-separator">—</span>
                        <span className="greek-dictionary-form-definition">
                          {form.definition}
                        </span>
                      </>
                    ) : null}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
        <div
          className="strongs-entry-tabs"
          role="tablist"
          aria-label={`${entry.strongs ?? entry.entryKey} study tabs`}
        >
          {getGreekAvailableTabs(greekStrongsEntry).map((tab) => (
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
        {activeTab === "bdag" ? (
          <div className="strongs-entry-tab-panel strongs-entry-bdag-body">
            <p className="strongs-entry-section-label">BDAG</p>
            {greekStrongsEntry ? renderBdagArticles(greekStrongsEntry) : (
              <p className="strongs-entry-copy">No BDAG article is available for this lemma.</p>
            )}
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
        {entry.outlineUsage ? <p className="strongs-entry-copy">{entry.outlineUsage}</p> : null}
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

      {activeStrongsNumbers.length === 0 && !activeGreekSelection ? (
        <p className="reader-notebook-empty">
          Search for a Strong’s number, Greek lemma, inflected form, transliteration, or gloss,
          or open a tagged word to study it here.
        </p>
      ) : isLoading ? (
        <p className="reader-notebook-empty">
          {isGreekDictionaryMode ? "Loading Greek dictionary…" : "Loading Strongs details…"}
        </p>
      ) : isGreekDictionaryMode ? (
        greekEntry ? (
          <div className="reader-strongs-list">{renderGreekDictionaryCard(greekEntry)}</div>
        ) : (
          <p className="reader-notebook-empty">
            No Greek dictionary entry is available for this selection.
          </p>
        )
      ) : entries.length === 0 ? (
        <p className="reader-notebook-empty">
          No Strongs entry details are available for this selection.
        </p>
      ) : (
        <div className="reader-strongs-list">{entries.map((entry) => renderStrongsEntryCard(entry))}</div>
      )}
    </div>
  );
}
