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

export type GreekSecondDeclensionGender = keyof typeof GREEK_SECOND_DECLENSION_ENDINGS;

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

function getHighlightedRowIndex(selection: GreekGrammarChartSelection) {
  const morphologyText = getSelectionMorphologyText(selection);

  if (morphologyText.includes("nominative")) {
    return 0;
  }

  if (morphologyText.includes("genitive")) {
    return 1;
  }

  if (morphologyText.includes("ablative")) {
    return 2;
  }

  if (morphologyText.includes("dative")) {
    return 3;
  }

  if (morphologyText.includes("locative")) {
    return 4;
  }

  if (morphologyText.includes("instrumental")) {
    return 5;
  }

  if (morphologyText.includes("accusative")) {
    return 6;
  }

  if (morphologyText.includes("vocative")) {
    return 7;
  }

  const morphologyCode = selection.selectedFormMorphology?.toUpperCase() ?? "";
  const caseCode = morphologyCode.match(/^[A-Z]+-([NGDAV])/u)?.[1] ?? null;

  if (caseCode === "N") {
    return 0;
  }

  if (caseCode === "G") {
    return 1;
  }

  if (caseCode === "D") {
    return 3;
  }

  if (caseCode === "A") {
    return 6;
  }

  if (caseCode === "V") {
    return 7;
  }

  return null;
}

function getHighlightedNumber(selection: GreekGrammarChartSelection) {
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
