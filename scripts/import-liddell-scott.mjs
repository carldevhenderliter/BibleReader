import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const greekLexiconPath = path.join(repoRoot, "data", "bible", "greek", "lexicon.json");
const outputPath = path.join(repoRoot, "data", "bible", "greek", "liddell-scott.json");
const defaultSourceUrl =
  "https://raw.githubusercontent.com/perseids-project/lsj-js/master/vendor/lsj.json";

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

function buildArticle(headword, rawEntry) {
  const entry = htmlToPlainText(rawEntry?.d ?? "");
  const greekVariants = uniqueValues([headword, ...(rawEntry?.m ?? []), ...(rawEntry?.g ?? [])]);
  const transliterations = uniqueValues(rawEntry?.l ?? []);

  return {
    headword,
    summary: buildSummary(entry),
    entry,
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
      greekVariants: bestArticle.greekVariants,
      transliterations: bestArticle.transliterations
    };
    matchedEntries += 1;
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(nextDictionary, null, 2)}\n`);

  console.log(
    `Generated ${path.relative(repoRoot, outputPath)} with ${matchedEntries} matched Greek dictionary entries.`
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
