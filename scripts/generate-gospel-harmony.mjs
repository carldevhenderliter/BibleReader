import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const versionsDir = path.join(repoRoot, "data", "bible", "versions", "esv", "books");
const sourcePath = path.join(repoRoot, "data", "study", "gospel-harmony", "esv-source.mjs");
const outputDir = path.join(repoRoot, "data", "study", "gospel-harmony");
const outputPath = path.join(outputDir, "esv-template.json");

const bookCache = new Map();

function buildReferenceId(reference) {
  const suffix =
    reference.verseNumber == null
      ? "chapter"
      : reference.endVerseNumber && reference.endVerseNumber > reference.verseNumber
        ? `${reference.verseNumber}-${reference.endVerseNumber}`
        : String(reference.verseNumber);

  return `${reference.version}:${reference.bookSlug}:${reference.chapterNumber}:${suffix}`;
}

function createReference({
  bookSlug,
  chapterNumber,
  verseNumber,
  endVerseNumber,
  label = ""
}) {
  const reference = {
    version: "esv",
    bookSlug,
    chapterNumber,
    verseNumber,
    endVerseNumber,
    label,
    sourceType: "manual"
  };

  return {
    id: buildReferenceId(reference),
    ...reference
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeComparisonText(text) {
  return text
    .toLowerCase()
    .replace(/[“”"'‘’()[\]{}.,;:!?—–-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function loadBookPayload(bookSlug) {
  if (bookCache.has(bookSlug)) {
    return bookCache.get(bookSlug);
  }

  const payload = JSON.parse(
    await readFile(path.join(versionsDir, `${bookSlug}.json`), "utf8")
  );
  bookCache.set(bookSlug, payload);
  return payload;
}

async function getPassageText(passage) {
  const payload = await loadBookPayload(passage.bookSlug);
  const chapter = payload.chapters.find(
    (entry) => entry.chapterNumber === passage.chapterNumber
  );

  if (!chapter) {
    throw new Error(
      `Missing chapter ${passage.bookSlug} ${passage.chapterNumber} for harmony generation`
    );
  }

  if (passage.verseNumber == null) {
    return chapter.verses.map((verse) => verse.text.trim()).join(" ").trim();
  }

  const endVerseNumber =
    passage.endVerseNumber && passage.endVerseNumber >= passage.verseNumber
      ? passage.endVerseNumber
      : passage.verseNumber;

  return chapter.verses
    .filter(
      (verse) => verse.number >= passage.verseNumber && verse.number <= endVerseNumber
    )
    .map((verse) => verse.text.trim())
    .join(" ")
    .trim();
}

async function buildLines(groups, eventSlug) {
  const lines = [];

  for (const [groupIndex, group] of groups.entries()) {
    if (group.kind === "teaching-break") {
      lines.push({
        id: `${eventSlug}:line-${groupIndex + 1}`,
        kind: "teaching-break",
        label: group.label ?? "",
        text: group.text ?? "",
        references: (group.passages ?? []).map((passage) =>
          createReference({
            bookSlug: passage.bookSlug,
            chapterNumber: passage.chapterNumber,
            verseNumber: passage.verseNumber,
            endVerseNumber: passage.endVerseNumber
          })
        )
      });
      continue;
    }

    const renderedPassages = await Promise.all(
      group.passages.map(async (passage) => ({
        ...passage,
        text: await getPassageText(passage),
        reference: createReference({
          bookSlug: passage.bookSlug,
          chapterNumber: passage.chapterNumber,
          verseNumber: passage.verseNumber,
          endVerseNumber: passage.endVerseNumber
        })
      }))
    );

    const distinctTexts = Array.from(
      new Set(renderedPassages.map((passage) => normalizeComparisonText(passage.text)))
    );

    if (renderedPassages.length > 1 && distinctTexts.length === 1) {
      const shortestPassage = [...renderedPassages].sort(
        (left, right) => left.text.length - right.text.length
      )[0];

      lines.push({
        id: `${eventSlug}:line-${groupIndex + 1}`,
        kind: "merged",
        label: group.label,
        text: shortestPassage?.text ?? "",
        references: renderedPassages.map((passage) => passage.reference)
      });
      continue;
    }

    renderedPassages.forEach((passage, passageIndex) => {
      const isUniqueLine = renderedPassages.length === 1;
      lines.push({
        id: `${eventSlug}:line-${groupIndex + 1}-${passageIndex + 1}`,
        kind: isUniqueLine ? "unique" : "difference",
        speaker: isUniqueLine ? undefined : passage.gospel,
        label: isUniqueLine ? `[Only in ${passage.gospel}]` : group.label,
        text: passage.text,
        references: [passage.reference]
      });
    });
  }

  return lines;
}

async function generateTemplate() {
  const sourceModule = await import(pathToFileURL(sourcePath).href);
  const source = sourceModule.default;

  const events = [];

  for (const [eventIndex, event] of source.events.entries()) {
    const eventSlug = slugify(event.title);
    const lines = await buildLines(event.groups, eventSlug);
    const references = Array.from(
      new Map(
        event.groups
          .flatMap((group) => group.passages ?? [])
          .map((passage) => {
            const reference = createReference({
              bookSlug: passage.bookSlug,
              chapterNumber: passage.chapterNumber,
              verseNumber: passage.verseNumber,
              endVerseNumber: passage.endVerseNumber
            });

            return [reference.id, reference];
          })
      ).values()
    );

    events.push({
      id: eventSlug,
      eventNumber: eventIndex + 1,
      title: event.title,
      timeline: event.timeline,
      chronologyNote: event.chronologyNote ?? undefined,
      references,
      lines
    });
  }

  return {
    title: source.title,
    sourceVersion: "esv",
    events
  };
}

async function main() {
  const template = await generateTemplate();
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(template, null, 2)}\n`);
  console.log(
    `Generated Gospel harmony template with ${template.events.length} events at ${path.relative(repoRoot, outputPath)}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
