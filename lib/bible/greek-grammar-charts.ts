import { normalizeGreekFormLookupValue } from "@/lib/bible/greek";
import type { GreekGrammarChartSelection } from "@/lib/bible/types";

export const GREEK_SECOND_DECLENSION_ROW_LABELS = [
  "Nominative",
  "Genitive",
  "Ablative",
  "Dative",
  "Locative",
  "Instrumental",
  "Accusative",
  "Vocative"
] as const;

export const GREEK_SECOND_DECLENSION_ARTICLE_ROW_LABELS = [
  "Nominative",
  "Genitive",
  "Dative",
  "Accusative"
] as const;

const GREEK_SECOND_DECLENSION_ENDINGS = {
  masculine: {
    singular: ["ος", "ου", "ου", "ῳ", "ῳ", "ῳ", "ον", "ε"],
    plural: ["οι", "ων", "ων", "οις", "οις", "οις", "ους", "οι"]
  },
  neuter: {
    singular: ["ον", "ου", "ου", "ῳ", "ῳ", "ῳ", "ον", "ον"],
    plural: ["α", "ων", "ων", "οις", "οις", "οις", "α", "α"]
  }
} as const;

const GREEK_SECOND_DECLENSION_ARTICLE_CHARTS = {
  masculine: {
    baseNoun: "λόγος",
    meaning: "word",
    forms: [
      {
        case: "nominative",
        function: "subject",
        singular: { article: "ὁ", noun: "λόγος", combined: "ὁ λόγος" },
        plural: { article: "οἱ", noun: "λόγοι", combined: "οἱ λόγοι" }
      },
      {
        case: "genitive",
        function: "of/from",
        singular: { article: "τοῦ", noun: "λόγου", combined: "τοῦ λόγου" },
        plural: { article: "τῶν", noun: "λόγων", combined: "τῶν λόγων" }
      },
      {
        case: "dative",
        function: "to/in/with",
        singular: { article: "τῷ", noun: "λόγῳ", combined: "τῷ λόγῳ" },
        plural: { article: "τοῖς", noun: "λόγοις", combined: "τοῖς λόγοις" }
      },
      {
        case: "accusative",
        function: "direct object",
        singular: { article: "τόν", noun: "λόγον", combined: "τόν λόγον" },
        plural: { article: "τούς", noun: "λόγους", combined: "τούς λόγους" }
      }
    ],
    examples: [
      { greek: "ὁ λόγος ἐστίν", english: "the word is" },
      { greek: "βλέπω τόν λόγον", english: "I see the word" },
      { greek: "ἀκούω τοῦ λόγου", english: "I hear of the word" }
    ]
  },
  neuter: {
    baseNoun: "δῶρον",
    meaning: "gift",
    forms: [
      {
        case: "nominative",
        function: "subject",
        singular: { article: "τό", noun: "δῶρον", combined: "τό δῶρον" },
        plural: { article: "τά", noun: "δῶρα", combined: "τά δῶρα" }
      },
      {
        case: "genitive",
        function: "of/from",
        singular: { article: "τοῦ", noun: "δώρου", combined: "τοῦ δώρου" },
        plural: { article: "τῶν", noun: "δώρων", combined: "τῶν δώρων" }
      },
      {
        case: "dative",
        function: "to/in/with",
        singular: { article: "τῷ", noun: "δώρῳ", combined: "τῷ δώρῳ" },
        plural: { article: "τοῖς", noun: "δώροις", combined: "τοῖς δώροις" }
      },
      {
        case: "accusative",
        function: "direct object",
        singular: { article: "τό", noun: "δῶρον", combined: "τό δῶρον" },
        plural: { article: "τά", noun: "δῶρα", combined: "τά δῶρα" }
      }
    ],
    examples: [
      { greek: "τό δῶρον καλόν ἐστιν", english: "the gift is good" },
      { greek: "βλέπω τά δῶρα", english: "I see the gifts" },
      { greek: "ἐν τῷ δώρῳ", english: "in the gift" }
    ]
  }
} as const;

export type GreekSecondDeclensionGender = keyof typeof GREEK_SECOND_DECLENSION_ENDINGS;

export type GreekSecondDeclensionArticleChart = {
  title: string;
  gender: GreekSecondDeclensionGender;
  baseNoun: string;
  meaning: string;
  forms: readonly {
    case: string;
    function: string;
    singular: {
      article: string;
      noun: string;
      combined: string;
    };
    plural: {
      article: string;
      noun: string;
      combined: string;
    };
  }[];
  examples: readonly {
    greek: string;
    english: string;
  }[];
  highlightedRowIndex: number | null;
  highlightedNumber: "singular" | "plural" | null;
};

type GreekChartCaseKey =
  | "nominative"
  | "genitive"
  | "ablative"
  | "dative"
  | "locative"
  | "instrumental"
  | "accusative"
  | "vocative";

type GreekChartHighlight = {
  caseKey: GreekChartCaseKey | null;
  number: "singular" | "plural" | null;
};

export type GreekNounChartResult =
  | {
      status: "supported";
      title: string;
      gender: GreekSecondDeclensionGender;
      singular: readonly string[];
      plural: readonly string[];
      highlightedRowIndex: number | null;
      highlightedNumber: "singular" | "plural" | null;
    }
  | {
      status: "unsupported";
      title: string;
      message: string;
    };

function getSelectionMorphologyText(selection: GreekGrammarChartSelection) {
  return [selection.selectedFormDecodedMorphology, selection.selectedFormMorphology]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isNounSelection(selection: GreekGrammarChartSelection) {
  const morphologyText = getSelectionMorphologyText(selection);

  return morphologyText.includes("noun") || selection.selectedFormMorphology?.startsWith("N-") === true;
}

function getSupportedSecondDeclensionGender(selection: GreekGrammarChartSelection) {
  const normalizedLemma = normalizeGreekFormLookupValue(selection.lemma);

  if (normalizedLemma.endsWith("οσ")) {
    return "masculine" as const;
  }

  if (normalizedLemma.endsWith("ον")) {
    return "neuter" as const;
  }

  return null;
}

function getHighlightedRowIndex(selection: GreekGrammarChartSelection | null | undefined) {
  const highlight = getChartHighlight(selection);

  if (highlight.caseKey === "nominative") {
    return 0;
  }

  if (highlight.caseKey === "genitive") {
    return 1;
  }

  if (highlight.caseKey === "ablative") {
    return 2;
  }

  if (highlight.caseKey === "dative") {
    return 3;
  }

  if (highlight.caseKey === "locative") {
    return 4;
  }

  if (highlight.caseKey === "instrumental") {
    return 5;
  }

  if (highlight.caseKey === "accusative") {
    return 6;
  }

  if (highlight.caseKey === "vocative") {
    return 7;
  }

  return null;
}

function getArticleHighlightedRowIndex(selection: GreekGrammarChartSelection | null | undefined) {
  const highlight = getChartHighlight(selection);

  if (highlight.caseKey === "nominative") {
    return 0;
  }

  if (highlight.caseKey === "genitive") {
    return 1;
  }

  if (highlight.caseKey === "dative") {
    return 2;
  }

  if (highlight.caseKey === "accusative") {
    return 3;
  }

  return null;
}

function getChartHighlight(
  selection: GreekGrammarChartSelection | null | undefined
): GreekChartHighlight {
  if (!selection) {
    return { caseKey: null, number: null };
  }

  const morphologyText = getSelectionMorphologyText(selection);

  if (morphologyText.includes("nominative")) {
    return { caseKey: "nominative", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("genitive")) {
    return { caseKey: "genitive", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("ablative")) {
    return { caseKey: "ablative", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("dative")) {
    return { caseKey: "dative", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("locative")) {
    return { caseKey: "locative", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("instrumental")) {
    return { caseKey: "instrumental", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("accusative")) {
    return { caseKey: "accusative", number: getHighlightedNumber(selection) };
  }

  if (morphologyText.includes("vocative")) {
    return { caseKey: "vocative", number: getHighlightedNumber(selection) };
  }

  const morphologyCode = selection.selectedFormMorphology?.toUpperCase() ?? "";
  const caseCode = morphologyCode.match(/^[A-Z]+-([NGDAV])/u)?.[1] ?? null;

  if (caseCode === "N") {
    return { caseKey: "nominative", number: getHighlightedNumber(selection) };
  }

  if (caseCode === "G") {
    return { caseKey: "genitive", number: getHighlightedNumber(selection) };
  }

  if (caseCode === "D") {
    return { caseKey: "dative", number: getHighlightedNumber(selection) };
  }

  if (caseCode === "A") {
    return { caseKey: "accusative", number: getHighlightedNumber(selection) };
  }

  if (caseCode === "V") {
    return { caseKey: "vocative", number: getHighlightedNumber(selection) };
  }

  return { caseKey: null, number: getHighlightedNumber(selection) };
}

function getHighlightedNumber(selection: GreekGrammarChartSelection | null | undefined) {
  if (!selection) {
    return null;
  }

  const morphologyText = getSelectionMorphologyText(selection);

  if (morphologyText.includes("singular")) {
    return "singular" as const;
  }

  if (morphologyText.includes("plural")) {
    return "plural" as const;
  }

  const morphologyCode = selection.selectedFormMorphology?.toUpperCase() ?? "";
  const numberCode = morphologyCode.match(/^[A-Z]+-[A-Z]([SP])/u)?.[1] ?? null;

  if (numberCode === "S") {
    return "singular" as const;
  }

  if (numberCode === "P") {
    return "plural" as const;
  }

  return null;
}

export function getGreekSecondDeclensionChart(
  selection: GreekGrammarChartSelection
): GreekNounChartResult {
  if (!isNounSelection(selection)) {
    return {
      status: "unsupported",
      title: "2nd Declension Noun Chart",
      message: "This chart is available for Greek nouns only."
    };
  }

  const gender = getSupportedSecondDeclensionGender(selection);

  if (!gender) {
    return {
      status: "unsupported",
      title: "2nd Declension Noun Chart",
      message: "This noun does not use the current 2nd declension chart."
    };
  }

  return {
    status: "supported",
    title: "2nd Declension Noun Chart",
    gender,
    singular: GREEK_SECOND_DECLENSION_ENDINGS[gender].singular,
    plural: GREEK_SECOND_DECLENSION_ENDINGS[gender].plural,
    highlightedRowIndex: getHighlightedRowIndex(selection),
    highlightedNumber: getHighlightedNumber(selection)
  };
}

export function getGreekSecondDeclensionChartByGender(
  gender: GreekSecondDeclensionGender,
  selection?: GreekGrammarChartSelection | null
) {
  return {
    title: "2nd Declension Noun Chart",
    gender,
    singular: GREEK_SECOND_DECLENSION_ENDINGS[gender].singular,
    plural: GREEK_SECOND_DECLENSION_ENDINGS[gender].plural,
    highlightedRowIndex: getHighlightedRowIndex(selection ?? null),
    highlightedNumber: getHighlightedNumber(selection ?? null)
  };
}

export function getGreekSecondDeclensionDefiniteArticleChart(
  selection: GreekGrammarChartSelection
): GreekSecondDeclensionArticleChart | null {
  const gender = getSupportedSecondDeclensionGender(selection);

  if (!isNounSelection(selection) || !gender) {
    return null;
  }

  const chart = GREEK_SECOND_DECLENSION_ARTICLE_CHARTS[gender];

  return {
    title: "Definite Articles",
    gender,
    baseNoun: chart.baseNoun,
    meaning: chart.meaning,
    forms: chart.forms,
    examples: chart.examples,
    highlightedRowIndex: getArticleHighlightedRowIndex(selection),
    highlightedNumber: getHighlightedNumber(selection)
  };
}

export function getGreekSecondDeclensionDefiniteArticleChartByGender(
  gender: GreekSecondDeclensionGender,
  selection?: GreekGrammarChartSelection | null
): GreekSecondDeclensionArticleChart {
  const chart = GREEK_SECOND_DECLENSION_ARTICLE_CHARTS[gender];

  return {
    title: "Definite Articles",
    gender,
    baseNoun: chart.baseNoun,
    meaning: chart.meaning,
    forms: chart.forms,
    examples: chart.examples,
    highlightedRowIndex: getArticleHighlightedRowIndex(selection ?? null),
    highlightedNumber: getHighlightedNumber(selection ?? null)
  };
}
