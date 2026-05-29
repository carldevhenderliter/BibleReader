import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const greekLexiconPath = path.join(repoRoot, "data", "bible", "greek", "lexicon.json");
const outputPath = path.join(repoRoot, "data", "bible", "greek", "liddell-scott.json");
const publicOutputPath = path.join(
  repoRoot,
  "public",
  "data",
  "bible",
  "greek",
  "liddell-scott.json"
);
const defaultSourceUrl =
  "https://raw.githubusercontent.com/perseids-project/lsj-js/master/vendor/lsj.json";
const ROMAN_SECTION_PATTERN = /(?:^|(?<=[\s;:—–]))(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+/g;
const NUMERIC_SECTION_PATTERN = /(?:^|(?<=[\s;:—–]))(\d{1,2})\.\s+/g;
const LETTER_SECTION_PATTERN = /(?:^|(?<=[\s;:—–]))([a-d])\.\s+/g;
const LSJ_CITATION_PATTERN =
  /\b(?:[A-Z][A-Za-z]{0,10}\.){1,3}[A-Za-z0-9][A-Za-z0-9-]*(?:\.[A-Za-z0-9][A-Za-z0-9-]*)+/g;

const AUTHOR_REFERENCE_MAP = {
  A: {
    authorName: "Aeschylus",
    works: {
      Ag: "Agamemnon",
      Ch: "Libation Bearers",
      Supp: "Suppliants"
    }
  },
  Arist: {
    authorName: "Aristotle",
    works: {
      APo: "Posterior Analytics",
      Ath: "Athenian Constitution",
      EN: "Nicomachean Ethics",
      HA: "History of Animals",
      Metaph: "Metaphysics",
      Pol: "Politics"
    }
  },
  Archim: {
    authorName: "Archimedes"
  },
  D: {
    authorName: "Demosthenes"
  },
  E: {
    authorName: "Euripides",
    works: {
      Hipp: "Hippolytus"
    }
  },
  Gal: {
    authorName: "Galen"
  },
  Hdt: {
    authorName: "Herodotus",
    defaultWorkName: "Histories"
  },
  Heraclit: {
    authorName: "Heraclitus"
  },
  Hp: {
    authorName: "Hippocrates"
  },
  Il: {
    authorName: "Homer",
    defaultWorkName: "Iliad"
  },
  Lys: {
    authorName: "Lysias"
  },
  Od: {
    authorName: "Homer",
    defaultWorkName: "Odyssey"
  },
  Pi: {
    authorName: "Pindar",
    works: {
      N: "Nemean Odes",
      O: "Olympian Odes",
      P: "Pythian Odes"
    }
  },
  Pl: {
    authorName: "Plato",
    works: {
      Ep: "Epistles",
      Grg: "Gorgias",
      Lg: "Laws",
      Men: "Meno",
      Plt: "Statesman",
      Prt: "Protagoras",
      R: "Republic",
      Tht: "Theaetetus",
      Ti: "Timaeus"
    }
  },
  Plb: {
    authorName: "Polybius",
    defaultWorkName: "Histories"
  },
  Plot: {
    authorName: "Plotinus"
  },
  S: {
    authorName: "Sophocles",
    works: {
      Aj: "Ajax",
      Ant: "Antigone",
      El: "Electra",
      OC: "Oedipus at Colonus",
      OT: "Oedipus Tyrannus",
      Ph: "Philoctetes"
    }
  },
  Th: {
    authorName: "Thucydides",
    defaultWorkName: "History of the Peloponnesian War"
  },
  X: {
    authorName: "Xenophon",
    works: {
      Ath: "Constitution of the Athenians",
      Cyn: "Cynegeticus"
    }
  },
  Xenoph: {
    authorName: "Xenophon"
  }
};

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function normalizeGreekLookupValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}a-z0-9\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAsciiLookupValue(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/[^\p{L}0-9\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"'
  };

  return String(value ?? "")
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 10)))
    .replace(/&#x([\da-f]+);/gi, (_, digits) => String.fromCodePoint(Number.parseInt(digits, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => namedEntities[name.toLowerCase()] ?? match);
}

function htmlToPlainText(value) {
  return decodeHtmlEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|section|article|ul|ol|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSummary(value) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  const firstSentence = normalized.match(/^.{1,280}?(?:[.;:](?=\s)|$)/u)?.[0]?.trim() ?? "";

  if (firstSentence.length >= 80) {
    return firstSentence;
  }

  return normalized.length <= 280 ? normalized : `${normalized.slice(0, 277).trimEnd()}...`;
}

function uniqueValues(values) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  );
}

function uniqueArticles(values) {
  const seen = new Set();

  return values.filter((value) => {
    const key = value?.headword ?? "";

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitBySectionPattern(text, pattern) {
  const matches = Array.from(text.matchAll(pattern));

  if (matches.length === 0) {
    return null;
  }

  return {
    leadingText: text.slice(0, matches[0].index ?? 0).trim(),
    sections: matches.map((match, index) => {
      const start = (match.index ?? 0) + match[0].length;
      const end = index + 1 < matches.length ? (matches[index + 1].index ?? text.length) : text.length;

      return {
        marker: match[1],
        text: text.slice(start, end).trim()
      };
    })
  };
}

function buildReference(rawCitation) {
  const tokens = rawCitation.split(".").filter(Boolean);

  if (tokens.length < 2) {
    return {
      rawCitation,
      authorName: null,
      workName: null,
      locator: null
    };
  }

  const authorToken = tokens[0];
  const authorInfo = AUTHOR_REFERENCE_MAP[authorToken] ?? null;
  const hasWorkToken = Boolean(
    authorInfo &&
      tokens[1] &&
      /[A-Za-z]/.test(tokens[1]) &&
      !/^\d/.test(tokens[1])
  );
  const locatorStartIndex = hasWorkToken ? 2 : 1;
  const locatorTokens = tokens.slice(locatorStartIndex);
  const workName =
    hasWorkToken && authorInfo
      ? authorInfo.works?.[tokens[1]] ?? null
      : authorInfo?.defaultWorkName ?? null;

  return {
    rawCitation,
    authorName: authorInfo?.authorName ?? null,
    workName,
    locator: locatorTokens.length > 0 ? locatorTokens.join(".") : null
  };
}

function extractReferences(text) {
  const seen = new Set();
  const references = [];

  for (const match of text.matchAll(LSJ_CITATION_PATTERN)) {
    const rawCitation = match[0].replace(/[),;:.\]]+$/g, "");

    if (!rawCitation || seen.has(rawCitation)) {
      continue;
    }

    seen.add(rawCitation);
    references.push(buildReference(rawCitation));
  }

  return references;
}

function buildSection(labelParts, text) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return [];
  }

  const label = labelParts.length > 0 ? labelParts.join(".") : "Opening";

  return [
    {
      label,
      text: normalizedText,
      references: extractReferences(normalizedText)
    }
  ];
}

function parseSectionBody(labelParts, text, nextPatterns) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return [];
  }

  for (const { pattern, remainingPatterns } of nextPatterns) {
    const split = splitBySectionPattern(normalizedText, pattern);

    if (!split) {
      continue;
    }

    return [
      ...buildSection(labelParts, split.leadingText),
      ...split.sections.flatMap((section) =>
        parseSectionBody([...labelParts, section.marker], section.text, remainingPatterns)
      )
    ];
  }

  return buildSection(labelParts, normalizedText);
}

function parseTopLevelSections(text) {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText) {
    return [];
  }

  const romanSplit = splitBySectionPattern(normalizedText, ROMAN_SECTION_PATTERN);

  if (romanSplit) {
    return [
      ...parseTopLevelSections(romanSplit.leadingText),
      ...romanSplit.sections.flatMap((section) =>
        parseSectionBody(
          [section.marker],
          section.text,
          [
            {
              pattern: NUMERIC_SECTION_PATTERN,
              remainingPatterns: [
                {
                  pattern: LETTER_SECTION_PATTERN,
                  remainingPatterns: []
                }
              ]
            },
            {
              pattern: LETTER_SECTION_PATTERN,
              remainingPatterns: []
            }
          ]
        )
      )
    ];
  }

  const numericSplit = splitBySectionPattern(normalizedText, NUMERIC_SECTION_PATTERN);

  if (numericSplit) {
    return [
      ...buildSection([], numericSplit.leadingText),
      ...numericSplit.sections.flatMap((section) =>
        parseSectionBody(
          [section.marker],
          section.text,
          [
            {
              pattern: LETTER_SECTION_PATTERN,
              remainingPatterns: []
            }
          ]
        )
      )
    ];
  }

  const letterSplit = splitBySectionPattern(normalizedText, LETTER_SECTION_PATTERN);

  if (letterSplit) {
    return [
      ...buildSection([], letterSplit.leadingText),
      ...letterSplit.sections.flatMap((section) => buildSection([section.marker], section.text))
    ];
  }

  return [];
}

function buildSections(entry) {
  return parseTopLevelSections(entry).map((section, index) => ({
    id: `lsj:${section.label}:${index + 1}`,
    label: section.label,
    text: section.text,
    references: section.references
  }));
}

function buildArticle(headword, rawEntry) {
  const entry = htmlToPlainText(rawEntry?.d ?? "");
  const greekVariants = uniqueValues([headword, ...(rawEntry?.m ?? []), ...(rawEntry?.g ?? [])]);
  const transliterations = uniqueValues(rawEntry?.l ?? []);

  return {
    headword,
    summary: buildSummary(entry),
    entry,
    sections: buildSections(entry),
    greekVariants,
    transliterations,
    normalizedHeadword: normalizeGreekLookupValue(headword),
    normalizedGreekVariants: uniqueValues(greekVariants.map(normalizeGreekLookupValue)),
    normalizedTransliterations: uniqueValues(transliterations.map(normalizeAsciiLookupValue))
  };
}

function getCandidateScore(article, lemma, transliteration) {
  if (article.normalizedHeadword && article.normalizedHeadword === lemma) {
    return 0;
  }

  if (article.normalizedGreekVariants.includes(lemma)) {
    return 1;
  }

  if (transliteration && article.normalizedTransliterations.includes(transliteration)) {
    return 2;
  }

  return 3;
}

async function loadLsjSource() {
  const sourceFile = getArgValue("--source-file");

  if (sourceFile) {
    return JSON.parse(await readFile(path.resolve(sourceFile), "utf8"));
  }

  const sourceUrl = getArgValue("--source-url") ?? defaultSourceUrl;
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Unable to download LSJ source: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const [greekLexicon, lsjSource] = await Promise.all([
    readFile(greekLexiconPath, "utf8").then((value) => JSON.parse(value)),
    loadLsjSource()
  ]);
  const articles = Object.entries(lsjSource).map(([headword, rawEntry]) => buildArticle(headword, rawEntry));
  const greekIndex = new Map();
  const transliterationIndex = new Map();

  for (const article of articles) {
    for (const key of article.normalizedGreekVariants) {
      if (!key) {
        continue;
      }

      greekIndex.set(key, [...(greekIndex.get(key) ?? []), article]);
    }

    for (const key of article.normalizedTransliterations) {
      if (!key) {
        continue;
      }

      transliterationIndex.set(key, [...(transliterationIndex.get(key) ?? []), article]);
    }
  }

  const nextDictionary = {};
  let matchedEntries = 0;

  for (const [entryKey, entry] of Object.entries(greekLexicon)) {
    const normalizedLemma = normalizeGreekLookupValue(entry.lemma ?? "");
    const normalizedTransliteration = normalizeAsciiLookupValue(entry.transliteration ?? "");
    const candidates = uniqueArticles([
      ...(greekIndex.get(normalizedLemma) ?? []),
      ...(normalizedTransliteration ? transliterationIndex.get(normalizedTransliteration) ?? [] : [])
    ]);

    if (candidates.length === 0) {
      continue;
    }

    const bestArticle = [...candidates]
      .sort((left, right) => {
        const leftScore = getCandidateScore(left, normalizedLemma, normalizedTransliteration);
        const rightScore = getCandidateScore(right, normalizedLemma, normalizedTransliteration);

        if (leftScore !== rightScore) {
          return leftScore - rightScore;
        }

        return left.entry.length - right.entry.length;
      })[0];

    if (!bestArticle?.entry) {
      continue;
    }

    nextDictionary[entryKey] = {
      headword: bestArticle.headword,
      summary: bestArticle.summary,
      entry: bestArticle.entry,
      sections: bestArticle.sections,
      greekVariants: bestArticle.greekVariants,
      transliterations: bestArticle.transliterations
    };
    matchedEntries += 1;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await mkdir(path.dirname(publicOutputPath), { recursive: true });

  const serializedDictionary = `${JSON.stringify(nextDictionary, null, 2)}\n`;

  await writeFile(outputPath, serializedDictionary);
  await writeFile(publicOutputPath, serializedDictionary);

  console.log(
    `Generated ${path.relative(repoRoot, outputPath)} with ${matchedEntries} matched Greek dictionary entries.`
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
