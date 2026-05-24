import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const greekDataDir = path.join(repoRoot, "data", "bible", "greek");
const lexiconPath = path.join(greekDataDir, "lexicon.json");
const overridesPath = path.join(greekDataDir, "form-translation-overrides.json");

const CASE_TEMPLATE_BY_LABEL = {
  nominative: "base",
  genitive: "case:genitive",
  dative: "case:dative",
  accusative: "base",
  vocative: "case:vocative"
};

const CASE_LABEL_BY_CODE = {
  N: "nominative",
  G: "genitive",
  D: "dative",
  A: "accusative",
  V: "vocative"
};

const SUBJECT_BY_PERSON_NUMBER = {
  "first:singular": "I",
  "second:singular": "you",
  "third:singular": "he/she/it",
  "first:plural": "we",
  "second:plural": "you all",
  "third:plural": "they"
};

async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

function normalizeGreekLookupValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/ς/g, "σ")
    .normalize("NFC")
    .trim();
}

function normalizeGreekFormLookupValue(value) {
  return normalizeGreekLookupValue(value).replace(/[^a-z0-9\p{Script=Greek}]+/gu, "");
}

function getOverrideKey(entryKey, form) {
  return [
    entryKey,
    normalizeGreekFormLookupValue(form.form),
    String(form.morphology ?? "").trim()
  ].join("|");
}

function sanitizeGlossCandidate(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .replace(/^[-,:;.\s]+/g, "")
    .replace(/[-,:;.\s]+$/g, "")
    .trim();
}

function splitGlossDefinitionIntoCandidates(value) {
  return String(value ?? "")
    .split(/\n|;|,|\bor\b|—|--/i)
    .map(sanitizeGlossCandidate)
    .filter(Boolean);
}

function getPreferredGlossCandidate(value) {
  const candidates = splitGlossDefinitionIntoCandidates(value);

  for (const candidate of candidates) {
    const withoutArticle = candidate.replace(/^(?:a|an|the)\s+/i, "").trim();
    const words = withoutArticle.split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return withoutArticle;
    }
  }

  for (const candidate of candidates) {
    const withoutArticle = candidate.replace(/^(?:a|an|the)\s+/i, "").trim();
    const words = withoutArticle.split(/\s+/).filter(Boolean);

    if (words.length > 0) {
      return words.at(-1);
    }
  }

  return null;
}

function getVerbGlossCandidate(value) {
  const candidates = splitGlossDefinitionIntoCandidates(value);

  for (const candidate of candidates) {
    const match = candidate.match(/^to\s+(.+)$/i);

    if (!match) {
      continue;
    }

    const gloss = sanitizeGlossCandidate(match[1]);

    if (gloss) {
      return gloss;
    }
  }

  return null;
}

function getBaseGloss(entry, form) {
  const isVerb =
    String(form.decodedMorphology ?? "").toLowerCase().includes("verb") ||
    String(form.morphology ?? "").startsWith("V-");

  if (isVerb) {
    const verbGloss =
      getVerbGlossCandidate(form.definition) ??
      getVerbGlossCandidate(entry.shortDefinition) ??
      getVerbGlossCandidate(entry.longDefinition);

    if (verbGloss) {
      return verbGloss;
    }
  }

  return (
    getPreferredGlossCandidate(form.definition) ??
    getPreferredGlossCandidate(entry.shortDefinition) ??
    getPreferredGlossCandidate(entry.longDefinition) ??
    getPreferredGlossCandidate(entry.lemma) ??
    entry.lemma
  );
}

function getCaseLabel(form) {
  const decoded = String(form.decodedMorphology ?? "").toLowerCase();
  const decodedCase = Object.keys(CASE_TEMPLATE_BY_LABEL).find((caseLabel) =>
    decoded.includes(caseLabel)
  );

  if (decodedCase) {
    return decodedCase;
  }

  const morphology = String(form.morphology ?? "").trim();
  const match = morphology.match(/^[A-Z0-9]+-?([NGDAV])/i);

  return match ? CASE_LABEL_BY_CODE[match[1].toUpperCase()] ?? null : null;
}

function getPersonNumber(form) {
  const decoded = String(form.decodedMorphology ?? "").toLowerCase();
  const person = ["first", "second", "third"].find((value) => decoded.includes(`${value} person`));
  const number = ["singular", "plural"].find((value) => decoded.includes(value));

  if (person && number) {
    return { person, number };
  }

  return null;
}

function getTranslationTemplate(form) {
  const decoded = String(form.decodedMorphology ?? "").toLowerCase();
  const morphology = String(form.morphology ?? "");

  if (decoded.includes("verb") || morphology.startsWith("V-")) {
    if (decoded.includes("infinitive") || /\binfin\b/.test(decoded)) {
      return "verb:infinitive";
    }

    if (decoded.includes("participle") || decoded.includes(" part ")) {
      return "base";
    }

    const personNumber = getPersonNumber(form);

    if (personNumber) {
      return `verb:finite:${personNumber.person}-${personNumber.number}`;
    }

    return "base";
  }

  const caseLabel = getCaseLabel(form);

  return caseLabel ? CASE_TEMPLATE_BY_LABEL[caseLabel] ?? "base" : "base";
}

function applyTranslationTemplate(template, baseGloss) {
  const gloss = sanitizeGlossCandidate(baseGloss);

  if (!gloss) {
    return "";
  }

  if (template === "case:genitive") {
    return `of ${gloss}`;
  }

  if (template === "case:dative") {
    return `to/for ${gloss}`;
  }

  if (template === "case:vocative") {
    return `O ${gloss}`;
  }

  if (template === "verb:infinitive") {
    return /^to\s+/i.test(gloss) ? gloss : `to ${gloss}`;
  }

  if (template.startsWith("verb:finite:")) {
    const personNumberKey = template.replace("verb:finite:", "").replace("-", ":");
    const subject = SUBJECT_BY_PERSON_NUMBER[personNumberKey];

    return subject ? `${subject} ${gloss}` : gloss;
  }

  return gloss;
}

function buildTranslatedForm(entryKey, entry, form, overrides) {
  const override = overrides[getOverrideKey(entryKey, form)] ?? null;
  const template = override?.translationTemplate ?? getTranslationTemplate(form);
  const generatedGloss = applyTranslationTemplate(template, getBaseGloss(entry, form));
  const overrideGloss =
    typeof override?.translationGloss === "string" ? sanitizeGlossCandidate(override.translationGloss) : "";

  return {
    ...form,
    translationGloss: overrideGloss || generatedGloss,
    translationSource: overrideGloss ? "override" : "generated",
    translationTemplate: template
  };
}

async function main() {
  const lexicon = await loadJson(lexiconPath, {});
  const overrides = await loadJson(overridesPath, {});
  const nextLexicon = Object.fromEntries(
    Object.entries(lexicon).map(([entryKey, entry]) => [
      entryKey,
      {
        ...entry,
        forms: Array.isArray(entry.forms)
          ? entry.forms.map((form) => buildTranslatedForm(entryKey, entry, form, overrides))
          : []
      }
    ])
  );

  await writeFile(lexiconPath, `${JSON.stringify(nextLexicon, null, 2)}\n`);
  console.log("Generated Greek form translation glosses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
