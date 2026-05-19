export type Testament = "Old" | "New";

export type BookMeta = {
  slug: string;
  name: string;
  abbreviation: string;
  testament: Testament;
  chapterCount: number;
  order: number;
  compositionDate?: string;
};

export type Verse = {
  number: number;
  text: string;
  translationText?: string;
  tokens?: VerseToken[];
  greekTokens?: GreekToken[];
  hebrewTokens?: HebrewToken[];
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

export type BibleVersion = "web" | "kjv" | "nlt" | "esv" | "greek" | "tr" | "mt";

export type BundledBibleVersion = Extract<
  BibleVersion,
  "web" | "kjv" | "nlt" | "esv" | "greek" | "tr" | "mt"
>;

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

export type ThemePreset = "manuscript" | "neon" | "midnight" | "ember" | "obsidian" | "aurora";

export type BodyFontOption = "serif" | "literary" | "transitional" | "humanist" | "mono";

export type GreekFontOption = "classic" | "scholarly" | "modern";

export type HebrewFontOption = "square" | "serif" | "sans";

export type UiFontOption = "sans" | "technical";

export type TextAlignOption = "left" | "justify";

export type ReaderPreset = "reading" | "study" | "audio" | "custom";

export type ReaderCustomizationSettings = {
  readerPreset: ReaderPreset;
  focusReadingMode: boolean;
  themePreset: ThemePreset;
  bodyFont: BodyFontOption;
  greekFont: GreekFontOption;
  hebrewFont: HebrewFontOption;
  companionVerseFont: BodyFontOption;
  customVerseFont: BodyFontOption;
  uiFont: UiFontOption;
  showStrongs: boolean;
  showVerseStrongs: boolean;
  showEsvInterlinear: boolean;
  showEsvGreekOnly: boolean;
  showVerseNumbers: boolean;
  showChapterHeadings: boolean;
  showVerseText: boolean;
  showCompanionVerseTranslation: boolean;
  showSecondaryVerseTranslation: boolean;
  secondaryVerseTranslationVersion: BundledBibleVersion;
  secondaryVerseTranslationVersions: BundledBibleVersion[];
  showAnnotatedGreekUndertext: boolean;
  showGreekSurface: boolean;
  showGreekLemma: boolean;
  showGreekTransliteration: boolean;
  showGreekMorphology: boolean;
  showGreekGloss: boolean;
  showGreekGrammarCards: boolean;
  showExpandedGreekGrammarCards: boolean;
  showGreekGrammarPartOfSpeech: boolean;
  showGreekGrammarLemma: boolean;
  showGreekGrammarGloss: boolean;
  showGreekGrammarForm: boolean;
  showCustomVerseTranslation: boolean;
  showFathersSentenceLines: boolean;
  disableLazyLoading: boolean;
  bodyTextSize: number;
  strongsVerseTextSize: number;
  thayerTextSize: number;
  greekTextSize: number;
  hebrewTextSize: number;
  companionVerseTextSize: number;
  customVerseTextSize: number;
  lineHeight: number;
  firstLineIndent: number;
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

export type HarmonyLineKind = "merged" | "difference" | "unique" | "teaching-break";

export type HarmonySpeaker = "Matthew" | "Mark" | "Luke" | "John";

export type HarmonyLine = {
  id: string;
  kind: HarmonyLineKind;
  speaker?: HarmonySpeaker;
  label?: string;
  text: string;
  references: PassageReference[];
};

export type HarmonyEvent = {
  id: string;
  eventNumber: number;
  title: string;
  timeline: string;
  references: PassageReference[];
  chronologyNote?: string;
  lines: HarmonyLine[];
};

export type HarmonyDocument = {
  id: string;
  title: string;
  sourceVersion: "esv";
  events: HarmonyEvent[];
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
  translationText?: string;
  tokens?: VerseToken[];
  greekTokens?: GreekToken[];
  hebrewTokens?: HebrewToken[];
  greekEntryKeys?: string[];
};

export type BibleSearchStrongsVerseEntry = {
  strongsNumber: string;
  bookSlug: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
};

export type EsvInterlinearVerse = {
  number: number;
  baseGreek: string;
  tokens?: GreekToken[];
  overrideGreek?: string;
};

export type EsvInterlinearChapter = {
  bookSlug: string;
  chapterNumber: number;
  verses: EsvInterlinearVerse[];
};

export type EsvInterlinearBookPayload = {
  bookSlug: string;
  chapters: EsvInterlinearChapter[];
};

export type EsvInterlinearOverrideVerse = {
  number: number;
  overrideGreek: string;
};

export type EsvInterlinearOverrideChapter = {
  bookSlug: string;
  chapterNumber: number;
  verses: EsvInterlinearOverrideVerse[];
};

export type EsvInterlinearOverrideBookPayload = {
  bookSlug: string;
  chapters: EsvInterlinearOverrideChapter[];
};

export type EsvInterlinearDisplayVerse = {
  number: number;
  greek: string;
  baseGreek: string;
  tokens?: GreekToken[];
  overrideGreek?: string;
};

export type EsvInterlinearDisplayChapter = {
  bookSlug: string;
  chapterNumber: number;
  verses: EsvInterlinearDisplayVerse[];
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
  version: BundledBibleVersion;
  bookSlug: string;
  label: string;
  description: string;
  href: string;
};

export type BibleSearchChapterResult = {
  type: "chapter";
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  label: string;
  description: string;
  href: string;
};

export type BibleSearchVerseResult = {
  type: "verse";
  id: string;
  version: BundledBibleVersion;
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

export type GreekDictionarySelection = {
  entryKey: string;
  strongs?: string | null;
  lemma: string;
  label?: string | null;
  occurrenceKey?: string | null;
  selectedForm?: string | null;
  selectedFormMorphology?: string | null;
  selectedFormDecodedMorphology?: string | null;
  matchedQuery?: string | null;
  transliteration?: string | null;
  gloss?: string | null;
};

export type GreekLearningQuizSelection = {
  entryKey: string;
  strongs?: string | null;
  lemma: string;
  label?: string | null;
  occurrenceKey?: string | null;
  selectedForm?: string | null;
  selectedFormMorphology?: string | null;
  selectedFormDecodedMorphology?: string | null;
  matchedQuery?: string | null;
  transliteration?: string | null;
  gloss?: string | null;
};

export type GreekGrammarChartSelection = {
  entryKey: string;
  strongs?: string | null;
  lemma: string;
  label?: string | null;
  selectedForm?: string | null;
  selectedFormMorphology?: string | null;
  selectedFormDecodedMorphology?: string | null;
};

export type GreekLearningSession = {
  queue: GreekLearningQuizSelection[];
  currentIndex: number;
  currentOccurrenceKey?: string | null;
  scopeKey: string;
};

export type GreekLearningQuizOption = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type GreekLearningQuiz = {
  entry: GreekLemmaEntry;
  selectedForm?: GreekInflectedForm | null;
  selectedFormValue?: string | null;
  selectedTransliteration: string;
  prompt: string;
  correctAnswer: string;
  options: GreekLearningQuizOption[];
};

export type BibleSearchGreekLemmaResult = {
  type: "greek-lemma";
  id: string;
  entryKey: string;
  strongs?: string | null;
  lemma: string;
  transliteration: string;
  label: string;
  description: string;
  preview: string;
  selectedForm?: string;
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
  | BibleSearchGreekLemmaResult
  | {
      type: "range";
      id: string;
      version: BundledBibleVersion;
      bookSlug: string;
      chapterNumber: number;
      startVerseNumber: number;
      endVerseNumber: number;
      label: string;
      description: string;
      verses: Array<{
        id: string;
        version: BundledBibleVersion;
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

export type VerseToken = {
  text: string;
  strongsNumbers?: string[];
};

export type EnglishToken = {
  type: "word" | "separator";
  text: string;
  wordIndex?: number;
};

export type GreekToken = {
  surface: string;
  lemma: string;
  entryKey?: string;
  strongs?: string;
  occurrenceKey?: string;
  morphology?: string;
  decodedMorphology?: string;
  transliteration?: string;
  gloss?: string;
  trailingPunctuation?: string;
};

export type GreekGrammarLinkedPhraseKind = "article-noun" | "article-noun-adjective";

export type GreekGrammarLinkedPhrase = {
  kind: GreekGrammarLinkedPhraseKind;
  combined: string;
  members: string[];
  sharedGender?: string | null;
  sharedNumber?: string | null;
  sharedCase?: string | null;
  functionHint?: string | null;
  example?: string | null;
};

export type GreekGrammarDetailItem = {
  label: string;
  definition: string;
  example?: string;
  group?: string;
};

export type GreekGrammarQuickInfo = {
  partOfSpeech?: string | null;
  lemma: string;
  meaning?: string | null;
  gloss?: string | null;
  summary?: string | null;
};

export type GreekGrammarExpandedInfo = {
  morphologyLabel?: string | null;
  fullMorphology?: string | null;
  functionHints: string[];
  paradigmPattern?: string | null;
  exampleForms: string[];
  linkedPhrase?: GreekGrammarLinkedPhrase | null;
  details: GreekGrammarDetailItem[];
};

export type GreekGrammarInfo = {
  word: string;
  lemma: string;
  type?: string | null;
  meaning?: string | null;
  gloss?: string | null;
  gender?: string | null;
  number?: string | null;
  case?: string | null;
  declension?: string | null;
  tense?: string | null;
  voice?: string | null;
  mood?: string | null;
  person?: string | null;
  aspect?: string | null;
  quickInfo: GreekGrammarQuickInfo;
  expandedInfo: GreekGrammarExpandedInfo;
};

export type GreekGrammarPaneSelection = GreekDictionarySelection & {
  grammar: GreekGrammarInfo;
};

export type HebrewToken = {
  surface: string;
  lemma: string;
  strongs?: string;
  morphology?: string;
  decodedMorphology?: string;
  transliteration?: string;
  gloss?: string;
};

export type GreekInflectedForm = {
  form: string;
  morphology: string;
  decodedMorphology?: string;
  definition?: string;
};

export type GreekGlossOption = {
  id: string;
  label: string;
  source: "token" | "short-definition" | "long-definition";
};

export type GreekLemmaEntry = {
  entryKey: string;
  lemma: string;
  strongs?: string;
  transliteration: string;
  pronunciation?: string;
  shortDefinition: string;
  longDefinition?: string;
  forms: GreekInflectedForm[];
  testaments?: Testament[];
  sources?: string[];
};

export type GreekTokenGlossOverride = {
  occurrenceKey: string;
  entryKey?: string;
  strongs?: string;
  lemma: string;
  selectedGloss: string;
  optionId?: string;
  source: "lemma-option" | "custom";
};

export type GreekLemmaGlossPreference = {
  entryKey?: string;
  strongs?: string;
  lemma: string;
  selectedGloss: string;
  optionId?: string;
  source: "lemma-option" | "custom";
};

export type GreekUndertextAnnotationSource = "verse-token" | "lexicon" | "custom";

export type EnglishUndertextAnnotation = {
  contentId: string;
  startToken: number;
  endToken: number;
  greekText: string;
  entryKey?: string;
  lemma?: string;
  strongs?: string;
  transliteration?: string;
  gloss?: string;
  source: GreekUndertextAnnotationSource;
};

export type BibleGreekUndertextAnnotation = {
  verseKey: string;
  startToken: number;
  endToken: number;
  greekText: string;
  entryKey?: string;
  lemma?: string;
  strongs?: string;
  transliteration?: string;
  gloss?: string;
  source: GreekUndertextAnnotationSource;
};

export type BibleGreekUndertextAnnotationRecord = Record<
  string,
  BibleGreekUndertextAnnotation[]
>;

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
