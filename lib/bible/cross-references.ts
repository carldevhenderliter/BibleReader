import type {
  BibleSearchVerseEntry,
  BundledBibleVersion,
  CrossReferenceEntry,
  CrossReferenceGroup,
  PassageReference
} from "@/lib/bible/types";
import { createPassageReference } from "@/lib/study-workspace";

type SourceCrossReferenceEntry = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  groups: Array<{
    id: string;
    label: string;
    references: Array<{
      bookSlug: string;
      chapterNumber: number;
      verseNumber: number;
    }>;
  }>;
};

type ResolvedCrossReference = PassageReference & {
  text: string;
  tokens?: BibleSearchVerseEntry["tokens"];
};

type ResolvedCrossReferenceGroup = Omit<CrossReferenceGroup, "references"> & {
  references: ResolvedCrossReference[];
};

type ResolvedCrossReferenceEntry = Omit<CrossReferenceEntry, "groups"> & {
  groups: ResolvedCrossReferenceGroup[];
};

const verseIndexLoaders: Record<BundledBibleVersion, () => Promise<unknown>> = {
  web: () => import("@/data/bible/search/web.json"),
  kjv: () => import("@/data/bible/search/kjv.json")
};

let crossReferencePromise: Promise<SourceCrossReferenceEntry[]> | null = null;
const verseIndexCache = new Map<BundledBibleVersion, Promise<BibleSearchVerseEntry[]>>();

async function loadCrossReferenceSource() {
  if (!crossReferencePromise) {
    crossReferencePromise = import("@/data/source/cross-references.json").then(
      (module) => (module as { default: SourceCrossReferenceEntry[] }).default ?? []
    );
  }

  return crossReferencePromise;
}

async function loadVerseIndex(version: BundledBibleVersion) {
  const cached = verseIndexCache.get(version);

  if (cached) {
    return cached;
  }

  const promise = verseIndexLoaders[version]().then(
    (module) => ((module as { default: BibleSearchVerseEntry[] }).default ?? [])
  );

  verseIndexCache.set(version, promise);
  return promise;
}

export async function getCrossReferenceEntry(
  version: BundledBibleVersion,
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number
): Promise<ResolvedCrossReferenceEntry | null> {
  const [sourceEntries, verseIndex] = await Promise.all([
    loadCrossReferenceSource(),
    loadVerseIndex(version)
  ]);
  const sourceEntry =
    sourceEntries.find(
      (entry) =>
        entry.bookSlug === bookSlug &&
        entry.chapterNumber === chapterNumber &&
        entry.verseNumber === verseNumber
    ) ?? null;

  if (!sourceEntry) {
    return null;
  }

  return {
    id: `${bookSlug}:${chapterNumber}:${verseNumber}`,
    bookSlug,
    chapterNumber,
    verseNumber,
    groups: sourceEntry.groups.map((group) => ({
      id: group.id,
      label: group.label,
      references: group.references.map((reference) => {
        const verseEntry =
          verseIndex.find(
            (entry) =>
              entry.bookSlug === reference.bookSlug &&
              entry.chapterNumber === reference.chapterNumber &&
              entry.verseNumber === reference.verseNumber
          ) ?? null;

        return {
          ...createPassageReference({
            version,
            bookSlug: reference.bookSlug,
            chapterNumber: reference.chapterNumber,
            verseNumber: reference.verseNumber,
            sourceType: "manual"
          }),
          text: verseEntry?.text ?? "",
          tokens: verseEntry?.tokens
        };
      })
    }))
  };
}
