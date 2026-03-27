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

export type VerseNote = {
  id: string;
  version: BundledBibleVersion;
  bookSlug: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
  updatedAt: string;
};
