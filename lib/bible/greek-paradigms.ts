import { getGreekMorphologyDetails, type GreekMorphologyTermDetails } from "@/lib/bible/greek";
import type { GreekToken } from "@/lib/bible/types";

type GreekVerbTense =
  | "present"
  | "imperfect"
  | "future"
  | "aorist"
  | "perfect"
  | "pluperfect";

type GreekVerbVoice = "active" | "middle" | "passive";
type GreekVerbMood =
  | "indicative"
  | "subjunctive"
  | "optative"
  | "imperative"
  | "infinitive"
  | "participle";
type GreekVerbNumber = "singular" | "plural";
type GreekVerbPerson = 1 | 2 | 3;
type GreekVerbParadigmCellId = "1s" | "2s" | "3s" | "1p" | "2p" | "3p";

export type GreekVerbParadigmCell = {
  id: GreekVerbParadigmCellId;
  personLabel: "1st" | "2nd" | "3rd";
  number: GreekVerbNumber;
  ending: string;
  displayText: string;
};

export type GreekVerbParadigm = {
  title: string;
  cells: GreekVerbParadigmCell[];
  highlightedCellId?: GreekVerbParadigmCellId;
  availabilityNote?: string;
};

type ParsedGreekVerbMorphology = {
  tense?: GreekVerbTense;
  voice?: GreekVerbVoice;
  mood?: GreekVerbMood;
  person?: GreekVerbPerson;
  number?: GreekVerbNumber;
  isSecondAorist?: boolean;
};

type ParadigmTableKey =
  | "present-active-indicative"
  | "present-middle-indicative"
  | "present-passive-indicative"
  | "present-active-subjunctive"
  | "present-middle-subjunctive"
  | "present-passive-subjunctive"
  | "imperfect-active-indicative"
  | "imperfect-middle-indicative"
  | "imperfect-passive-indicative"
  | "future-active-indicative"
  | "future-middle-indicative"
  | "future-passive-indicative"
  | "aorist-active-indicative-first"
  | "aorist-active-indicative-second"
  | "aorist-middle-indicative-first"
  | "aorist-middle-indicative-second"
  | "aorist-passive-indicative"
  | "aorist-active-subjunctive"
  | "aorist-middle-subjunctive"
  | "aorist-passive-subjunctive"
  | "perfect-active-indicative"
  | "perfect-middle-indicative"
  | "perfect-passive-indicative"
  | "pluperfect-active-indicative"
  | "pluperfect-middle-indicative"
  | "pluperfect-passive-indicative";

type ParadigmTable = Record<GreekVerbParadigmCellId, string>;

const PERSON_LABELS: Record<GreekVerbPerson, "1st" | "2nd" | "3rd"> = {
  1: "1st",
  2: "2nd",
  3: "3rd"
};

const CELL_IDS: GreekVerbParadigmCellId[] = ["1s", "2s", "3s", "1p", "2p", "3p"];

const GREEK_VERB_PARADIGM_UNAVAILABLE_NOTE =
  "Paradigm chart not available for this verb form.";

const PARADIGM_TABLES: Record<ParadigmTableKey, ParadigmTable> = {
  "present-active-indicative": {
    "1s": "ω",
    "2s": "εις",
    "3s": "ει",
    "1p": "ομεν",
    "2p": "ετε",
    "3p": "ουσι(ν)"
  },
  "present-middle-indicative": {
    "1s": "ομαι",
    "2s": "ῃ / ει",
    "3s": "εται",
    "1p": "ομεθα",
    "2p": "εσθε",
    "3p": "ονται"
  },
  "present-passive-indicative": {
    "1s": "ομαι",
    "2s": "ῃ / ει",
    "3s": "εται",
    "1p": "ομεθα",
    "2p": "εσθε",
    "3p": "ονται"
  },
  "present-active-subjunctive": {
    "1s": "ω",
    "2s": "ῃς",
    "3s": "ῃ",
    "1p": "ωμεν",
    "2p": "ητε",
    "3p": "ωσι(ν)"
  },
  "present-middle-subjunctive": {
    "1s": "ωμαι",
    "2s": "ῃ",
    "3s": "ηται",
    "1p": "ωμεθα",
    "2p": "ησθε",
    "3p": "ωνται"
  },
  "present-passive-subjunctive": {
    "1s": "ωμαι",
    "2s": "ῃ",
    "3s": "ηται",
    "1p": "ωμεθα",
    "2p": "ησθε",
    "3p": "ωνται"
  },
  "imperfect-active-indicative": {
    "1s": "ον",
    "2s": "ες",
    "3s": "ε(ν)",
    "1p": "ομεν",
    "2p": "ετε",
    "3p": "ον"
  },
  "imperfect-middle-indicative": {
    "1s": "ομην",
    "2s": "ου",
    "3s": "ετο",
    "1p": "ομεθα",
    "2p": "εσθε",
    "3p": "οντο"
  },
  "imperfect-passive-indicative": {
    "1s": "ομην",
    "2s": "ου",
    "3s": "ετο",
    "1p": "ομεθα",
    "2p": "εσθε",
    "3p": "οντο"
  },
  "future-active-indicative": {
    "1s": "σω",
    "2s": "σεις",
    "3s": "σει",
    "1p": "σομεν",
    "2p": "σετε",
    "3p": "σουσι(ν)"
  },
  "future-middle-indicative": {
    "1s": "σομαι",
    "2s": "σῃ",
    "3s": "σεται",
    "1p": "σομεθα",
    "2p": "σεσθε",
    "3p": "σονται"
  },
  "future-passive-indicative": {
    "1s": "θησομαι",
    "2s": "θησῃ",
    "3s": "θησεται",
    "1p": "θησομεθα",
    "2p": "θησεσθε",
    "3p": "θησονται"
  },
  "aorist-active-indicative-first": {
    "1s": "α",
    "2s": "ας",
    "3s": "ε(ν)",
    "1p": "αμεν",
    "2p": "ατε",
    "3p": "αν"
  },
  "aorist-active-indicative-second": {
    "1s": "ον",
    "2s": "ες",
    "3s": "ε(ν)",
    "1p": "ομεν",
    "2p": "ετε",
    "3p": "ον"
  },
  "aorist-middle-indicative-first": {
    "1s": "αμην",
    "2s": "ω",
    "3s": "ατο",
    "1p": "αμεθα",
    "2p": "ασθε",
    "3p": "αντο"
  },
  "aorist-middle-indicative-second": {
    "1s": "ομην",
    "2s": "ου",
    "3s": "ετο",
    "1p": "ομεθα",
    "2p": "εσθε",
    "3p": "οντο"
  },
  "aorist-passive-indicative": {
    "1s": "ην",
    "2s": "ης",
    "3s": "η",
    "1p": "ημεν",
    "2p": "ητε",
    "3p": "ησαν"
  },
  "aorist-active-subjunctive": {
    "1s": "ω",
    "2s": "ῃς",
    "3s": "ῃ",
    "1p": "ωμεν",
    "2p": "ητε",
    "3p": "ωσι(ν)"
  },
  "aorist-middle-subjunctive": {
    "1s": "ωμαι",
    "2s": "ῃ",
    "3s": "ηται",
    "1p": "ωμεθα",
    "2p": "ησθε",
    "3p": "ωνται"
  },
  "aorist-passive-subjunctive": {
    "1s": "θω",
    "2s": "θῃς",
    "3s": "θῃ",
    "1p": "θωμεν",
    "2p": "θητε",
    "3p": "θωσι(ν)"
  },
  "perfect-active-indicative": {
    "1s": "α",
    "2s": "ας",
    "3s": "ε(ν)",
    "1p": "αμεν",
    "2p": "ατε",
    "3p": "ασι(ν)"
  },
  "perfect-middle-indicative": {
    "1s": "μαι",
    "2s": "σαι",
    "3s": "ται",
    "1p": "μεθα",
    "2p": "σθε",
    "3p": "νται"
  },
  "perfect-passive-indicative": {
    "1s": "μαι",
    "2s": "σαι",
    "3s": "ται",
    "1p": "μεθα",
    "2p": "σθε",
    "3p": "νται"
  },
  "pluperfect-active-indicative": {
    "1s": "ειν",
    "2s": "εις",
    "3s": "ει",
    "1p": "ειμεν",
    "2p": "ειτε",
    "3p": "εσαν"
  },
  "pluperfect-middle-indicative": {
    "1s": "μην",
    "2s": "σο",
    "3s": "το",
    "1p": "μεθα",
    "2p": "σθε",
    "3p": "ντο"
  },
  "pluperfect-passive-indicative": {
    "1s": "μην",
    "2s": "σο",
    "3s": "το",
    "1p": "μεθα",
    "2p": "σθε",
    "3p": "ντο"
  }
};

const TENSE_KEYS = new Set<GreekMorphologyTermDetails["key"]>([
  "present",
  "imperfect",
  "future",
  "aorist",
  "perfect",
  "pluperfect"
]);
const VOICE_KEYS = new Set<GreekMorphologyTermDetails["key"]>(["active", "middle", "passive"]);
const MOOD_KEYS = new Set<GreekMorphologyTermDetails["key"]>([
  "indicative",
  "subjunctive",
  "optative",
  "imperative",
  "infinitive",
  "participle"
]);
const NUMBER_KEYS = new Set<GreekMorphologyTermDetails["key"]>(["singular", "plural"]);
const PERSON_KEYS = new Set<GreekMorphologyTermDetails["key"]>([
  "first-person",
  "second-person",
  "third-person"
]);

function findTermKey<T extends GreekMorphologyTermDetails["key"]>(
  terms: GreekMorphologyTermDetails[],
  keys: Set<GreekMorphologyTermDetails["key"]>
) {
  const match = terms.find((term) => keys.has(term.key));
  return (match?.key as T | undefined) ?? undefined;
}

function mapPersonKeyToValue(key?: GreekMorphologyTermDetails["key"]): GreekVerbPerson | undefined {
  if (key === "first-person") {
    return 1;
  }

  if (key === "second-person") {
    return 2;
  }

  if (key === "third-person") {
    return 3;
  }

  return undefined;
}

function mapNumberKeyToValue(key?: GreekMorphologyTermDetails["key"]): GreekVerbNumber | undefined {
  if (key === "singular" || key === "plural") {
    return key;
  }

  return undefined;
}

function mapTenseLetter(value?: string) {
  if (value === "P") {
    return "present";
  }

  if (value === "I") {
    return "imperfect";
  }

  if (value === "F") {
    return "future";
  }

  if (value === "A") {
    return "aorist";
  }

  if (value === "R") {
    return "perfect";
  }

  if (value === "L") {
    return "pluperfect";
  }

  return undefined;
}

function mapVoiceLetter(value?: string): GreekVerbVoice | undefined {
  if (value === "A") {
    return "active";
  }

  if (value === "M" || value === "D") {
    return "middle";
  }

  if (value === "P" || value === "Q") {
    return "passive";
  }

  if (value === "E" || value === "N" || value === "O") {
    return "middle";
  }

  return undefined;
}

function mapMoodLetter(value?: string): GreekVerbMood | undefined {
  if (value === "I") {
    return "indicative";
  }

  if (value === "S") {
    return "subjunctive";
  }

  if (value === "O") {
    return "optative";
  }

  if (value === "M") {
    return "imperative";
  }

  if (value === "N") {
    return "infinitive";
  }

  if (value === "P") {
    return "participle";
  }

  return undefined;
}

function parseGreekVerbMorphologyCode(morphology?: string | null): ParsedGreekVerbMorphology {
  const normalizedValue = (morphology ?? "").toUpperCase().replace(/\s+/g, "");

  if (!normalizedValue.startsWith("V-")) {
    return {};
  }

  const body = normalizedValue.slice(2);
  const legacyMatch = body.match(/^([123])(2?)([PIFARL])([A-Z])([A-Z])-(S|P)/);

  if (legacyMatch) {
    const [, personValue, secondPrefix, tenseLetter, voiceLetter, moodLetter, numberLetter] =
      legacyMatch;

    return {
      tense: mapTenseLetter(tenseLetter),
      voice: mapVoiceLetter(voiceLetter),
      mood: mapMoodLetter(moodLetter),
      person: Number(personValue) as GreekVerbPerson,
      number: numberLetter === "S" ? "singular" : "plural",
      isSecondAorist: secondPrefix === "2"
    };
  }

  const standardMatch = body.match(/^(2?)([PIFARL])([A-Z])([A-Z])(?:-([123])([SP]))?/);

  if (!standardMatch) {
    return {};
  }

  const [, secondPrefix, tenseLetter, voiceLetter, moodLetter, personValue, numberLetter] =
    standardMatch;

  return {
    tense: mapTenseLetter(tenseLetter),
    voice: mapVoiceLetter(voiceLetter),
    mood: mapMoodLetter(moodLetter),
    person: personValue ? (Number(personValue) as GreekVerbPerson) : undefined,
    number: numberLetter === "S" ? "singular" : numberLetter === "P" ? "plural" : undefined,
    isSecondAorist: secondPrefix === "2"
  };
}

function getParsedGreekVerbMorphology(
  token: Pick<GreekToken, "decodedMorphology" | "morphology">
): ParsedGreekVerbMorphology | null {
  const details = getGreekMorphologyDetails(token);
  const partOfSpeech = details?.terms.find((term) => term.group === "part-of-speech")?.key;

  if (partOfSpeech !== "verb" && !token.morphology?.toUpperCase().startsWith("V-")) {
    return null;
  }

  const parsedFromCode = parseGreekVerbMorphologyCode(token.morphology);

  return {
    tense:
      (findTermKey<GreekVerbTense>(details?.terms ?? [], TENSE_KEYS) as GreekVerbTense | undefined) ??
      parsedFromCode.tense,
    voice:
      (findTermKey<GreekVerbVoice>(details?.terms ?? [], VOICE_KEYS) as GreekVerbVoice | undefined) ??
      parsedFromCode.voice,
    mood:
      (findTermKey<GreekVerbMood>(details?.terms ?? [], MOOD_KEYS) as GreekVerbMood | undefined) ??
      parsedFromCode.mood,
    person:
      mapPersonKeyToValue(findTermKey(details?.terms ?? [], PERSON_KEYS)) ?? parsedFromCode.person,
    number:
      mapNumberKeyToValue(findTermKey(details?.terms ?? [], NUMBER_KEYS)) ?? parsedFromCode.number,
    isSecondAorist: parsedFromCode.isSecondAorist
  };
}

function getParadigmTitle(morphology: ParsedGreekVerbMorphology) {
  const parts = [morphology.tense, morphology.voice, morphology.mood]
    .filter(Boolean)
    .map((value) => `${value?.slice(0, 1).toUpperCase()}${value?.slice(1)}`);

  return parts.join(" ");
}

function getHighlightedCellId(
  person?: GreekVerbPerson,
  number?: GreekVerbNumber
): GreekVerbParadigmCellId | undefined {
  if (!person || !number) {
    return undefined;
  }

  return `${person}${number === "singular" ? "s" : "p"}` as GreekVerbParadigmCellId;
}

function getParadigmTableKey(
  morphology: ParsedGreekVerbMorphology
): ParadigmTableKey | null {
  const { tense, voice, mood, isSecondAorist } = morphology;

  if (!tense || !voice || !mood) {
    return null;
  }

  if (mood === "indicative") {
    if (tense === "aorist") {
      if (voice === "active") {
        return isSecondAorist
          ? "aorist-active-indicative-second"
          : "aorist-active-indicative-first";
      }

      if (voice === "middle") {
        return isSecondAorist
          ? "aorist-middle-indicative-second"
          : "aorist-middle-indicative-first";
      }

      return "aorist-passive-indicative";
    }

    const exactKey = `${tense}-${voice}-indicative` as ParadigmTableKey;
    return exactKey in PARADIGM_TABLES ? exactKey : null;
  }

  if (mood === "subjunctive") {
    if (tense === "aorist" && voice === "passive") {
      return "aorist-passive-subjunctive";
    }

    if (tense === "present" || tense === "aorist") {
      const exactKey = `${tense}-${voice}-subjunctive` as ParadigmTableKey;
      return exactKey in PARADIGM_TABLES ? exactKey : null;
    }
  }

  return null;
}

function createParadigmCells(table: ParadigmTable) {
  return CELL_IDS.map((cellId) => {
    const personValue = Number(cellId[0]) as GreekVerbPerson;
    const number = cellId.endsWith("s") ? "singular" : "plural";
    const ending = table[cellId];

    return {
      id: cellId,
      personLabel: PERSON_LABELS[personValue],
      number,
      ending,
      displayText: `stem-${ending}`
    } satisfies GreekVerbParadigmCell;
  });
}

export function getGreekVerbParadigmForToken(
  token: Pick<GreekToken, "decodedMorphology" | "morphology">
): GreekVerbParadigm | null {
  const morphology = getParsedGreekVerbMorphology(token);

  if (!morphology) {
    return null;
  }

  const title = getParadigmTitle(morphology) || "Verb";
  const tableKey = getParadigmTableKey(morphology);

  if (!tableKey) {
    return {
      title,
      cells: [],
      highlightedCellId: getHighlightedCellId(morphology.person, morphology.number),
      availabilityNote: GREEK_VERB_PARADIGM_UNAVAILABLE_NOTE
    };
  }

  return {
    title,
    cells: createParadigmCells(PARADIGM_TABLES[tableKey]),
    highlightedCellId: getHighlightedCellId(morphology.person, morphology.number)
  };
}

export { GREEK_VERB_PARADIGM_UNAVAILABLE_NOTE };
