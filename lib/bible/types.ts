export type Testament = "Old" | "New";

export type BookMeta = {
  slug: string;
  name: string;
  abbreviation: string;
  testament: Testament;
  chapterCount: number;
  order: number;
};

export type Verse = {
  number: number;
  text: string;
  tokens?: VerseToken[];
};

export type Chapter = {
  bookSlug: string;
  chapterNumber: number;
  verses: Verse[];
};

export type BookPayload = {
  book: BookMeta;
  chapters: Chapter[];
};

export type ReadingView = "chapter" | "book";

export type BibleVersion = "web" | "kjv" | "esv";

export type BundledBibleVersion = Extract<BibleVersion, "web" | "kjv">;

export type ReadingLocation = {
  book: string;
  chapter: number;
  view: ReadingView;
  version: BibleVersion;
};

export type ChapterLink = {
  href: string;
  label: string;
};

export type ThemePreset = "neon" | "midnight" | "ember" | "obsidian" | "aurora";

export type BodyFontOption = "serif" | "humanist" | "mono";

export type UiFontOption = "sans" | "technical";

export type TextAlignOption = "left" | "justify";

export type ReaderCustomizationSettings = {
  themePreset: ThemePreset;
  bodyFont: BodyFontOption;
  uiFont: UiFontOption;
  showStrongs: boolean;
  textSize: number;
  lineHeight: number;
  contentWidth: number;
  verseSpacing: number;
  paragraphSpacing: number;
  textAlign: TextAlignOption;
  headerScale: number;
  verseNumberScale: number;
  letterSpacing: number;
  readingModeContrast: number;
  glowIntensity: number;
  backgroundIntensity: number;
  surfaceDepth: number;
};

export type PassageNotebookBlockType = "paragraph" | "list";

export type PassageNotebookBlock = {
  id: string;
  type: PassageNotebookBlockType;
  text: string;
};

export type PassageNotebook = {
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  title: string;
  blocks: PassageNotebookBlock[];
  updatedAt: string;
};

export type BibleSearchVerseEntry = {
  version: BundledBibleVersion;
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  tokens?: VerseToken[];
};

export type BibleSearchStrongsVerseEntry = {
  strongsNumber: string;
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
};

export type BibleTopicReference = {
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
};

export type BibleTopicAlias = string;

export type BibleTopicSourceSubtopic = {
  id: string;
  label: string;
  references: BibleTopicReference[];
};

export type BibleTopic = {
  id: string;
  label: string;
  aliases: BibleTopicAlias[];
  subtopics: BibleTopicSourceSubtopic[];
};

export type BibleTopicSearchSubtopic = {
  id: string;
  label: string;
  verses: BibleSearchVerseEntry[];
};

export type BibleTopicSearchEntry = {
  id: string;
  label: string;
  aliases: BibleTopicAlias[];
  subtopics: BibleTopicSearchSubtopic[];
};

export type BibleSearchBookResult = {
  type: "book";
  id: string;
  bookSlug: string;
  label: string;
  description: string;
  href: string;
};

export type BibleSearchChapterResult = {
  type: "chapter";
  id: string;
  bookSlug: string;
  chapterNumber: number;
  label: string;
  description: string;
  href: string;
};

export type BibleSearchVerseResult = {
  type: "verse";
  id: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  label: string;
  description: string;
  href: string;
  preview: string;
  tokens?: VerseToken[];
};

export type BibleSearchTopicResult = {
  type: "topic";
  id: string;
  topicId: string;
  label: string;
  description: string;
  subtopics: Array<{
    id: string;
    label: string;
    verses: BibleSearchVerseResult[];
  }>;
};

export type BibleSearchResult =
  | BibleSearchBookResult
  | BibleSearchChapterResult
  | BibleSearchVerseResult
  | {
      type: "strongs";
      id: string;
      strongsNumber: string;
      label: string;
      description: string;
      preview: string;
    }
  | {
      type: "range";
      id: string;
      bookSlug: string;
      chapterNumber: number;
      startVerseNumber: number;
      endVerseNumber: number;
      label: string;
      description: string;
      verses: Array<{
        id: string;
        verseNumber: number;
        label: string;
        href: string;
        preview: string;
        tokens?: VerseToken[];
      }>;
    }
  | BibleSearchTopicResult;

export type BibleSearchResultGroup = {
  id: string;
  query: string;
  results: BibleSearchResult[];
  emptyMessage?: string;
};

export type SearchMatchMode = "partial" | "complete";

export type VerseToken = {
  text: string;
  strongsNumbers?: string[];
};

export type StrongsLanguage = "hebrew" | "greek";

export type StrongsEntry = {
  id: string;
  language: StrongsLanguage;
  lemma: string;
  transliteration: string;
  definition: string;
  partOfSpeech: string;
  rootWord: string;
  outlineUsage: string;
};
