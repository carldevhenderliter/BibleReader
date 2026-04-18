import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fathersWorkPath = path.join(repoRoot, "data", "fathers", "works", "1-clement.json");
const fathersLexiconPath = path.join(repoRoot, "data", "fathers", "greek-lexicon.json");
const fathersLemmaIndexPath = path.join(repoRoot, "data", "fathers", "greek-lemma-index.json");
const fathersFormIndexPath = path.join(repoRoot, "data", "fathers", "greek-form-index.json");
const bibleLexiconPath = path.join(repoRoot, "data", "bible", "greek", "lexicon.json");
const bibleLemmaIndexPath = path.join(repoRoot, "data", "bible", "greek", "lemma-index.json");
const bibleFormIndexPath = path.join(repoRoot, "data", "bible", "greek", "form-index.json");

const COMBINING_MARKS_PATTERN = /\p{M}+/gu;
const GREEK_TOKEN_PATTERN = /[\p{Script=Greek}\p{M}]+/gu;

const GLOSS_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "with",
  "by",
  "from",
  "into",
  "unto",
  "upon",
  "through",
  "and",
  "or"
]);

const SIMPLE_TRANSLITERATION_MAP = {
  α: "a",
  β: "b",
  γ: "g",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "ē",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "m",
  ν: "n",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "r",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "u",
  φ: "ph",
  χ: "ch",
  ψ: "ps",
  ω: "ō"
};

function normalizeGreekLookupValue(value) {
  return value
    .normalize("NFD")
    .replace(/\(.*?\)/gu, "")
    .replace(COMBINING_MARKS_PATTERN, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}a-z0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGreekFormLookupValue(value) {
  return normalizeGreekLookupValue(value).replace(/[^a-z0-9\p{Script=Greek}]+/gu, "");
}

function normalizeGreekSurfaceForExactMatch(value) {
  return value
    .normalize("NFC")
    .replace(/[^\p{Script=Greek}\p{M}]+/gu, "")
    .toLocaleLowerCase("el");
}

function sanitizeGlossCandidate(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[“”"]/g, "")
    .replace(/^[-,:;.\s]+/g, "")
    .replace(/[-,:;.\s]+$/g, "")
    .trim();
}

function splitGlossDefinitionIntoCandidates(value) {
  return value.split(/\n+/).reduce((candidates, line) => {
    for (const part of line.split(/[;,]/)) {
      const trimmedPart = sanitizeGlossCandidate(part);

      if (!trimmedPart) {
        continue;
      }

      for (const candidate of trimmedPart.split(/\s+or\s+/i)) {
        const sanitizedCandidate = sanitizeGlossCandidate(candidate);

        if (sanitizedCandidate) {
          candidates.push(sanitizedCandidate);
        }
      }
    }

    return candidates;
  }, []);
}

function pickSingleWordGloss(value) {
  if (!value?.trim()) {
    return null;
  }

  for (const candidate of splitGlossDefinitionIntoCandidates(value)) {
    const words = Array.from(
      candidate.matchAll(/\b[\p{L}]+(?:[’'][\p{L}]+)?\b/gu),
      (match) => match[0]
    );
    const contentWords = words.filter((word) => !GLOSS_STOP_WORDS.has(word.toLowerCase()));

    if (contentWords.length === 1) {
      return contentWords[0];
    }
  }

  return null;
}

function transliterateGreekSurface(value) {
  let transliteration = "";

  for (const char of value.normalize("NFD")) {
    if (!/\p{Script=Greek}/u.test(char) || /\p{M}/u.test(char)) {
      continue;
    }

    const lowercaseChar = char.toLowerCase();
    const rendered = SIMPLE_TRANSLITERATION_MAP[lowercaseChar] ?? lowercaseChar;
    transliteration += char === lowercaseChar
      ? rendered
      : rendered[0].toUpperCase() + rendered.slice(1);
  }

  return transliteration;
}

function tokenizeGreekSurface(value) {
  const matches = Array.from(value.matchAll(GREEK_TOKEN_PATTERN));

  return matches.map((match, index) => {
    const surface = match[0];
    const start = match.index ?? 0;
    const end = start + surface.length;
    const nextStart = matches[index + 1]?.index ?? value.length;
    const trailingPunctuation = value
      .slice(end, nextStart)
      .replace(/\s+/g, "")
      .trim();

    return {
      surface,
      trailingPunctuation: trailingPunctuation || undefined
    };
  });
}

function createSyntheticDefinition(surface) {
  const transliteration = transliterateGreekSurface(surface);
  return transliteration ? transliteration.toLowerCase() : "greek";
}

function pickBestFormMatch(formMatches, surface) {
  if (formMatches.length === 0) {
    return null;
  }

  const normalizedSurface = normalizeGreekSurfaceForExactMatch(surface);
  const exactSurfaceMatch = formMatches.find(
    (item) => normalizeGreekSurfaceForExactMatch(item.form) === normalizedSurface
  );

  if (exactSurfaceMatch) {
    return exactSurfaceMatch;
  }

  return formMatches[0];
}

async function main() {
  const [payloadFile, bibleLexiconFile, bibleLemmaIndexFile, bibleFormIndexFile] = await Promise.all([
    readFile(fathersWorkPath, "utf8"),
    readFile(bibleLexiconPath, "utf8"),
    readFile(bibleLemmaIndexPath, "utf8"),
    readFile(bibleFormIndexPath, "utf8")
  ]);

  const payload = JSON.parse(payloadFile);
  const bibleLexicon = JSON.parse(bibleLexiconFile);
  const bibleLemmaIndex = JSON.parse(bibleLemmaIndexFile);
  const bibleFormIndex = JSON.parse(bibleFormIndexFile);

  const syntheticLexicon = {};
  const syntheticLemmaIndex = {};
  const syntheticFormIndex = {};

  payload.segments = payload.segments.map((segment) => {
    const tokenSurfaces = tokenizeGreekSurface(segment.greek);

    const greekLexicalTokens = tokenSurfaces.map((tokenSurface, tokenIndex) => {
      const normalizedSurface = normalizeGreekFormLookupValue(tokenSurface.surface);
      const formMatches = bibleFormIndex[normalizedSurface] ?? [];
      const lemmaMatches = bibleLemmaIndex[normalizedSurface] ?? [];
      const matchedForm = pickBestFormMatch(formMatches, tokenSurface.surface);
      const entryKey = matchedForm?.entryKey ?? matchedForm?.strongs ?? lemmaMatches[0] ?? null;
      const entry = entryKey ? bibleLexicon[entryKey] ?? null : null;
      const selectedForm = entry && matchedForm
        ? entry.forms.find(
            (form) =>
              normalizeGreekFormLookupValue(form.form) ===
              normalizeGreekFormLookupValue(matchedForm.form ?? tokenSurface.surface)
          ) ?? null
        : null;

      if (entry) {
        const gloss =
          pickSingleWordGloss(selectedForm?.definition) ??
          pickSingleWordGloss(entry.shortDefinition) ??
          pickSingleWordGloss(entry.longDefinition) ??
          createSyntheticDefinition(tokenSurface.surface);

        return {
          surface: tokenSurface.surface,
          lemma: entry.lemma,
          entryKey: entry.entryKey ?? entryKey,
          strongs: entry.strongs,
          transliteration: transliterateGreekSurface(tokenSurface.surface),
          morphology: selectedForm?.morphology,
          decodedMorphology: selectedForm?.decodedMorphology,
          gloss,
          trailingPunctuation: tokenSurface.trailingPunctuation
        };
      }

      const syntheticEntryKey = `AF-1CLEM:${normalizedSurface}`;
      const syntheticLemma = tokenSurface.surface;
      const syntheticDefinition = createSyntheticDefinition(tokenSurface.surface);
      const syntheticEntry = syntheticLexicon[syntheticEntryKey] ?? {
        entryKey: syntheticEntryKey,
        lemma: syntheticLemma,
        transliteration: transliterateGreekSurface(syntheticLemma),
        shortDefinition: syntheticDefinition,
        longDefinition: `Patristic Greek fallback entry for ${syntheticLemma} in 1 Clement.`,
        forms: [],
        sources: ["1 Clement", "Apostolic Fathers"]
      };

      syntheticEntry.forms.push({
        form: tokenSurface.surface,
        morphology: "",
        definition: syntheticDefinition
      });
      syntheticLexicon[syntheticEntryKey] = syntheticEntry;

      const normalizedLemma = normalizeGreekLookupValue(syntheticEntry.lemma);
      syntheticLemmaIndex[normalizedLemma] = Array.from(
        new Set([...(syntheticLemmaIndex[normalizedLemma] ?? []), syntheticEntryKey])
      );
      syntheticFormIndex[normalizedSurface] = [
        ...(syntheticFormIndex[normalizedSurface] ?? []),
        {
          entryKey: syntheticEntryKey,
          form: tokenSurface.surface
        }
      ];

      return {
        surface: tokenSurface.surface,
        lemma: syntheticEntry.lemma,
        entryKey: syntheticEntryKey,
        transliteration: transliterateGreekSurface(tokenSurface.surface),
        gloss: syntheticDefinition,
        trailingPunctuation: tokenSurface.trailingPunctuation
      };
    });

    return {
      ...segment,
      greekLexicalTokens
    };
  });

  for (const entry of Object.values(syntheticLexicon)) {
    entry.forms = entry.forms.filter((form, index, forms) => {
      const formKey = `${normalizeGreekFormLookupValue(form.form)}:${form.definition ?? ""}`;
      return forms.findIndex((candidate) => {
        const candidateKey = `${normalizeGreekFormLookupValue(candidate.form)}:${candidate.definition ?? ""}`;
        return candidateKey === formKey;
      }) === index;
    });
  }

  for (const [normalizedForm, items] of Object.entries(syntheticFormIndex)) {
    syntheticFormIndex[normalizedForm] = items.filter((item, index) => {
      const itemKey = `${item.entryKey}:${normalizeGreekFormLookupValue(item.form)}`;
      return items.findIndex((candidate) => {
        const candidateKey = `${candidate.entryKey}:${normalizeGreekFormLookupValue(candidate.form)}`;
        return candidateKey === itemKey;
      }) === index;
    });
  }

  await Promise.all([
    writeFile(fathersWorkPath, `${JSON.stringify(payload, null, 2)}\n`),
    writeFile(fathersLexiconPath, `${JSON.stringify(syntheticLexicon, null, 2)}\n`),
    writeFile(fathersLemmaIndexPath, `${JSON.stringify(syntheticLemmaIndex, null, 2)}\n`),
    writeFile(fathersFormIndexPath, `${JSON.stringify(syntheticFormIndex, null, 2)}\n`)
  ]);

  console.log(
    `Enriched 1 Clement with ${payload.segments.length} Greek segments and ${
      Object.keys(syntheticLexicon).length
    } Fathers fallback lexicon entries.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
