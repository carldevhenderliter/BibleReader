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

export type BundledChapterMap = Partial<Record<BundledBibleVersion, Chapter>>;
export type BundledBookChapterMap = Partial<Record<BundledBibleVersion, Chapter[]>>;

export type BookPayload = {
  book: BookMeta;
  chapters: Chapter[];
};

export type ReadingView = "chapter" | "book";

export type BibleVersion = "web" | "kjv" | "nlt" | "esv";

export type BundledBibleVersion = Extract<BibleVersion, "web" | "kjv" | "nlt" | "esv">;

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

export type SearchDensityOption = "comfortable" | "compact";

export type SearchCustomizationSettings = {
  textSize: number;
  lineHeight: number;
  bodyFont: BodyFontOption;
  uiFont: UiFontOption;
  density: SearchDensityOption;
};

export type ReaderTtsStatus = "idle" | "loading" | "playing" | "paused" | "error";

export type ReaderTtsEngine = "kokoro";

export type ReaderTtsKokoroStatus = "unavailable" | "idle" | "loading" | "ready" | "error";

export type ReaderTtsSettings = {
  kokoroVoice: string | null;
  rate: number;
  pitch: number;
};

export type PassageReference = {
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber?: number;
  endVerseNumber?: number;
  sourceType?: "manual" | "bookmark" | "topic" | "search";
  label?: string;
};

export type NotebookDocument = {
  id: string;
  title: string;
  content: string;
  references: PassageReference[];
  updatedAt: string;
};

export type SermonDocumentSection = {
  id: string;
  title: string;
  content: string;
};

export type SermonDocument = {
  id: string;
  title: string;
  summary: string;
  references: PassageReference[];
  sections: SermonDocumentSection[];
  updatedAt: string;
};

export type StudyHighlightColor = "gold" | "sky" | "rose";

export type Highlight = {
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  color: StudyHighlightColor;
  label: string;
  updatedAt: string;
};

export type Bookmark = {
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber?: number;
  label: string;
  updatedAt: string;
};

export type StudySet = {
  id: string;
  name: string;
  items: PassageReference[];
  updatedAt: string;
};

export type CrossReferenceGroup = {
  id: string;
  label: string;
  references: PassageReference[];
};

export type CrossReferenceEntry = {
  id: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  groups: CrossReferenceGroup[];
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

export type BibleSearchTopicSuggestionResult = {
  type: "topic-suggestion";
  id: string;
  topicId: string;
  label: string;
  description: string;
  preview: string;
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
  | BibleSearchTopicResult
  | BibleSearchTopicSuggestionResult;

export type BibleSearchResultGroup = {
  id: string;
  query: string;
  results: BibleSearchResult[];
  emptyMessage?: string;
};

export type SearchMatchMode = "partial" | "complete";

export type SearchScope = "all" | "old-testament" | "new-testament" | `book:${string}`;

export type LocalBibleAiStatus = "disabled" | "downloading" | "ready" | "generating" | "error";

export type LocalBibleAiSource = {
  id: string;
  label: string;
  href: string;
  preview: string;
  bookSlug: string;
  chapterNumber: number;
  verseNumber?: number;
};

export type AiWritingTarget = "notebook" | "sermon";

export type AiWritingAction =
  | "summarize-passage-notes"
  | "rewrite-selected-block"
  | "expand-notes"
  | "create-outline"
  | "turn-notes-into-sermon-points"
  | "prompt-sermon-from-notebook"
  | "generate-sermon-outline"
  | "expand-selected-section"
  | "write-introduction"
  | "write-conclusion"
  | "add-application-points"
  | "rewrite-for-clarity";

export type AiWritingResult = {
  target: AiWritingTarget;
  action: AiWritingAction;
  title: string;
  content: string;
};

export type VerseToken = {
  text: string;
  strongsNumbers?: string[];
};

export type StrongsLanguage = "hebrew" | "greek";

export type BdagSummary = {
  plainMeaning: string;
  commonUse?: string;
  ntNote?: string;
};

export type BdagArticle = {
  headword: string;
  transliteration: string;
  entry: string;
  summary: BdagSummary;
};

export type StrongsEntry = {
  id: string;
  language: StrongsLanguage;
  lemma: string;
  transliteration: string;
  definition: string;
  partOfSpeech: string;
  rootWord: string;
  outlineUsage: string;
  bdagArticles?: BdagArticle[];
};
