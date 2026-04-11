export type FathersCorpus = "apostolic-fathers";

export type FathersSegment = {
  id: string;
  ref: string;
  label: string;
  greek: string;
  english: string;
  greekNormalized: string;
  greekTokens: string[];
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
};
