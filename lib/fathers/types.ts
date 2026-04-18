import type { GreekToken } from "@/lib/bible/types";

export type FathersCorpus = "apostolic-fathers";

export type FathersGreekToken = {
  surface: string;
  lemma: string;
  entryKey: string;
  strongs?: string;
  transliteration: string;
  morphology?: string;
  decodedMorphology?: string;
  gloss: string;
  trailingPunctuation?: string;
};

export type FathersSegment = {
  id: string;
  ref: string;
  label: string;
  greek: string;
  english: string;
  greekNormalized: string;
  greekTokens: string[];
  greekLexicalTokens?: FathersGreekToken[];
};

export type FathersWorkMeta = {
  slug: string;
  title: string;
  shortTitle: string;
  author: string;
  order: number;
  corpus: FathersCorpus;
  sectionCount: number;
  greekSource: string;
  englishSource: string;
};

export type FathersWorkPayload = {
  work: FathersWorkMeta;
  segments: FathersSegment[];
};

export type FathersLemmaMatch = {
  workSlug: string;
  workTitle: string;
  segmentId: string;
  ref: string;
  label: string;
  greek: string;
  english: string;
  greekContext: string;
  englishContext: string;
  greekLexicalTokens?: GreekToken[];
};
