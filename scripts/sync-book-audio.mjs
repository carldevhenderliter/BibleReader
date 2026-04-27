import { copyFile, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(repoRoot, "Audio_Files");
const outputDir = path.join(repoRoot, "public", "book-audio");
const manifestPath = path.join(repoRoot, "data", "source", "book-audio-manifest.json");

const AUDIO_EXTENSIONS = new Set([".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"]);

function normalizeBookSlug(filename) {
  let stem = filename;

  while (path.extname(stem)) {
    stem = stem.slice(0, -path.extname(stem).length);
  }

  return stem
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

async function main() {
  await mkdir(path.dirname(manifestPath), { recursive: true });

  try {
    await readdir(sourceDir);
  } catch {
    await rm(outputDir, { recursive: true, force: true });
    await writeFile(manifestPath, "{}\n", "utf8");
    return;
  }

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const manifest = {};

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (!AUDIO_EXTENSIONS.has(extension)) {
      continue;
    }

    const bookSlug = normalizeBookSlug(entry.name);

    if (!bookSlug || manifest[bookSlug]) {
      continue;
    }

    const outputFilename = `${bookSlug}${extension}`;
    await copyFile(path.join(sourceDir, entry.name), path.join(outputDir, outputFilename));
    manifest[bookSlug] = {
      bookSlug,
      sourceFilename: entry.name,
      src: `/book-audio/${outputFilename}`
    };
  }

  await writeFile(`${manifestPath}`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
