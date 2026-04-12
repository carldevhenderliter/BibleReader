import { execFile as execFileCallback } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const interlinearBaseDir = path.join(repoRoot, "data", "bible", "interlinear", "esv", "base");
const greekDataDir = path.join(repoRoot, "data", "bible", "greek");
const strongsLexiconPath = path.join(repoRoot, "data", "bible", "strongs", "lexicon.json");
const sblgntSourceDir = path.join(repoRoot, "data", "source", "sblgnt");
const greekLexemeMappingsPath = path.join(
  repoRoot,
  "data",
  "source",
  "greek-lemma-mappings",
  "lexemes.yaml"
);

const SBLGNT_FILE_BY_SLUG = {
  matthew: "61-Mt-morphgnt.txt",
  mark: "62-Mk-morphgnt.txt",
  luke: "63-Lk-morphgnt.txt",
  john: "64-Jn-morphgnt.txt",
  acts: "65-Ac-morphgnt.txt",
  romans: "66-Ro-morphgnt.txt",
  "1-corinthians": "67-1Co-morphgnt.txt",
  "2-corinthians": "68-2Co-morphgnt.txt",
  galatians: "69-Ga-morphgnt.txt",
  ephesians: "70-Eph-morphgnt.txt",
  philippians: "71-Php-morphgnt.txt",
  colossians: "72-Col-morphgnt.txt",
  "1-thessalonians": "73-1Th-morphgnt.txt",
  "2-thessalonians": "74-2Th-morphgnt.txt",
  "1-timothy": "75-1Ti-morphgnt.txt",
  "2-timothy": "76-2Ti-morphgnt.txt",
  titus: "77-Tit-morphgnt.txt",
  philemon: "78-Phm-morphgnt.txt",
  hebrews: "79-Heb-morphgnt.txt",
  james: "80-Jas-morphgnt.txt",
  "1-peter": "81-1Pe-morphgnt.txt",
  "2-peter": "82-2Pe-morphgnt.txt",
  "1-john": "83-1Jn-morphgnt.txt",
  "2-john": "84-2Jn-morphgnt.txt",
  "3-john": "85-3Jn-morphgnt.txt",
  jude: "86-Jud-morphgnt.txt",
  revelation: "87-Re-morphgnt.txt"
};

const CRITICAL_MARKS_PATTERN = /[⸀-⸟]/gu;
const SURFACE_PUNCTUATION_PATTERN = /([,.;·;.!?]+)$/u;

function normalizeGreekLookupValue(value) {
  return value
    .normalize("NFD")
    .replace(CRITICAL_MARKS_PATTERN, "")
    .replace(/\(.*?\)/gu, "")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}a-z0-9\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGreekFormValue(value) {
  return normalizeGreekLookupValue(value).replace(/[^a-z0-9\p{Script=Greek}]+/gu, "");
}

function cleanGreekField(value) {
  return (value ?? "")
    .normalize("NFC")
    .replace(CRITICAL_MARKS_PATTERN, "")
    .replace(/[()]/g, "")
    .trim();
}

function splitSurfaceAndPunctuation(value) {
  const cleanedValue = cleanGreekField(value);
  const match = cleanedValue.match(SURFACE_PUNCTUATION_PATTERN);

  if (!match) {
    return {
      surface: cleanedValue,
      trailingPunctuation: ""
    };
  }

  return {
    surface: cleanedValue.slice(0, -match[1].length).trimEnd(),
    trailingPunctuation: match[1]
  };
}

function compressMorphologyCode(partOfSpeech, morphology) {
  const prefix = cleanGreekField(partOfSpeech);
  const parse = cleanGreekField(morphology).replace(/-/g, "");

  if (!parse) {
    return prefix.endsWith("-") ? prefix.slice(0, -1) : prefix;
  }

  if (prefix === "V-") {
    const compact =
      parse[0] === "P" || parse[0] === "A"
        ? parse
        : [parse.slice(0, 4), parse[4] ? `-${parse[4]}` : ""].join("");

    return `${prefix}${compact}`;
  }

  return `${prefix.endsWith("-") ? prefix : `${prefix}-`}${parse}`;
}

function decodeNominalMorphology(label, morphology) {
  const parse = cleanGreekField(morphology);
  const caseCode = parse[4] ?? "-";
  const numberCode = parse[5] ?? "-";
  const genderCode = parse[6] ?? "-";
  const degreeCode = parse[7] ?? "-";
  const parts = [label];

  const caseMap = {
    N: "nominative",
    V: "vocative",
    A: "accusative",
    G: "genitive",
    D: "dative"
  };
  const numberMap = {
    S: "singular",
    P: "plural"
  };
  const genderMap = {
    M: "masculine",
    F: "feminine",
    N: "neuter"
  };
  const degreeMap = {
    C: "comparative",
    S: "superlative"
  };

  if (caseMap[caseCode]) {
    parts.push(caseMap[caseCode]);
  }

  if (numberMap[numberCode]) {
    parts.push(numberMap[numberCode]);
  }

  if (genderMap[genderCode]) {
    parts.push(genderMap[genderCode]);
  }

  if (degreeMap[degreeCode]) {
    parts.push(degreeMap[degreeCode]);
  }

  return parts.join(" ");
}

function decodeVerbMorphology(morphology) {
  const parse = cleanGreekField(morphology);
  const parts = ["verb"];
  const tenseMap = {
    P: "present",
    I: "imperfect",
    F: "future",
    A: "aorist",
    X: "perfect",
    Y: "pluperfect",
    R: "perfect"
  };
  const voiceMap = {
    A: "active",
    M: "middle",
    P: "passive",
    E: "middle or passive",
    D: "middle deponent",
    O: "passive deponent",
    N: "middle or passive deponent",
    Q: "impersonal active"
  };
  const moodMap = {
    I: "indicative",
    S: "subjunctive",
    O: "optative",
    M: "imperative",
    N: "infinitive",
    P: "participle"
  };
  const personMap = {
    1: "first person",
    2: "second person",
    3: "third person"
  };
  const numberMap = {
    S: "singular",
    P: "plural"
  };
  const caseMap = {
    N: "nominative",
    V: "vocative",
    A: "accusative",
    G: "genitive",
    D: "dative"
  };
  const genderMap = {
    M: "masculine",
    F: "feminine",
    N: "neuter"
  };

  if (tenseMap[parse[1]]) {
    parts.push(tenseMap[parse[1]]);
  }

  if (voiceMap[parse[2]]) {
    parts.push(voiceMap[parse[2]]);
  }

  if (moodMap[parse[3]]) {
    parts.push(moodMap[parse[3]]);
  }

  if (parse[3] === "P") {
    if (caseMap[parse[4]]) {
      parts.push(caseMap[parse[4]]);
    }

    if (numberMap[parse[5]]) {
      parts.push(numberMap[parse[5]]);
    }

    if (genderMap[parse[6]]) {
      parts.push(genderMap[parse[6]]);
    }
  } else {
    if (personMap[parse[0]]) {
      parts.push(personMap[parse[0]]);
    }

    if (numberMap[parse[5]]) {
      parts.push(numberMap[parse[5]]);
    }
  }

  return parts.join(" ");
}

function decodeGreekMorphology(partOfSpeech, morphology) {
  const prefix = cleanGreekField(partOfSpeech);

  if (prefix === "V-") {
    return decodeVerbMorphology(morphology);
  }

  if (prefix === "N-") {
    return decodeNominalMorphology("noun", morphology);
  }

  if (prefix === "A-") {
    return decodeNominalMorphology("adjective", morphology);
  }

  if (prefix === "RA") {
    return decodeNominalMorphology("article", morphology);
  }

  if (["RP", "RR", "RD", "RI"].includes(prefix)) {
    const pronounTypeMap = {
      RP: "pronoun",
      RR: "relative pronoun",
      RD: "demonstrative pronoun",
      RI: "interrogative pronoun"
    };

    return decodeNominalMorphology(pronounTypeMap[prefix], morphology);
  }

  const simpleMap = {
    "P-": "preposition",
    "C-": "conjunction",
    "D-": "adverb",
    "X-": "particle",
    "I-": "interjection"
  };

  return simpleMap[prefix] ?? "word";
}

function buildShortDefinition(entry) {
  const candidates = [
    entry?.bdagArticles?.[0]?.summary?.plainMeaning,
    entry?.outlineUsage,
    entry?.definition
  ]
    .map((value) => cleanGreekField(value ?? ""))
    .filter(Boolean);

  if (candidates.length === 0) {
    return "";
  }

  const candidate = candidates[0]
    .replace(/^usually means\s+/i, "")
    .replace(/^of speech,\s*/i, "")
    .replace(/\s+/g, " ");

  return candidate.split(/[.;]/)[0]?.trim() ?? candidate;
}

function buildLongDefinition(entry) {
  const parts = [entry?.definition, entry?.outlineUsage]
    .map((value) => cleanGreekField(value ?? ""))
    .filter(Boolean);

  if (parts.length === 0) {
    return undefined;
  }

  return [...new Set(parts)].join("\n\n");
}

async function loadYamlFile(filePath) {
  const rubyScript = [
    "require 'yaml'",
    "require 'json'",
    "puts JSON.dump(YAML.load_file(ARGV[0]))"
  ].join(";");
  const { stdout } = await execFile("ruby", ["-e", rubyScript, filePath], {
    maxBuffer: 1024 * 1024 * 32
  });

  return JSON.parse(stdout);
}

function buildLexemeMappings(lexemePayload) {
  const exactMap = new Map();
  const normalizedMap = new Map();

  for (const [lemma, details] of Object.entries(lexemePayload ?? {})) {
    const strongsNumber = Number(details?.strongs);

    if (!Number.isFinite(strongsNumber) || strongsNumber < 1) {
      continue;
    }

    const strongs = `G${strongsNumber}`;
    exactMap.set(cleanGreekField(lemma), strongs);

    const normalizedLemma = normalizeGreekLookupValue(lemma);

    if (normalizedLemma && !normalizedMap.has(normalizedLemma)) {
      normalizedMap.set(normalizedLemma, strongs);
    }
  }

  return {
    exactMap,
    normalizedMap
  };
}

function resolveStrongsForLemma(lemma, lexemeMappings) {
  const exactLemma = cleanGreekField(lemma);

  if (lexemeMappings.exactMap.has(exactLemma)) {
    return lexemeMappings.exactMap.get(exactLemma);
  }

  return lexemeMappings.normalizedMap.get(normalizeGreekLookupValue(exactLemma)) ?? null;
}

async function loadJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getReferenceKey(chapterNumber, verseNumber) {
  return `${chapterNumber}:${verseNumber}`;
}

async function buildGreekArtifacts() {
  const [strongsLexicon, lexemePayload] = await Promise.all([
    loadJson(strongsLexiconPath),
    loadYamlFile(greekLexemeMappingsPath)
  ]);
  const lexemeMappings = buildLexemeMappings(lexemePayload);
  const lexiconByStrongs = {};
  const lemmaIndex = {};
  const formIndex = {};

  for (const [bookSlug, fileName] of Object.entries(SBLGNT_FILE_BY_SLUG)) {
    const interlinearPath = path.join(interlinearBaseDir, `${bookSlug}.json`);
    const interlinearPayload = await loadJson(interlinearPath);
    const lines = (await readFile(path.join(sblgntSourceDir, fileName), "utf8")).split(/\r?\n/);
    const tokensByReference = new Map();

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        continue;
      }

      const parts = line.split(/\s+/);

      if (parts.length < 7) {
        continue;
      }

      const reference = parts[0] ?? "";

      if (!/^\d{6}$/.test(reference)) {
        continue;
      }

      const chapterNumber = Number(reference.slice(2, 4));
      const verseNumber = Number(reference.slice(4, 6));
      const partOfSpeech = parts[1] ?? "";
      const morphology = parts[2] ?? "";
      const rawSurface = parts[3] ?? "";
      const rawLemma = parts.at(-1) ?? "";
      const strongs = resolveStrongsForLemma(rawLemma, lexemeMappings);

      if (!strongs) {
        continue;
      }

      const { surface, trailingPunctuation } = splitSurfaceAndPunctuation(rawSurface);

      if (!surface) {
        continue;
      }

      const strongsEntry = strongsLexicon[strongs] ?? null;
      const compactMorphology = compressMorphologyCode(partOfSpeech, morphology);
      const decodedMorphology = decodeGreekMorphology(partOfSpeech, morphology);
      const gloss = buildShortDefinition(strongsEntry);
      const referenceKey = getReferenceKey(chapterNumber, verseNumber);
      const tokens = tokensByReference.get(referenceKey) ?? [];

      tokens.push({
        surface,
        lemma: cleanGreekField(rawLemma),
        strongs,
        morphology: compactMorphology,
        decodedMorphology,
        gloss: gloss || undefined,
        trailingPunctuation: trailingPunctuation || undefined
      });
      tokensByReference.set(referenceKey, tokens);

      if (!lexiconByStrongs[strongs]) {
        lexiconByStrongs[strongs] = {
          lemma: cleanGreekField(rawLemma),
          strongs,
          transliteration: strongsEntry?.transliteration ?? "",
          pronunciation: undefined,
          shortDefinition: gloss,
          longDefinition: buildLongDefinition(strongsEntry),
          forms: []
        };
      }

      const entry = lexiconByStrongs[strongs];

      if (!entry.forms.some((form) => form.form === surface && form.morphology === compactMorphology)) {
        entry.forms.push({
          form: surface,
          morphology: compactMorphology,
          decodedMorphology,
          definition: gloss || undefined
        });
      }

      const normalizedLemma = normalizeGreekLookupValue(entry.lemma);

      if (normalizedLemma) {
        lemmaIndex[normalizedLemma] = Array.from(
          new Set([...(lemmaIndex[normalizedLemma] ?? []), strongs])
        );
      }

      const normalizedForm = normalizeGreekFormValue(surface);

      if (normalizedForm) {
        formIndex[normalizedForm] = Array.from(
          new Map(
            [
              ...(formIndex[normalizedForm] ?? []),
              {
                strongs,
                form: surface
              }
            ].map((form) => [`${form.strongs}:${form.form}`, form])
          ).values()
        );
      }
    }

    const nextInterlinearPayload = {
      ...interlinearPayload,
      chapters: interlinearPayload.chapters.map((chapter) => ({
        ...chapter,
        verses: chapter.verses.map((verse) => ({
          ...verse,
          tokens: tokensByReference.get(getReferenceKey(chapter.chapterNumber, verse.number)) ?? []
        }))
      }))
    };

    await writeFile(interlinearPath, `${JSON.stringify(nextInterlinearPayload, null, 2)}\n`);
  }

  await mkdir(greekDataDir, { recursive: true });
  await writeFile(
    path.join(greekDataDir, "lexicon.json"),
    `${JSON.stringify(lexiconByStrongs, null, 2)}\n`
  );
  await writeFile(
    path.join(greekDataDir, "lemma-index.json"),
    `${JSON.stringify(lemmaIndex, null, 2)}\n`
  );
  await writeFile(
    path.join(greekDataDir, "form-index.json"),
    `${JSON.stringify(formIndex, null, 2)}\n`
  );
}

buildGreekArtifacts().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
