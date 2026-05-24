import type {
  GreekGrammarDetailItem,
  GreekGrammarInfo,
  HebrewToken
} from "@/lib/bible/types";

type HebrewGrammarTerm = GreekGrammarDetailItem & {
  key: string;
  group: NonNullable<GreekGrammarDetailItem["group"]>;
};

type ParsedHebrewToken = {
  token: HebrewToken;
  terms: HebrewGrammarTerm[];
  partOfSpeech: string | null;
  gender: string | null;
  number: string | null;
  stem: string | null;
  conjugation: string | null;
  person: string | null;
  state: string | null;
};

const HEBREW_GRAMMAR_TERMS: Record<string, HebrewGrammarTerm> = {
  "proper-noun": {
    key: "proper-noun",
    group: "part-of-speech",
    label: "Proper noun",
    definition: "A noun that names a specific person, place, people, or title.",
    example: "Example: דָּוִד = David"
  },
  noun: {
    key: "noun",
    group: "part-of-speech",
    label: "Noun",
    definition: "A word that names a person, place, thing, idea, or quality.",
    example: "Example: מֶלֶךְ = king"
  },
  verb: {
    key: "verb",
    group: "part-of-speech",
    label: "Verb",
    definition: "A word that expresses action, process, or state of being.",
    example: "Example: אָמַר = he said"
  },
  adjective: {
    key: "adjective",
    group: "part-of-speech",
    label: "Adjective",
    definition: "A word that describes or qualifies a noun.",
    example: "Example: טוֹב = good"
  },
  pronoun: {
    key: "pronoun",
    group: "part-of-speech",
    label: "Pronoun",
    definition: "A word that stands in for a noun or points back to a person or thing.",
    example: "Example: הוּא = he"
  },
  preposition: {
    key: "preposition",
    group: "part-of-speech",
    label: "Preposition",
    definition: "A relation word that marks location, direction, source, means, or association.",
    example: "Example: בְּ = in / by / with"
  },
  conjunction: {
    key: "conjunction",
    group: "part-of-speech",
    label: "Conjunction",
    definition: "A joining word that connects words, clauses, or sentences.",
    example: "Example: וְ = and"
  },
  particle: {
    key: "particle",
    group: "part-of-speech",
    label: "Particle",
    definition: "A short function word that marks grammar, emphasis, negation, or relation.",
    example: "Example: אֵת marks a definite direct object"
  },
  article: {
    key: "article",
    group: "part-of-speech",
    label: "Article",
    definition: "A marker that identifies a noun as definite.",
    example: "Example: הַ = the"
  },
  masculine: {
    key: "masculine",
    group: "gender",
    label: "Masculine",
    definition: "The masculine grammatical gender."
  },
  feminine: {
    key: "feminine",
    group: "gender",
    label: "Feminine",
    definition: "The feminine grammatical gender."
  },
  singular: {
    key: "singular",
    group: "number",
    label: "Singular",
    definition: "Refers to one person, thing, or concept."
  },
  plural: {
    key: "plural",
    group: "number",
    label: "Plural",
    definition: "Refers to more than one person, thing, or concept."
  },
  dual: {
    key: "dual",
    group: "number",
    label: "Dual",
    definition: "Refers to a pair or twofold form."
  },
  construct: {
    key: "construct",
    group: "state",
    label: "Construct",
    definition: "A bound noun form that usually connects to a following noun, often translated with 'of'."
  },
  absolute: {
    key: "absolute",
    group: "state",
    label: "Absolute",
    definition: "The independent noun form, not bound in a construct chain."
  },
  qal: {
    key: "qal",
    group: "stem",
    label: "Qal",
    definition: "The simple Hebrew verbal stem, often active in meaning."
  },
  niphal: {
    key: "niphal",
    group: "stem",
    label: "Niphal",
    definition: "A Hebrew verbal stem often expressing passive or reflexive action."
  },
  piel: {
    key: "piel",
    group: "stem",
    label: "Piel",
    definition: "A Hebrew verbal stem often expressing intensive or factitive action."
  },
  pual: {
    key: "pual",
    group: "stem",
    label: "Pual",
    definition: "The passive counterpart to Piel."
  },
  hiphil: {
    key: "hiphil",
    group: "stem",
    label: "Hiphil",
    definition: "A Hebrew verbal stem often expressing causative action."
  },
  hophal: {
    key: "hophal",
    group: "stem",
    label: "Hophal",
    definition: "The passive counterpart to Hiphil."
  },
  hithpael: {
    key: "hithpael",
    group: "stem",
    label: "Hithpael",
    definition: "A Hebrew verbal stem often expressing reflexive or reciprocal action."
  },
  perfect: {
    key: "perfect",
    group: "tense-aspect",
    label: "Perfect",
    definition: "A Hebrew conjugation commonly presenting action as whole or complete."
  },
  imperfect: {
    key: "imperfect",
    group: "tense-aspect",
    label: "Imperfect",
    definition: "A Hebrew conjugation commonly presenting action as incomplete, ongoing, modal, or future."
  },
  wayyiqtol: {
    key: "wayyiqtol",
    group: "tense-aspect",
    label: "Wayyiqtol",
    definition: "A narrative Hebrew verb form often used to advance past-time storyline."
  },
  imperative: {
    key: "imperative",
    group: "mood",
    label: "Imperative",
    definition: "A command form."
  },
  infinitive: {
    key: "infinitive",
    group: "mood",
    label: "Infinitive",
    definition: "A verbal noun form."
  },
  participle: {
    key: "participle",
    group: "mood",
    label: "Participle",
    definition: "A verbal adjective or substantive form."
  },
  "first-person": {
    key: "first-person",
    group: "person",
    label: "First person",
    definition: "The speaker: I or we."
  },
  "second-person": {
    key: "second-person",
    group: "person",
    label: "Second person",
    definition: "The addressee: you."
  },
  "third-person": {
    key: "third-person",
    group: "person",
    label: "Third person",
    definition: "Someone or something spoken about: he, she, it, or they."
  }
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function dedupeTerms(terms: HebrewGrammarTerm[]) {
  const seen = new Set<string>();

  return terms.filter((term) => {
    if (seen.has(term.key)) {
      return false;
    }

    seen.add(term.key);
    return true;
  });
}

function addTerm(terms: HebrewGrammarTerm[], key: keyof typeof HEBREW_GRAMMAR_TERMS) {
  terms.push(HEBREW_GRAMMAR_TERMS[key]);
}

function getTermLabel(terms: HebrewGrammarTerm[], group: string) {
  return terms.find((term) => term.group === group)?.label ?? null;
}

function addTermsFromDecodedMorphology(terms: HebrewGrammarTerm[], decodedMorphology?: string | null) {
  const text = normalize(decodedMorphology);

  if (!text) {
    return;
  }

  if (/\bproper\b/.test(text) && /\bnoun\b/.test(text)) {
    addTerm(terms, "proper-noun");
  } else if (/\bnoun\b/.test(text)) {
    addTerm(terms, "noun");
  }

  if (/\bverb\b/.test(text)) addTerm(terms, "verb");
  if (/\badjective\b/.test(text)) addTerm(terms, "adjective");
  if (/\bpronoun\b/.test(text)) addTerm(terms, "pronoun");
  if (/\bpreposition\b/.test(text)) addTerm(terms, "preposition");
  if (/\bconjunction\b/.test(text)) addTerm(terms, "conjunction");
  if (/\bparticle\b/.test(text)) addTerm(terms, "particle");
  if (/\barticle\b/.test(text)) addTerm(terms, "article");
  if (/\bmasculine\b/.test(text)) addTerm(terms, "masculine");
  if (/\bfeminine\b/.test(text)) addTerm(terms, "feminine");
  if (/\bsingular\b/.test(text)) addTerm(terms, "singular");
  if (/\bplural\b/.test(text)) addTerm(terms, "plural");
  if (/\bdual\b/.test(text)) addTerm(terms, "dual");
  if (/\bconstruct\b/.test(text)) addTerm(terms, "construct");
  if (/\babsolute\b/.test(text)) addTerm(terms, "absolute");
}

function addVerbTermsFromCode(terms: HebrewGrammarTerm[], morphology: string) {
  const stemCode = morphology[1];
  const conjugationCode = morphology[2];
  const personCode = morphology.match(/[123]/)?.[0] ?? null;

  if (stemCode === "q") addTerm(terms, "qal");
  if (stemCode === "N") addTerm(terms, "niphal");
  if (stemCode === "p") addTerm(terms, "piel");
  if (stemCode === "P") addTerm(terms, "pual");
  if (stemCode === "h") addTerm(terms, "hiphil");
  if (stemCode === "H") addTerm(terms, "hophal");
  if (stemCode === "t") addTerm(terms, "hithpael");

  if (conjugationCode === "p") addTerm(terms, "perfect");
  if (conjugationCode === "i") addTerm(terms, "imperfect");
  if (conjugationCode === "w") addTerm(terms, "wayyiqtol");
  if (conjugationCode === "v") addTerm(terms, "imperative");
  if (conjugationCode === "a" || conjugationCode === "c") addTerm(terms, "infinitive");
  if (conjugationCode === "r") addTerm(terms, "participle");

  if (personCode === "1") addTerm(terms, "first-person");
  if (personCode === "2") addTerm(terms, "second-person");
  if (personCode === "3") addTerm(terms, "third-person");
}

function addNominalTermsFromCode(terms: HebrewGrammarTerm[], morphology: string) {
  const genderCode = morphology.match(/[mf]/i)?.[0]?.toLowerCase() ?? null;
  const numberCode = morphology.match(/[spd]/i)?.[0]?.toLowerCase() ?? null;
  const stateCode = morphology.match(/[ac]$/i)?.[0]?.toLowerCase() ?? null;

  if (genderCode === "m") addTerm(terms, "masculine");
  if (genderCode === "f") addTerm(terms, "feminine");
  if (numberCode === "s") addTerm(terms, "singular");
  if (numberCode === "p") addTerm(terms, "plural");
  if (numberCode === "d") addTerm(terms, "dual");
  if (stateCode === "c") addTerm(terms, "construct");
  if (stateCode === "a") addTerm(terms, "absolute");
}

function getTermsFromMorphologyCode(morphology?: string | null) {
  const code = morphology ?? "";
  const terms: HebrewGrammarTerm[] = [];
  const partOfSpeechCode = code[0];

  if (partOfSpeechCode === "N") addTerm(terms, "noun");
  if (partOfSpeechCode === "V") addTerm(terms, "verb");
  if (partOfSpeechCode === "A") addTerm(terms, "adjective");
  if (partOfSpeechCode === "P") addTerm(terms, "pronoun");
  if (partOfSpeechCode === "R") addTerm(terms, "preposition");
  if (partOfSpeechCode === "C") addTerm(terms, "conjunction");
  if (partOfSpeechCode === "T") addTerm(terms, "particle");

  if (partOfSpeechCode === "V") {
    addVerbTermsFromCode(terms, code);
  } else {
    addNominalTermsFromCode(terms, code);
  }

  return terms;
}

function buildParsedToken(token: HebrewToken): ParsedHebrewToken {
  const terms = dedupeTerms([
    ...HEBREW_GRAMMAR_TERMS_FROM_DECODED(token),
    ...getTermsFromMorphologyCode(token.morphology)
  ]);

  return {
    token,
    terms,
    partOfSpeech: getTermLabel(terms, "part-of-speech"),
    gender: getTermLabel(terms, "gender"),
    number: getTermLabel(terms, "number"),
    stem: getTermLabel(terms, "stem"),
    conjugation: getTermLabel(terms, "tense-aspect"),
    person: getTermLabel(terms, "person"),
    state: getTermLabel(terms, "state")
  };
}

function HEBREW_GRAMMAR_TERMS_FROM_DECODED(token: HebrewToken) {
  const terms: HebrewGrammarTerm[] = [];
  addTermsFromDecodedMorphology(terms, token.decodedMorphology);
  return terms;
}

function buildSummary(parsedToken: ParsedHebrewToken) {
  const pieces =
    parsedToken.partOfSpeech === "Verb"
      ? [
          parsedToken.stem,
          parsedToken.conjugation,
          parsedToken.person,
          parsedToken.gender,
          parsedToken.number
        ]
      : [
          parsedToken.gender,
          parsedToken.number,
          parsedToken.state
        ];

  return pieces.filter(Boolean).join(" ");
}

function buildFunctionHints(parsedToken: ParsedHebrewToken) {
  return parsedToken.terms
    .filter((term) => term.group !== "part-of-speech")
    .slice(0, 4)
    .map((term) => term.definition);
}

function buildParadigmPattern(parsedToken: ParsedHebrewToken) {
  if (parsedToken.partOfSpeech === "Verb") {
    return parsedToken.stem
      ? `Hebrew ${parsedToken.stem} verbs follow root-and-pattern forms across conjugation, person, gender, and number.`
      : "Hebrew verbs follow root-and-pattern forms across stem, conjugation, person, gender, and number.";
  }

  if (parsedToken.partOfSpeech?.toLowerCase().includes("noun")) {
    return "Hebrew nouns inflect for gender, number, and state, with construct forms linking closely to following words.";
  }

  if (parsedToken.partOfSpeech) {
    return `Hebrew ${parsedToken.partOfSpeech.toLowerCase()} forms function as part of the sentence grammar rather than as independent content words.`;
  }

  return null;
}

function buildExampleForms(token: HebrewToken) {
  return Array.from(new Set([token.lemma, token.surface].map((value) => value?.trim()).filter(Boolean)));
}

export function buildHebrewGrammarInfos(tokens: HebrewToken[]) {
  return tokens.map((token): GreekGrammarInfo => {
    const parsedToken = buildParsedToken(token);
    const summary = buildSummary(parsedToken);

    return {
      word: token.surface,
      lemma: token.lemma,
      type: parsedToken.partOfSpeech,
      meaning: token.gloss ?? null,
      gloss: token.gloss ?? null,
      gender: parsedToken.gender,
      number: parsedToken.number,
      person: parsedToken.person,
      aspect: parsedToken.conjugation,
      quickInfo: {
        partOfSpeech: parsedToken.partOfSpeech,
        lemma: token.lemma,
        meaning: token.gloss ?? null,
        gloss: token.gloss ?? null,
        summary
      },
      expandedInfo: {
        morphologyLabel: parsedToken.terms.map((term) => term.label).join(" · ") || null,
        fullMorphology: token.decodedMorphology ?? token.morphology ?? null,
        functionHints: buildFunctionHints(parsedToken),
        paradigmPattern: buildParadigmPattern(parsedToken),
        exampleForms: buildExampleForms(token),
        linkedPhrase: null,
        details: parsedToken.terms.map(({ key: _key, ...term }) => term)
      }
    };
  });
}

export function getHebrewGrammarInfo(
  token: HebrewToken,
  tokens: HebrewToken[],
  tokenIndex: number
) {
  return buildHebrewGrammarInfos(tokens)[tokenIndex] ?? buildHebrewGrammarInfos([token])[0] ?? null;
}
