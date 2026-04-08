import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fathersDir = path.join(repoRoot, "data", "fathers");
const worksDir = path.join(fathersDir, "works");

const DEFAULT_GREEK_SOURCE_DIR = "/tmp/apostolic-fathers";
const LIGHTFOOT_BASE_URL = "https://www.ccel.org/ccel/lightfoot/";

const TARGET_WORKS = [
  {
    slug: "1-clement",
    title: "1 Clement",
    shortTitle: "1 Clem.",
    author: "Clement of Rome",
    order: 1,
    sourceStem: "001-i_clement",
    englishPath: "fathers.ii.i.html"
  },
  {
    slug: "2-clement",
    title: "2 Clement",
    shortTitle: "2 Clem.",
    author: "Pseudo-Clement",
    order: 2,
    sourceStem: "002-ii_clement",
    englishPath: "fathers.ii.ii.html"
  },
  {
    slug: "ignatius-ephesians",
    title: "Ignatius to the Ephesians",
    shortTitle: "Ign. Eph.",
    author: "Ignatius of Antioch",
    order: 3,
    sourceStem: "003-ignatius-ephesians",
    englishPath: "fathers.ii.iii.html"
  },
  {
    slug: "ignatius-magnesians",
    title: "Ignatius to the Magnesians",
    shortTitle: "Ign. Mag.",
    author: "Ignatius of Antioch",
    order: 4,
    sourceStem: "004-ignatius-magnesians",
    englishPath: "fathers.ii.iv.html"
  },
  {
    slug: "ignatius-trallians",
    title: "Ignatius to the Trallians",
    shortTitle: "Ign. Trall.",
    author: "Ignatius of Antioch",
    order: 5,
    sourceStem: "005-ignatius-trallians",
    englishPath: "fathers.ii.v.html"
  },
  {
    slug: "ignatius-romans",
    title: "Ignatius to the Romans",
    shortTitle: "Ign. Rom.",
    author: "Ignatius of Antioch",
    order: 6,
    sourceStem: "006-ignatius-romans",
    englishPath: "fathers.ii.vi.html"
  },
  {
    slug: "ignatius-philadelphians",
    title: "Ignatius to the Philadelphians",
    shortTitle: "Ign. Philad.",
    author: "Ignatius of Antioch",
    order: 7,
    sourceStem: "007-ignatius-philadelphians",
    englishPath: "fathers.ii.vii.html"
  },
  {
    slug: "ignatius-smyrnaeans",
    title: "Ignatius to the Smyrnaeans",
    shortTitle: "Ign. Smyrn.",
    author: "Ignatius of Antioch",
    order: 8,
    sourceStem: "008-ignatius-smyrnaeans",
    englishPath: "fathers.ii.viii.html"
  },
  {
    slug: "ignatius-polycarp",
    title: "Ignatius to Polycarp",
    shortTitle: "Ign. Pol.",
    author: "Ignatius of Antioch",
    order: 9,
    sourceStem: "009-ignatius-polycarp",
    englishPath: "fathers.ii.ix.html"
  },
  {
    slug: "polycarp-to-philippians",
    title: "Polycarp to the Philippians",
    shortTitle: "Pol. Phil.",
    author: "Polycarp of Smyrna",
    order: 10,
    sourceStem: "010-polycarp-philippians",
    englishPath: "fathers.ii.x.html"
  },
  {
    slug: "didache",
    title: "Didache",
    shortTitle: "Did.",
    author: "Anonymous",
    order: 11,
    sourceStem: "011-didache",
    englishPath: "fathers.ii.xii.html"
  },
  {
    slug: "barnabas",
    title: "Barnabas",
    shortTitle: "Barn.",
    author: "Pseudo-Barnabas",
    order: 12,
    sourceStem: "012-barnabas",
    englishPath: "fathers.ii.xiii.html"
  },
  {
    slug: "shepherd-of-hermas",
    title: "Shepherd of Hermas",
    shortTitle: "Herm.",
    author: "Hermas",
    order: 13,
    sourceStem: "013-shepherd",
    englishPath: "fathers.ii.xiv.html"
  }
];

async function main() {
  const greekSourceDir = getArgValue("--apostolic-fathers-source") ?? DEFAULT_GREEK_SOURCE_DIR;

  await access(path.join(greekSourceDir, "texts"));
  await mkdir(worksDir, { recursive: true });
  await rm(worksDir, { recursive: true, force: true });
  await mkdir(worksDir, { recursive: true });

  const manifest = [];

  for (const work of TARGET_WORKS) {
    const greekSegments = await loadGreekSegments(work, greekSourceDir);
    const englishSegments = await loadEnglishSegments(work);
    const segments = mergeSegments(work, greekSegments, englishSegments);
    const payload = {
      work: {
        slug: work.slug,
        title: work.title,
        shortTitle: work.shortTitle,
        author: work.author,
        order: work.order,
        corpus: "apostolic-fathers",
        sectionCount: segments.length,
        greekSource: `jtauber/apostolic-fathers:texts/${work.sourceStem}.txt`,
        englishSource: `${LIGHTFOOT_BASE_URL}${work.englishPath}`
      },
      segments
    };

    manifest.push(payload.work);
    await writeFile(
      path.join(worksDir, `${work.slug}.json`),
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }

  await writeFile(path.join(fathersDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Imported ${manifest.length} Fathers works into ${path.relative(repoRoot, fathersDir)}.`);
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return null;
  }

  const value = process.argv[index + 1];

  return value && !value.startsWith("--") ? value : null;
}

async function loadGreekSegments(work, greekSourceDir) {
  const file = await readFile(path.join(greekSourceDir, "texts", `${work.sourceStem}.txt`), "utf8");
  const lines = file
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (work.slug === "shepherd-of-hermas") {
    return parseHermasGreekSegments(lines, work);
  }

  /** @type {Array<{ ref: string, label: string, greek: string }>} */
  const segments = [];
  const segmentByRef = new Map();

  for (const line of lines) {
    const match = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/u);

    if (!match) {
      continue;
    }

    const [, verseRef, text] = match;
    const [chapterRef] = verseRef.split(".");
    const ref = chapterRef === "0" ? "prologue" : chapterRef;
    const label = chapterRef === "0" ? "Prologue" : chapterRef;
    const existing = segmentByRef.get(ref);

    if (existing) {
      existing.greek = `${existing.greek} ${text}`.trim();
      continue;
    }

    const segment = { ref, label, greek: text.trim() };
    segmentByRef.set(ref, segment);
    segments.push(segment);
  }

  return segments;
}

function parseHermasGreekSegments(lines) {
  /** @type {Array<{ ref: string, label: string, greek: string }>} */
  const segments = [];
  let currentSegment = null;
  let visionCount = 0;
  let revelationCount = 0;
  let mandateCount = 0;
  let parableCount = 0;

  for (const line of lines) {
    const match = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/u);

    if (!match) {
      continue;
    }

    const [, verseRef, text] = match;

    if (/^\d+\.0\.0$/.test(verseRef)) {
      const normalizedHeading = normalizeGreekText(text);

      if (normalizedHeading.includes("ορασι")) {
        visionCount += 1;
        currentSegment = { ref: `vision-${visionCount}`, label: `Vision ${visionCount}`, greek: "" };
      } else if (normalizedHeading.includes("αποκαλυψ")) {
        revelationCount += 1;
        currentSegment = {
          ref: `revelation-${visionCount + revelationCount}`,
          label: `Revelation ${visionCount + revelationCount}`,
          greek: ""
        };
      } else if (normalizedHeading.includes("εντολη")) {
        mandateCount += 1;
        currentSegment = {
          ref: `mandate-${mandateCount}`,
          label: `Mandate ${mandateCount}`,
          greek: ""
        };
      } else if (normalizedHeading.includes("παραβολ") || /similitudo/i.test(text)) {
        parableCount += 1;
        currentSegment = {
          ref: `parable-${parableCount}`,
          label: `Parable ${parableCount}`,
          greek: ""
        };
      } else {
        currentSegment = null;
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }

      continue;
    }

    if (!currentSegment) {
      continue;
    }

    currentSegment.greek = `${currentSegment.greek} ${text}`.trim();
  }

  return segments;
}

async function loadEnglishSegments(work) {
  const response = await fetch(`${LIGHTFOOT_BASE_URL}${work.englishPath}`, {
    headers: {
      "user-agent": "BibleReader Fathers Importer"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to download English source for ${work.slug}: ${response.status}`);
  }

  const html = await response.text();
  const contentMatch = html.match(
    /<div xmlns="http:\/\/www\.w3\.org\/1999\/xhtml" class="book-content">([\s\S]*?)<\/div> <table xmlns="http:\/\/www\.w3\.org\/1999\/xhtml" class="book_navbar" id="book_navbar_bottom">/
  );

  if (!contentMatch) {
    throw new Error(`Unable to locate main content for ${work.slug}`);
  }

  const content = contentMatch[1];
  const entryPattern = /<h2[^>]*>([\s\S]*?)<\/h2>|<p[^>]*>([\s\S]*?)<\/p>/g;
  const segments = new Map();
  let currentRef = null;
  let hermasParableCount = 1;

  for (const entry of content.matchAll(entryPattern)) {
    const headingHtml = entry[1];
    const paragraphHtml = entry[2];

    if (headingHtml) {
      const heading = normalizeWhitespace(stripHtml(headingHtml));
      const ref = getEnglishRef(work, heading, {
        nextHermasParableRef() {
          hermasParableCount += 1;
          return `parable-${hermasParableCount}`;
        }
      });

      if (ref) {
        currentRef = ref;

        if (!segments.has(ref)) {
          segments.set(ref, []);
        }
      }

      continue;
    }

    if (!paragraphHtml || !currentRef) {
      continue;
    }

    const paragraph = normalizeWhitespace(stripHtml(paragraphHtml));

    if (!paragraph) {
      continue;
    }

    segments.get(currentRef).push(paragraph);
  }

  return new Map(
    [...segments.entries()].map(([ref, paragraphs]) => [ref, normalizeWhitespace(paragraphs.join(" "))])
  );
}

function getEnglishRef(work, heading, helpers = {}) {
  if (work.slug === "shepherd-of-hermas") {
    const hermasMatch = heading.match(/^(Vision|Mandate|Parable|Revelation)\s+(\d+)$/i);

    if (hermasMatch) {
      return `${hermasMatch[1].toLowerCase()}-${hermasMatch[2]}`;
    }

    if (/^Parables Which He Spake With Me$/i.test(heading)) {
      return "parable-1";
    }

    if (/^Another Parable$/i.test(heading)) {
      return helpers.nextHermasParableRef ? helpers.nextHermasParableRef() : null;
    }

    return null;
  }

  if (/prologue/i.test(heading)) {
    return "prologue";
  }

  const chapterMatch = heading.match(/(\d+)\s*$/);

  return chapterMatch ? chapterMatch[1] : null;
}

function stripHtml(value) {
  return decodeHtml(
    value
      .replace(/<span class="mnote"[\s\S]*?<\/span>/g, "")
      .replace(/<sup[\s\S]*?<\/sup>/g, "")
      .replace(/<br\s*\/?>/g, " ")
      .replace(/<[^>]+>/g, " ")
  );
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&lsquo;/g, "‘")
    .replace(/&rsquo;/g, "’")
    .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16))
    );
}

function normalizeGreekText(value) {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase()
    .replace(/[^\p{Script=Greek}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function mergeSegments(work, greekSegments, englishSegments) {
  const unmatchedEnglish = new Set(englishSegments.keys());

  const segments = greekSegments.flatMap((segment) => {
    const english = englishSegments.get(segment.ref);

    if (!english) {
      if (segment.ref === "prologue" && segment.greek.split(/\s+/).length <= 12) {
        return [];
      }

      throw new Error(`Missing English segment ${segment.ref} for ${work.slug}`);
    }

    unmatchedEnglish.delete(segment.ref);

    return [
      {
        id: `${work.slug}:${segment.ref}`,
        ref: segment.ref,
        label: segment.label,
        greek: normalizeWhitespace(segment.greek),
        english,
        greekNormalized: normalizeGreekText(segment.greek),
        greekTokens: normalizeGreekText(segment.greek).split(" ").filter(Boolean)
      }
    ];
  });

  if (unmatchedEnglish.size > 0) {
    console.warn(
      `Unused English sections for ${work.slug}: ${[...unmatchedEnglish].sort().join(", ")}`
    );
  }

  return segments;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
