"use client";

import type {
  AiWritingAction,
  AiWritingResult,
  AiWritingTarget,
  Bookmark,
  BundledBibleVersion,
  Chapter,
  Highlight,
  PassageNotebook,
  SermonDocument,
  StudySet
} from "@/lib/bible/types";
import { formatPassageReference } from "@/lib/study-workspace";

type NotebookAiPromptInput = {
  action: Extract<
    AiWritingAction,
    | "summarize-passage-notes"
    | "rewrite-selected-block"
    | "expand-notes"
    | "create-outline"
    | "turn-notes-into-sermon-points"
  >;
  version: BundledBibleVersion;
  passageLabel: string;
  currentChapter: Chapter | null;
  activeVerseNumber: number | null;
  notebook: PassageNotebook;
  selectedBlockId?: string | null;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  studySets: StudySet[];
};

type SermonAiPromptInput = {
  action: Extract<
    AiWritingAction,
    | "generate-sermon-outline"
    | "expand-selected-section"
    | "write-introduction"
    | "write-conclusion"
    | "add-application-points"
    | "rewrite-for-clarity"
  >;
  version: BundledBibleVersion;
  currentChapter: Chapter | null;
  currentPassageLabel: string | null;
  notebook: PassageNotebook | null;
  sermon: SermonDocument;
  selectedSectionId?: string | null;
};

type NotebookSermonPromptInput = {
  prompt: string;
  version: BundledBibleVersion;
  passageLabel: string;
  currentChapter: Chapter | null;
  activeVerseNumber: number | null;
  notebook: PassageNotebook;
  highlights: Highlight[];
  bookmarks: Bookmark[];
  studySets: StudySet[];
  sermon?: SermonDocument | null;
};

type WritingPrompt = {
  systemPrompt: string;
  userPrompt: string;
  title: string;
  target: AiWritingTarget;
  action: AiWritingAction;
};

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trim()}…`;
}

function getChapterContext(chapter: Chapter | null, activeVerseNumber: number | null) {
  if (!chapter) {
    return "";
  }

  const verses =
    activeVerseNumber == null
      ? chapter.verses.slice(0, 6)
      : chapter.verses.filter(
          (verse) => verse.number >= activeVerseNumber - 1 && verse.number <= activeVerseNumber + 1
        );

  return clampText(verses.map((verse) => `${verse.number}. ${verse.text}`).join("\n"), 1200);
}

function getNotebookContext(notebook: PassageNotebook, selectedBlockId?: string | null) {
  const selectedBlock = selectedBlockId
    ? notebook.blocks.find((block) => block.id === selectedBlockId) ?? null
    : null;
  const blockLines = notebook.blocks.map((block, index) => {
    const references = block.references.map((reference) => formatPassageReference(reference)).join(", ");

    return [
      `Block ${index + 1} (${block.type})${block.id === selectedBlockId ? " [selected]" : ""}: ${
        block.text.trim() || "(empty)"
      }`,
      references ? `References: ${references}` : ""
    ]
      .filter(Boolean)
      .join("\n");
  });

  return {
    selectedBlock,
    text: [
      `Notebook title: ${notebook.title.trim() || "(untitled)"}`,
      blockLines.length > 0 ? blockLines.join("\n\n") : "Notebook blocks: (empty)"
    ].join("\n\n")
  };
}

function getStudyContext(highlights: Highlight[], bookmarks: Bookmark[], studySets: StudySet[]) {
  return [
    highlights.length > 0
      ? `Highlights: ${highlights.map((item) => `${item.verseNumber} (${item.color})`).join(", ")}`
      : "",
    bookmarks.length > 0
      ? `Bookmarks: ${bookmarks
          .map((item) => (item.verseNumber != null ? `${item.verseNumber}` : "chapter"))
          .join(", ")}`
      : "",
    studySets.length > 0
      ? `Study sets: ${studySets
          .slice(0, 3)
          .map((set) => `${set.name} (${set.items.length})`)
          .join(", ")}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function getRelatedNotebookSummary(notebook: PassageNotebook) {
  return [
    `Title: ${notebook.title.trim() || "(untitled)"}`,
    notebook.blocks.length > 0
      ? notebook.blocks
          .map((block, index) => {
            const references = block.references
              .map((reference) => formatPassageReference(reference))
              .join(", ");

            return [
              `Block ${index + 1} (${block.type}): ${block.text.trim() || "(empty)"}`,
              references ? `References: ${references}` : ""
            ]
              .filter(Boolean)
              .join("\n");
          })
          .join("\n\n")
      : "Blocks: (empty)"
  ].join("\n\n");
}

function getSermonDocumentContext(sermon: SermonDocument | null | undefined) {
  if (!sermon) {
    return "";
  }

  return [
    `Current sermon draft: ${sermon.title.trim() || "(untitled sermon)"}`,
    `Summary: ${sermon.summary.trim() || "(empty)"}`,
    sermon.references.length > 0
      ? `Attached passages: ${sermon.references.map((reference) => formatPassageReference(reference)).join(", ")}`
      : "Attached passages: (none)",
    sermon.sections.length > 0
      ? sermon.sections
          .map(
            (section, index) =>
              `Section ${index + 1}: ${section.title.trim() || "(untitled)"}\n${
                section.content.trim() || "(empty)"
              }`
          )
          .join("\n\n")
      : "Sections: (empty)"
  ].join("\n\n");
}

function getNotebookActionInstruction(action: NotebookAiPromptInput["action"]) {
  switch (action) {
    case "summarize-passage-notes":
      return "Write concise study notes from the passage and current notebook context.";
    case "rewrite-selected-block":
      return "Rewrite the selected notebook block more clearly while keeping the meaning grounded in the passage.";
    case "expand-notes":
      return "Expand the notebook into fuller study notes without becoming repetitive.";
    case "create-outline":
      return "Turn the passage and notes into a clear Bible-study outline.";
    case "turn-notes-into-sermon-points":
      return "Turn the notebook into sermon-ready points with a preaching structure.";
  }
}

function getSermonActionInstruction(action: SermonAiPromptInput["action"]) {
  switch (action) {
    case "generate-sermon-outline":
      return "Generate a sermon outline with clear major movements and supporting details.";
    case "expand-selected-section":
      return "Expand the selected sermon section into fuller preaching content.";
    case "write-introduction":
      return "Write a sermon introduction that leads naturally into the attached passages.";
    case "write-conclusion":
      return "Write a sermon conclusion that closes clearly and pastorally.";
    case "add-application-points":
      return "Add practical application points grounded in the sermon passages.";
    case "rewrite-for-clarity":
      return "Rewrite the sermon draft for clarity, flow, and stronger structure.";
  }
}

export function buildNotebookAiPrompt({
  action,
  version,
  passageLabel,
  currentChapter,
  activeVerseNumber,
  notebook,
  selectedBlockId,
  highlights,
  bookmarks,
  studySets
}: NotebookAiPromptInput): WritingPrompt {
  const notebookContext = getNotebookContext(notebook, selectedBlockId);
  const selectedBlockText = notebookContext.selectedBlock?.text.trim() || "(none selected)";
  const chapterContext = getChapterContext(currentChapter, activeVerseNumber);
  const studyContext = getStudyContext(highlights, bookmarks, studySets);

  return {
    target: "notebook",
    action,
    title:
      action === "turn-notes-into-sermon-points"
        ? "Sermon points"
        : action === "create-outline"
          ? "Notebook outline"
          : "Notebook draft",
    systemPrompt: [
      "You are a Bible writing assistant inside a local Bible study app.",
      "Write only from the supplied Bible passage and study context.",
      "Do not invent facts, quotations, or references outside the provided context.",
      "Return plain text only. Do not use markdown fences."
    ].join(" "),
    userPrompt: [
      `Task:\n${getNotebookActionInstruction(action)}`,
      `Active translation:\n${version.toUpperCase()}`,
      `Current passage:\n${passageLabel}`,
      chapterContext ? `Passage text:\n${chapterContext}` : "",
      `Notebook context:\n${notebookContext.text}`,
      `Selected block:\n${selectedBlockText}`,
      studyContext ? `Study context:\n${studyContext}` : "",
      "Write a useful draft that can be inserted into a Bible notebook. Keep it readable and specific."
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

export function buildSermonAiPrompt({
  action,
  version,
  currentChapter,
  currentPassageLabel,
  notebook,
  sermon,
  selectedSectionId
}: SermonAiPromptInput): WritingPrompt {
  const selectedSection =
    selectedSectionId != null
      ? sermon.sections.find((section) => section.id === selectedSectionId) ?? null
      : null;
  const sermonContext = [
    `Sermon title: ${sermon.title.trim() || "(untitled sermon)"}`,
    `Summary: ${sermon.summary.trim() || "(empty)"}`,
    sermon.references.length > 0
      ? `Attached passages: ${sermon.references.map((reference) => formatPassageReference(reference)).join(", ")}`
      : "Attached passages: (none yet)",
    sermon.sections.length > 0
      ? sermon.sections
          .map(
            (section, index) =>
              `Section ${index + 1}${section.id === selectedSectionId ? " [selected]" : ""}: ${
                section.title.trim() || "(untitled)"
              }\n${section.content.trim() || "(empty)"}`
          )
          .join("\n\n")
      : "Sections: (empty)"
  ].join("\n\n");

  return {
    target: "sermon",
    action,
    title:
      action === "generate-sermon-outline"
        ? "Sermon outline"
        : action === "write-introduction"
          ? "Sermon introduction"
          : action === "write-conclusion"
            ? "Sermon conclusion"
            : "Sermon draft",
    systemPrompt: [
      "You are a Bible writing assistant inside a local Bible study app.",
      "Write sermon help only from the supplied passages, notes, and sermon draft context.",
      "Stay pastoral and clear. Do not invent outside references or unsupported claims.",
      "Return plain text only. Do not use markdown fences."
    ].join(" "),
    userPrompt: [
      `Task:\n${getSermonActionInstruction(action)}`,
      `Active translation:\n${version.toUpperCase()}`,
      currentPassageLabel ? `Current open passage:\n${currentPassageLabel}` : "",
      currentChapter ? `Current passage text:\n${getChapterContext(currentChapter, null)}` : "",
      notebook
        ? `Related notebook:\nTitle: ${notebook.title || "(untitled)"}\n${notebook.blocks
            .map((block, index) => `Block ${index + 1} (${block.type}): ${block.text.trim() || "(empty)"}`)
            .join("\n")}`
        : "",
      `Sermon document:\n${sermonContext}`,
      selectedSection
        ? `Selected section:\n${selectedSection.title || "(untitled)"}\n${selectedSection.content || "(empty)"}`
        : "",
      "Write a draft that can be inserted into a sermon document. Keep it organized, clear, and grounded in the supplied passages."
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

export function buildNotebookSermonPrompt({
  prompt,
  version,
  passageLabel,
  currentChapter,
  activeVerseNumber,
  notebook,
  highlights,
  bookmarks,
  studySets,
  sermon
}: NotebookSermonPromptInput): WritingPrompt {
  const trimmedPrompt = prompt.trim();
  const chapterContext = getChapterContext(currentChapter, activeVerseNumber);
  const studyContext = getStudyContext(highlights, bookmarks, studySets);
  const sermonContext = getSermonDocumentContext(sermon);

  return {
    target: "sermon",
    action: "prompt-sermon-from-notebook",
    title: "Notebook sermon draft",
    systemPrompt: [
      "You are a Bible writing assistant inside a local Bible study app.",
      "Write sermon material only from the supplied passage, notebook, and study context.",
      "Do not invent outside references, stories, or unsupported claims.",
      "Return plain text only. Do not use markdown fences.",
      "Prefer a sermon-ready structure with a clear title, concise summary, and organized sections when the prompt calls for it."
    ].join(" "),
    userPrompt: [
      `Task:\nUse the notebook and passage context to respond to this sermon-writing request: ${trimmedPrompt || "(no prompt provided)"}`,
      `Active translation:\n${version.toUpperCase()}`,
      `Current passage:\n${passageLabel}`,
      chapterContext ? `Passage text:\n${chapterContext}` : "",
      `Notebook context:\n${getRelatedNotebookSummary(notebook)}`,
      studyContext ? `Study context:\n${studyContext}` : "",
      sermonContext ? `Current sermon draft context:\n${sermonContext}` : "",
      [
        "Write sermon material that can be saved into a sermon document.",
        "Start with a strong sermon title on the first line when appropriate.",
        "Keep the draft grounded in the supplied Bible context and ready for editing."
      ].join(" ")
    ]
      .filter(Boolean)
      .join("\n\n")
  };
}

export function normalizeAiWritingResult({
  action,
  content,
  target,
  title
}: AiWritingResult): AiWritingResult {
  return {
    target,
    action,
    title,
    content: content.trim()
  };
}
