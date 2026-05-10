import grammarSupport from "@/data/bible/greek/grammar-support.json";
import {
  getGreekMorphologyDetails,
  transliterateGreekSurface,
  type GreekMorphologyDetails,
  type GreekMorphologyTermDetails
} from "@/lib/bible/greek";
import type {
  GreekGrammarDetailItem,
  GreekGrammarInfo,
  GreekGrammarLinkedPhrase,
  GreekToken
} from "@/lib/bible/types";

type SupportedPhraseKind = GreekGrammarLinkedPhrase["kind"];

type GrammarSupportData = typeof grammarSupport;

type ParsedTokenDetails = {
  token: GreekToken;
  details: GreekMorphologyDetails | null;
  type: string | null;
  gender: string | null;
  number: string | null;
  caseValue: string | null;
  declension: string | null;
  tense: string | null;
  voice: string | null;
  mood: string | null;
  person: string | null;
  aspect: string | null;
  meaning: string | null;
  gloss: string | null;
};

function getTermLabel(
  details: GreekMorphologyDetails | null,
  group: GreekMorphologyTermDetails["group"]
) {
  return details?.terms.find((term) => term.group === group)?.label ?? null;
}

function normalizeKey(label?: string | null) {
  return label?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
}

function dedupeStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))
  );
}

function deriveAspect(tense: string | null) {
  const key = normalizeKey(tense);

  if (key === "present" || key === "imperfect") {
    return "Imperfective";
  }

  if (key === "aorist") {
    return "Perfective";
  }

  if (key === "perfect" || key === "pluperfect") {
    return "Resultative";
  }

  if (key === "future") {
    return "Future";
  }

  return null;
}

function deriveDeclension(token: GreekToken, type: string | null) {
  const normalizedType = normalizeKey(type);
  const normalizedLemma = token.lemma.normalize("NFC");

  if (normalizedType === "article") {
    return grammarSupport.declensionLabels["definite-article"];
  }

  if (normalizedType !== "noun" && normalizedType !== "adjective") {
    return null;
  }

  if (normalizedLemma.endsWith("ος") || normalizedLemma.endsWith("ον")) {
    return grammarSupport.declensionLabels["second-declension"];
  }

  if (normalizedLemma.endsWith("η") || normalizedLemma.endsWith("α")) {
    return grammarSupport.declensionLabels["first-declension"];
  }

  return grammarSupport.declensionLabels["third-declension"];
}

function getParadigmPattern(
  type: string | null,
  tense: string | null,
  voice: string | null,
  mood: string | null,
  declension: string | null
) {
  const normalizedType = normalizeKey(type);

  if (normalizedType === "verb") {
    const key = `verb:${normalizeKey(tense)}:${normalizeKey(voice)}:${normalizeKey(mood)}` as keyof GrammarSupportData["paradigmPatterns"];
    return grammarSupport.paradigmPatterns[key] ?? null;
  }

  if (normalizedType === "article") {
    return grammarSupport.paradigmPatterns["article:definite"] ?? null;
  }

  if (declension === grammarSupport.declensionLabels["first-declension"]) {
    return grammarSupport.paradigmPatterns["declension:first-declension"] ?? null;
  }

  if (declension === grammarSupport.declensionLabels["second-declension"]) {
    return grammarSupport.paradigmPatterns["declension:second-declension"] ?? null;
  }

  if (declension === grammarSupport.declensionLabels["third-declension"]) {
    return grammarSupport.paradigmPatterns["declension:third-declension"] ?? null;
  }

  return null;
}

function getExampleForms(
  type: string | null,
  tense: string | null,
  voice: string | null,
  mood: string | null,
  declension: string | null
) {
  const normalizedType = normalizeKey(type);

  if (normalizedType === "verb") {
    const key = `verb:${normalizeKey(tense)}:${normalizeKey(voice)}:${normalizeKey(mood)}` as keyof GrammarSupportData["exampleForms"];
    return grammarSupport.exampleForms[key] ?? [];
  }

  if (normalizedType === "article") {
    return grammarSupport.exampleForms["article:definite"] ?? [];
  }

  if (declension === grammarSupport.declensionLabels["first-declension"]) {
    return grammarSupport.exampleForms["declension:first-declension"] ?? [];
  }

  if (declension === grammarSupport.declensionLabels["second-declension"]) {
    return grammarSupport.exampleForms["declension:second-declension"] ?? [];
  }

  if (declension === grammarSupport.declensionLabels["third-declension"]) {
    return grammarSupport.exampleForms["declension:third-declension"] ?? [];
  }

  return [];
}

function buildSummary(parsedToken: ParsedTokenDetails) {
  const normalizedType = normalizeKey(parsedToken.type);

  if (normalizedType === "verb") {
    return dedupeStrings([
      parsedToken.tense,
      parsedToken.voice,
      parsedToken.mood,
      parsedToken.person,
      parsedToken.number
    ]).join(" ");
  }

  return dedupeStrings([
    parsedToken.caseValue,
    parsedToken.number,
    parsedToken.gender
  ]).join(" ");
}

function buildFunctionHints(parsedToken: ParsedTokenDetails) {
  const caseHint =
    grammarSupport.caseFunctionHints[
      normalizeKey(parsedToken.caseValue) as keyof GrammarSupportData["caseFunctionHints"]
    ] ?? null;
  const aspectHint =
    grammarSupport.verbAspectHints[
      normalizeKey(parsedToken.tense) as keyof GrammarSupportData["verbAspectHints"]
    ] ?? null;
  const termHints = parsedToken.details?.terms
    .filter((term) => term.group !== "part-of-speech")
    .slice(0, 3)
    .map((term) => term.definition) ?? [];

  return dedupeStrings([caseHint, aspectHint, ...termHints]);
}

function buildDetailItems(parsedToken: ParsedTokenDetails): GreekGrammarDetailItem[] {
  return (
    parsedToken.details?.terms.map((term) => ({
      label: term.label,
      definition: term.definition,
      example: term.example,
      group: term.group
    })) ?? []
  );
}

function buildParsedToken(token: GreekToken): ParsedTokenDetails {
  const details = getGreekMorphologyDetails({
    morphology: token.morphology,
    decodedMorphology: token.decodedMorphology
  });
  const type = getTermLabel(details, "part-of-speech");
  const gender = getTermLabel(details, "gender");
  const number = getTermLabel(details, "number");
  const caseValue = getTermLabel(details, "case");
  const tense = getTermLabel(details, "tense");
  const voice = getTermLabel(details, "voice");
  const mood = getTermLabel(details, "mood");
  const person = getTermLabel(details, "person");
  const aspect = deriveAspect(tense);
  const declension = deriveDeclension(token, type);
  const gloss = token.gloss?.trim() ?? null;
  const meaning = gloss ?? null;

  return {
    token,
    details,
    type,
    gender,
    number,
    caseValue,
    declension,
    tense,
    voice,
    mood,
    person,
    aspect,
    meaning,
    gloss
  };
}

function isAgreementMatch(left: ParsedTokenDetails, right: ParsedTokenDetails) {
  return (
    Boolean(left.gender) &&
    Boolean(left.number) &&
    Boolean(left.caseValue) &&
    left.gender === right.gender &&
    left.number === right.number &&
    left.caseValue === right.caseValue
  );
}

function buildLinkedPhrase(
  kind: SupportedPhraseKind,
  members: ParsedTokenDetails[],
  example: string | null
) {
  const first = members[0];

  return {
    kind,
    combined: members.map((member) => member.token.surface).join(" "),
    members: members.map((member) => member.token.surface),
    sharedGender: first?.gender ?? null,
    sharedNumber: first?.number ?? null,
    sharedCase: first?.caseValue ?? null,
    functionHint:
      grammarSupport.caseFunctionHints[
        normalizeKey(first?.caseValue) as keyof GrammarSupportData["caseFunctionHints"]
      ] ?? null,
    example
  } satisfies GreekGrammarLinkedPhrase;
}

function buildLinkedPhraseMap(parsedTokens: ParsedTokenDetails[]) {
  const linkedPhraseByIndex: Array<GreekGrammarLinkedPhrase | null> = new Array(parsedTokens.length).fill(
    null
  );

  for (let index = 0; index < parsedTokens.length; index += 1) {
    const current = parsedTokens[index];
    const next = parsedTokens[index + 1] ?? null;
    const third = parsedTokens[index + 2] ?? null;

    if (
      normalizeKey(current.type) !== "article" ||
      !next ||
      normalizeKey(next.type) !== "noun" ||
      !isAgreementMatch(current, next)
    ) {
      continue;
    }

    const hasMatchingAdjective =
      third &&
      normalizeKey(third.type) === "adjective" &&
      isAgreementMatch(current, third);

    const phrase = hasMatchingAdjective
      ? buildLinkedPhrase(
          "article-noun-adjective",
          [current, next, third],
          grammarSupport.linkedPhraseExamples["article-noun-adjective"] ?? null
        )
      : buildLinkedPhrase(
          "article-noun",
          [current, next],
          grammarSupport.linkedPhraseExamples["article-noun"] ?? null
        );

    linkedPhraseByIndex[index] = phrase;
    linkedPhraseByIndex[index + 1] = phrase;

    if (hasMatchingAdjective) {
      linkedPhraseByIndex[index + 2] = phrase;
    }
  }

  return linkedPhraseByIndex;
}

export function buildGreekGrammarInfos(tokens: GreekToken[]) {
  const parsedTokens = tokens.map(buildParsedToken);
  const linkedPhraseByIndex = buildLinkedPhraseMap(parsedTokens);

  return parsedTokens.map((parsedToken, index): GreekGrammarInfo => {
    const summary = buildSummary(parsedToken);

    return {
      word: parsedToken.token.surface,
      lemma: parsedToken.token.lemma,
      type: parsedToken.type,
      meaning: parsedToken.meaning,
      gloss: parsedToken.gloss,
      gender: parsedToken.gender,
      number: parsedToken.number,
      case: parsedToken.caseValue,
      declension: parsedToken.declension,
      tense: parsedToken.tense,
      voice: parsedToken.voice,
      mood: parsedToken.mood,
      person: parsedToken.person,
      aspect: parsedToken.aspect,
      quickInfo: {
        partOfSpeech: parsedToken.type,
        lemma: parsedToken.token.lemma,
        meaning: parsedToken.meaning,
        gloss: parsedToken.gloss,
        summary
      },
      expandedInfo: {
        morphologyLabel: parsedToken.details?.label ?? null,
        fullMorphology:
          parsedToken.token.decodedMorphology ??
          parsedToken.details?.fullDescription ??
          parsedToken.token.morphology ??
          null,
        functionHints: buildFunctionHints(parsedToken),
        paradigmPattern: getParadigmPattern(
          parsedToken.type,
          parsedToken.tense,
          parsedToken.voice,
          parsedToken.mood,
          parsedToken.declension
        ),
        exampleForms: getExampleForms(
          parsedToken.type,
          parsedToken.tense,
          parsedToken.voice,
          parsedToken.mood,
          parsedToken.declension
        ),
        linkedPhrase: linkedPhraseByIndex[index],
        details: buildDetailItems(parsedToken)
      }
    };
  });
}

export function getGreekGrammarInfo(token: GreekToken, tokens: GreekToken[], tokenIndex: number) {
  return buildGreekGrammarInfos(tokens)[tokenIndex] ?? buildGreekGrammarInfos([token])[0] ?? null;
}

export function getGreekGrammarFallbackGloss(token: GreekToken) {
  return token.gloss?.trim() || transliterateGreekSurface(token.surface);
}
