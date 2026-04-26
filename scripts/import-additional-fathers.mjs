import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fathersDir = path.join(repoRoot, "data", "fathers");
const worksDir = path.join(fathersDir, "works");
const manifestPath = path.join(fathersDir, "manifest.json");

const SOURCE_BASE_URL = "https://www.newadvent.org/fathers/";

const TARGET_WORKS = [
  {
    slug: "justin-first-apology",
    title: "The First Apology",
    shortTitle: "1 Apol.",
    author: "Justin Martyr",
    order: 20,
    corpus: "church-fathers",
    compositionDate: "c. 155–157 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0126.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [{ path: "0126.htm", labelPrefix: "" }]
  },
  {
    slug: "justin-second-apology",
    title: "The Second Apology",
    shortTitle: "2 Apol.",
    author: "Justin Martyr",
    order: 21,
    corpus: "church-fathers",
    compositionDate: "c. 155–161 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0127.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [{ path: "0127.htm", labelPrefix: "" }]
  },
  {
    slug: "justin-dialogue-with-trypho",
    title: "Dialogue with Trypho",
    shortTitle: "Dial. Trypho",
    author: "Justin Martyr",
    order: 22,
    corpus: "church-fathers",
    compositionDate: "c. 155–160 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0128.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [
      { path: "01281.htm", labelPrefix: "" },
      { path: "01282.htm", labelPrefix: "" },
      { path: "01283.htm", labelPrefix: "" },
      { path: "01284.htm", labelPrefix: "" },
      { path: "01285.htm", labelPrefix: "" },
      { path: "01286.htm", labelPrefix: "" },
      { path: "01287.htm", labelPrefix: "" },
      { path: "01288.htm", labelPrefix: "" },
      { path: "01289.htm", labelPrefix: "" }
    ]
  },
  {
    slug: "athenagoras-plea-for-the-christians",
    title: "A Plea for the Christians",
    shortTitle: "Plea",
    author: "Athenagoras",
    order: 23,
    corpus: "church-fathers",
    compositionDate: "c. 176–177 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0205.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [{ path: "0205.htm", labelPrefix: "" }]
  },
  {
    slug: "athenagoras-on-the-resurrection",
    title: "On the Resurrection of the Dead",
    shortTitle: "Resurrection",
    author: "Athenagoras",
    order: 24,
    corpus: "church-fathers",
    compositionDate: "c. 177–180 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0206.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [{ path: "0206.htm", labelPrefix: "" }]
  },
  {
    slug: "theophilus-to-autolycus",
    title: "Theophilus to Autolycus",
    shortTitle: "Autol.",
    author: "Theophilus of Antioch",
    order: 25,
    corpus: "church-fathers",
    compositionDate: "c. 180–190 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0204.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    pages: [
      { path: "02041.htm", labelPrefix: "Book I" },
      { path: "02042.htm", labelPrefix: "Book II" },
      { path: "02043.htm", labelPrefix: "Book III" }
    ]
  },
  {
    slug: "irenaeus-against-heresies",
    title: "Against Heresies",
    shortTitle: "Haer.",
    author: "Irenaeus of Lyons",
    order: 26,
    corpus: "church-fathers",
    compositionDate: "c. 180–189 AD",
    fullTextUrl: `${SOURCE_BASE_URL}0103.htm`,
    fullTextSource: "New Advent, Roberts-Donaldson",
    authenticityStatus: "accepted",
    indexPath: "0103.htm"
  }
];

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const manifestWithoutTargets = manifest.filter(
    (entry) => !TARGET_WORKS.some((work) => work.slug === entry.slug)
  );

  await mkdir(worksDir, { recursive: true });

  for (const work of TARGET_WORKS) {
    const segments = await importEnglishOnlySegments(work);
    const payload = {
      work: {
        slug: work.slug,
        title: work.title,
        shortTitle: work.shortTitle,
        author: work.author,
        order: work.order,
        corpus: work.corpus,
        sectionCount: segments.length,
        greekSource: "",
        englishSource: work.fullTextUrl,
        compositionDate: work.compositionDate,
        fullTextUrl: work.fullTextUrl,
        fullTextSource: work.fullTextSource,
        authenticityStatus: work.authenticityStatus
      },
      segments
    };

    manifestWithoutTargets.push(payload.work);
    await writeFile(
      path.join(worksDir, `${work.slug}.json`),
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }

  manifestWithoutTargets.sort((left, right) => left.order - right.order);
  await writeFile(manifestPath, `${JSON.stringify(manifestWithoutTargets, null, 2)}\n`);
  console.log(`Imported ${TARGET_WORKS.length} additional Fathers works.`);
}

async function importEnglishOnlySegments(work) {
  const pages = work.pages ?? (await loadIndexPages(work.indexPath));
  const segments = [];

  for (const page of pages) {
    const response = await fetch(`${SOURCE_BASE_URL}${page.path}`, {
      headers: {
        "user-agent": "BibleReader Fathers Importer"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${page.path}: ${response.status}`);
    }

    const html = await response.text();
    segments.push(...parseNewAdventChapterSegments(work.slug, html, page.labelPrefix));
  }

  return segments;
}

async function loadIndexPages(indexPath) {
  if (!indexPath) {
    return [];
  }

  const response = await fetch(`${SOURCE_BASE_URL}${indexPath}`, {
    headers: {
      "user-agent": "BibleReader Fathers Importer"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${indexPath}: ${response.status}`);
  }

  const html = await response.text();
  const prefix = indexPath.replace(/\.htm$/i, "");
  const matches = Array.from(
    html.matchAll(new RegExp(`href="[^"]*?(${prefix}\\d+\\.htm)"`, "gi")),
    (match) => match[1]
  );
  const uniqueMatches = Array.from(new Set(matches));

  return uniqueMatches.map((path) => ({
    path,
    labelPrefix: ""
  }));
}

function parseNewAdventChapterSegments(workSlug, html, labelPrefix) {
  const contentMatch = html.match(/<body[\s\S]*?>([\s\S]*?)<\/body>/i);
  const content = contentMatch?.[1] ?? html;
  const entryPattern = /<h2[^>]*>([\s\S]*?)<\/h2>|<p[^>]*>([\s\S]*?)<\/p>/gi;
  const aboutPagePattern = /about this page/i;
  const segments = [];
  let currentSegment = null;

  for (const entry of content.matchAll(entryPattern)) {
    const headingHtml = entry[1];
    const paragraphHtml = entry[2];

    if (headingHtml) {
      const headingText = cleanText(headingHtml);

      if (!headingText || aboutPagePattern.test(headingText)) {
        break;
      }

      if (/^chapter\s+\d+/i.test(headingText)) {
        const chapterMatch = headingText.match(/^chapter\s+(\d+)\.?\s*(.*)$/i);

        if (!chapterMatch) {
          continue;
        }

        const [, chapterNumber, chapterTitle] = chapterMatch;
        const labelBase = chapterTitle ? `Chapter ${chapterNumber} · ${chapterTitle}` : `Chapter ${chapterNumber}`;
        const label = labelPrefix ? `${labelPrefix} · ${labelBase}` : labelBase;
        const ref = labelPrefix
          ? `${normalizeRef(labelPrefix)}:${chapterNumber}`
          : `chapter-${chapterNumber}`;

        currentSegment = {
          id: `${workSlug}:${ref}`,
          ref,
          label,
          greek: "",
          english: "",
          greekNormalized: "",
          greekTokens: []
        };
        segments.push(currentSegment);
        continue;
      }

      if (/^book\s+[ivxlcdm]+$/i.test(headingText)) {
        currentSegment = null;
      }

      continue;
    }

    if (!paragraphHtml || !currentSegment) {
      continue;
    }

    const paragraphText = cleanText(paragraphHtml);

    if (!paragraphText || aboutPagePattern.test(paragraphText)) {
      continue;
    }

    currentSegment.english = currentSegment.english
      ? `${currentSegment.english}\n\n${paragraphText}`
      : paragraphText;
  }

  if (segments.length === 0) {
    return parseNewAdventPageSegments(workSlug, content, labelPrefix);
  }

  return segments;
}

function parseNewAdventPageSegments(workSlug, content, labelPrefix) {
  const headingText = cleanText(content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");

  if (!headingText) {
    return [];
  }

  const label =
    headingText.match(/\(([^)]+)\)/)?.[1]?.trim() ||
    labelPrefix ||
    headingText;
  const ref = normalizeRef(label);
  const skipParagraphPattern =
    /please help support the mission of new advent|return to (the )?(home page|table of contents)|translated by|this document|contact information\. the editor of new advent|contact us \| advertise with new advent/i;
  const paragraphs = Array.from(
    content.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi),
    (match) => cleanText(match[1] ?? "")
  ).filter((paragraph) => paragraph && !skipParagraphPattern.test(paragraph));

  if (paragraphs.length === 0) {
    return [];
  }

  return [
    {
      id: `${workSlug}:${ref}`,
      ref,
      label,
      greek: "",
      english: paragraphs.join("\n\n"),
      greekNormalized: "",
      greekTokens: []
    }
  ];
}

function cleanText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .trim()
  );
}

function decodeHtmlEntities(text) {
  const namedEntities = {
    nbsp: " ",
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
    mdash: "—",
    ndash: "–",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    AElig: "Æ",
    aelig: "æ",
    OElig: "Œ",
    oelig: "œ",
    hellip: "…",
    copy: "©"
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (_match, entity) => {
    if (entity.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    }

    if (entity.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    }

    return namedEntities[entity] ?? "";
  });
}

function normalizeRef(labelPrefix) {
  return labelPrefix.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
