import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const pdfPath = path.join(repoRoot, "PDF", "NA1.pdf");
const fathersDir = path.join(repoRoot, "data", "fathers");
const worksDir = path.join(fathersDir, "works");
const manifestPath = path.join(fathersDir, "manifest.json");

const GENERATED_WORKS = [
  {
    slug: "recognitions-of-clement",
    title: "The Recognitions of Clement",
    shortTitle: "Recognitions",
    author: "T. Flavius Clemens",
    order: 14,
    englishSource: "PDF/NA1.pdf (main text)",
    startMarker: /^Book I$/u,
    endMarker: /^APPENDIX A$/u
  },
  {
    slug: "preaching-of-peter",
    title: "The Preaching of Peter",
    shortTitle: "Preaching",
    author: "T. Flavius Clemens / Jackson H. Snyder",
    order: 15,
    englishSource: "PDF/NA1.pdf (Appendix A)",
    startMarker: /^APPENDIX A$/u,
    endMarker: /^APPENDIX B$/u
  },
  {
    slug: "ascents-of-james",
    title: "The Ascents of James",
    shortTitle: "Ascents",
    author: "T. Flavius Clemens / Jackson H. Snyder",
    order: 16,
    englishSource: "PDF/NA1.pdf (Appendix B)",
    startMarker: /^APPENDIX B$/u,
    endMarker: /^APPENDIX C$/u
  },
  {
    slug: "excerpts-from-clements-homilies",
    title: "Excerpts from Clement’s Homilies",
    shortTitle: "Homilies Excerpts",
    author: "T. Flavius Clemens / Jackson H. Snyder",
    order: 17,
    englishSource: "PDF/NA1.pdf (Appendix C)",
    startMarker: /^APPENDIX C$/u,
    endMarker: /^APPENDIX D$/u
  },
  {
    slug: "sinai-arabic-summary",
    title: "The Sinai (Arabic) Summary",
    shortTitle: "Sinai Summary",
    author: "Margaret Dunlop Gibson / T. Flavius Clemens",
    order: 18,
    englishSource: "PDF/NA1.pdf (Appendix D)",
    startMarker: /^APPENDIX D$/u,
    endMarker: /^APPENDIX E$/u
  }
];

async function extractPdfText(inputPdfPath) {
  try {
    await access(inputPdfPath);
  } catch {
    throw new Error(`Missing required PDF source: ${path.relative(repoRoot, inputPdfPath)}.`);
  }

  try {
    const { stdout } = await execFileAsync("pdftotext", [inputPdfPath, "-"], {
      maxBuffer: 64 * 1024 * 1024
    });

    return stdout;
  } catch (error) {
    throw new Error(
      `Failed to extract PDF text from ${path.relative(repoRoot, inputPdfPath)}: ${String(error)}`
    );
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanPdfLines(value) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\f/g, "").trim())
    .filter((line) => {
      if (!line) {
        return true;
      }

      if (/^\d+$/u.test(line)) {
        return false;
      }

      if (
        line === "From the Journal of T. Flavius Clemens" ||
        line === "The Nazarene Acts of the Apostles or The Recognitions of Clement" ||
        line === "[This page is intentionally left blank]"
      ) {
        return false;
      }

      return true;
    });
}

function findMarkerIndex(lines, marker, fromIndex = 0) {
  return lines.findIndex((line, index) => index >= fromIndex && marker.test(line));
}

function buildEnglishOnlySegment(workSlug, segmentId, ref, label, english) {
  return {
    id: `${workSlug}:${segmentId}`,
    ref,
    label,
    greek: "",
    english: normalizeWhitespace(english),
    greekNormalized: "",
    greekTokens: []
  };
}

function matchSectionHeading(line) {
  const chapterMatch = line.match(/^Chapter ([^:]+):\s*(.+)$/u);

  if (chapterMatch) {
    const [, chapterRef, chapterTitle] = chapterMatch;

    return {
      ref: `chapter-${chapterRef.toLowerCase().replace(/[^a-z0-9]+/gu, "-")}`,
      label: line
    };
  }

  const homilyMatch = line.match(/^Homilies ([IVXLCDM]+), Chapter ([^:]+):?\s*(.+)$/u);

  if (homilyMatch) {
    const [, homilyRef, chapterRef, chapterTitle] = homilyMatch;

    return {
      ref: `homilies-${homilyRef.toLowerCase()}-chapter-${chapterRef
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, "-")}`,
      label: `Homilies ${homilyRef}, Chapter ${chapterRef}: ${chapterTitle}`
    };
  }

  if (/^INTRODUCTION(?:\s*\[.+\])?$/u.test(line)) {
    return {
      ref: "introduction",
      label: line
    };
  }

  return null;
}

function stripInitialTocLines(work, lines) {
  const chapterHeadingPattern =
    work.slug === "excerpts-from-clements-homilies"
      ? /^Homilies [IVXLCDM]+, Chapter /u
      : /^Chapter [^:]+:/u;

  let tocStartIndex = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (chapterHeadingPattern.test(lines[index] ?? "")) {
      tocStartIndex = index;
      break;
    }
  }

  if (tocStartIndex === -1) {
    return lines;
  }

  const firstHeading = lines[tocStartIndex];
  const repeatedHeadingIndex = lines.findIndex(
    (line, index) => index > tocStartIndex && line === firstHeading
  );

  if (repeatedHeadingIndex !== -1) {
    return [...lines.slice(0, tocStartIndex), ...lines.slice(repeatedHeadingIndex)];
  }

  return lines;
}

function parseSectionLines(work, lines) {
  const segments = [];
  let currentBook = "";
  let currentHeading = null;
  let currentBodyLines = [];
  let introLines = [];
  let segmentCount = 0;

  const flushIntro = () => {
    const english = normalizeWhitespace(introLines.join(" "));

    if (!english) {
      return;
    }

    segments.push(
      buildEnglishOnlySegment(
        work.slug,
        "introduction",
        "introduction",
        "Introduction",
        english
      )
    );
    introLines = [];
  };

  const flushCurrentHeading = () => {
    if (!currentHeading) {
      return;
    }

    const english = normalizeWhitespace(currentBodyLines.join(" "));

    if (english) {
      segmentCount += 1;
      segments.push(
        buildEnglishOnlySegment(
          work.slug,
          `section-${segmentCount}`,
          `${currentBook ? `${currentBook.toLowerCase().replace(/\s+/g, "-")}:` : ""}${currentHeading.ref}`,
          currentHeading.label,
          english
        )
      );
    }

    currentHeading = null;
    currentBodyLines = [];
  };

  for (const line of lines) {
    if (!line) {
      if (currentHeading) {
        currentBodyLines.push("");
      } else if (introLines.length > 0) {
        introLines.push("");
      }
      continue;
    }

    if (/^APPENDIX [A-D]$/u.test(line)) {
      continue;
    }

    if (/^Book [IVXLCDM]+$/u.test(line)) {
      flushIntro();
      flushCurrentHeading();
      currentBook = line;
      continue;
    }

    if (
      work.slug === "sinai-arabic-summary" &&
      /^(?:-\s*)+In the name of/u.test(line) &&
      currentHeading?.ref === "introduction"
    ) {
      flushCurrentHeading();
      currentHeading = {
        ref: "summary",
        label: "Summary"
      };
      currentBodyLines.push(line);
      continue;
    }

    const heading = matchSectionHeading(line);

    if (heading) {
      flushIntro();
      flushCurrentHeading();
      currentHeading = {
        ref: heading.ref,
        label: currentBook ? `${currentBook} · ${heading.label}` : heading.label
      };
      continue;
    }

    if (!currentHeading) {
      introLines.push(line);
      continue;
    }

    currentBodyLines.push(line);
  }

  flushIntro();
  flushCurrentHeading();

  return segments;
}

function buildWorkPayload(work, allLines) {
  const startIndex = findMarkerIndex(allLines, work.startMarker);

  if (startIndex === -1) {
    throw new Error(`Could not find start marker for ${work.slug}.`);
  }

  const endIndex = work.endMarker
    ? findMarkerIndex(allLines, work.endMarker, startIndex + 1)
    : -1;

  const sectionLines = stripInitialTocLines(
    work,
    allLines.slice(startIndex, endIndex === -1 ? undefined : endIndex)
  );
  const segments = parseSectionLines(work, sectionLines);

  return {
    work: {
      slug: work.slug,
      title: work.title,
      shortTitle: work.shortTitle,
      author: work.author,
      order: work.order,
      corpus: "apostolic-fathers",
      sectionCount: segments.length,
      greekSource: "",
      englishSource: work.englishSource
    },
    segments
  };
}

async function main() {
  const [manifestFile, pdfText] = await Promise.all([
    readFile(manifestPath, "utf8"),
    extractPdfText(pdfPath)
  ]);

  const manifest = JSON.parse(manifestFile);
  const cleanedLines = cleanPdfLines(pdfText);
  const nextPayloads = GENERATED_WORKS.map((work) => buildWorkPayload(work, cleanedLines));
  const nextManifestEntries = nextPayloads.map((payload) => payload.work);
  const generatedSlugs = new Set(nextManifestEntries.map((entry) => entry.slug));

  const mergedManifest = [...manifest.filter((entry) => !generatedSlugs.has(entry.slug)), ...nextManifestEntries]
    .sort((left, right) => left.order - right.order);

  await mkdir(worksDir, { recursive: true });

  for (const payload of nextPayloads) {
    await writeFile(
      path.join(worksDir, `${payload.work.slug}.json`),
      `${JSON.stringify(payload, null, 2)}\n`
    );
  }

  await writeFile(manifestPath, `${JSON.stringify(mergedManifest, null, 2)}\n`);

  console.log(
    `Imported ${nextPayloads.length} NA1 Fathers works from ${path.relative(repoRoot, pdfPath)}.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
