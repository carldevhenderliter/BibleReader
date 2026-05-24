import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptsDir = path.join(repoRoot, "scripts");
const greekDataDir = path.join(repoRoot, "data", "bible", "greek");
const defaultImportDir = path.join(greekDataDir, "form-translation-imports");
const overridesPath = path.join(greekDataDir, "form-translation-overrides.json");
const greekBooksDir = path.join(repoRoot, "data", "bible", "versions", "greek", "books");
const esvInterlinearDir = path.join(repoRoot, "data", "bible", "interlinear", "esv", "base");
const buildScriptPath = path.join(scriptsDir, "build-greek-form-translations.mjs");

const EXPORT_SCHEMA = "bible-reader.greek-gloss-export";
const EXPORT_VERSION = 1;

async function loadJson(filePath, fallback = null) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
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

function sanitizeGloss(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeTokenGlossOverrides(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((normalized, [occurrenceKey, candidate]) => {
    if (!candidate || typeof candidate !== "object") {
      return normalized;
    }

    if (
      typeof candidate.occurrenceKey !== "string" ||
      typeof candidate.lemma !== "string" ||
      typeof candidate.selectedGloss !== "string" ||
      (candidate.source !== "lemma-option" && candidate.source !== "custom")
    ) {
      return normalized;
    }

    normalized[occurrenceKey] = {
      occurrenceKey: candidate.occurrenceKey,
      entryKey: typeof candidate.entryKey === "string" ? candidate.entryKey : undefined,
      strongs: typeof candidate.strongs === "string" ? candidate.strongs : undefined,
      lemma: candidate.lemma,
      selectedGloss: candidate.selectedGloss,
      optionId: typeof candidate.optionId === "string" ? candidate.optionId : undefined,
      source: candidate.source
    };

    return normalized;
  }, {});
}

function normalizeLemmaDefaults(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((normalized, [lookupKey, candidate]) => {
    if (!candidate || typeof candidate !== "object") {
      return normalized;
    }

    if (
      typeof candidate.lemma !== "string" ||
      typeof candidate.selectedGloss !== "string" ||
      (candidate.source !== "lemma-option" && candidate.source !== "custom")
    ) {
      return normalized;
    }

    normalized[lookupKey] = {
      entryKey: typeof candidate.entryKey === "string" ? candidate.entryKey : undefined,
      strongs: typeof candidate.strongs === "string" ? candidate.strongs : undefined,
      lemma: candidate.lemma,
      selectedGloss: candidate.selectedGloss,
      optionId: typeof candidate.optionId === "string" ? candidate.optionId : undefined,
      source: candidate.source
    };

    return normalized;
  }, {});
}

function normalizeExportPayload(value, filePath) {
  if (!value || typeof value !== "object") {
    throw new Error(`${filePath} is not a JSON object.`);
  }

  if (value.schema !== EXPORT_SCHEMA || value.version !== EXPORT_VERSION) {
    throw new Error(
      `${filePath} is not a supported Greek gloss export. Expected ${EXPORT_SCHEMA} v${EXPORT_VERSION}.`
    );
  }

  return {
    overrides: normalizeTokenGlossOverrides(value.overrides),
    lemmaDefaults: normalizeLemmaDefaults(value.lemmaDefaults)
  };
}

function parseOccurrenceKey(occurrenceKey) {
  const parts = String(occurrenceKey ?? "").split(":");
  const offset = parts.length === 5 && parts[0] === "greek" ? 1 : 0;

  if (parts.length - offset !== 4) {
    return null;
  }

  const bookSlug = parts[offset];
  const chapterNumber = Number(parts[offset + 1]);
  const verseNumber = Number(parts[offset + 2]);
  const tokenIndex = Number(parts[offset + 3]);

  if (
    !bookSlug ||
    !Number.isInteger(chapterNumber) ||
    !Number.isInteger(verseNumber) ||
    !Number.isInteger(tokenIndex)
  ) {
    return null;
  }

  return {
    bookSlug,
    chapterNumber,
    verseNumber,
    tokenIndex
  };
}

function getFormOverrideKey(entryKey, token) {
  return [
    entryKey,
    normalizeGreekFormLookupValue(token.surface),
    String(token.morphology ?? "").trim()
  ].join("|");
}

async function getDefaultImportPaths() {
  if (!(await pathExists(defaultImportDir))) {
    return [];
  }

  const entries = await readdir(defaultImportDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(defaultImportDir, entry.name))
    .sort();
}

async function loadBookPayload(bookSlug, cache) {
  if (cache.has(bookSlug)) {
    return cache.get(bookSlug);
  }

  const candidates = [
    path.join(greekBooksDir, `${bookSlug}.json`),
    path.join(esvInterlinearDir, `${bookSlug}.json`)
  ];

  for (const candidatePath of candidates) {
    const payload = await loadJson(candidatePath, null);

    if (payload?.chapters) {
      cache.set(bookSlug, payload);
      return payload;
    }
  }

  cache.set(bookSlug, null);
  return null;
}

function getTokenFromPayload(payload, location) {
  const chapter = payload?.chapters?.find(
    (candidate) => candidate.chapterNumber === location.chapterNumber
  );
  const verse = chapter?.verses?.find((candidate) => candidate.number === location.verseNumber);
  const tokens = verse?.greekTokens ?? verse?.tokens ?? [];

  return Array.isArray(tokens) ? tokens[location.tokenIndex] ?? null : null;
}

async function importExportFile(filePath, currentOverrides, bookCache) {
  const rawPayload = await loadJson(filePath, null);

  if (rawPayload == null) {
    throw new Error(`${filePath} was not found or could not be read.`);
  }

  const payload = normalizeExportPayload(rawPayload, filePath);
  const nextOverrides = { ...currentOverrides };
  const report = {
    imported: 0,
    skipped: 0,
    conflicts: 0,
    lemmaDefaults: Object.keys(payload.lemmaDefaults).length
  };

  for (const override of Object.values(payload.overrides)) {
    const selectedGloss = sanitizeGloss(override.selectedGloss);
    const location = parseOccurrenceKey(override.occurrenceKey);

    if (!selectedGloss || !location) {
      report.skipped += 1;
      continue;
    }

    const bookPayload = await loadBookPayload(location.bookSlug, bookCache);
    const token = getTokenFromPayload(bookPayload, location);
    const entryKey = sanitizeGloss(override.entryKey ?? token?.entryKey ?? override.strongs ?? token?.strongs);

    if (!token?.surface || !entryKey) {
      report.skipped += 1;
      continue;
    }

    const formOverrideKey = getFormOverrideKey(entryKey, token);
    const existingGloss = sanitizeGloss(nextOverrides[formOverrideKey]?.translationGloss);

    if (existingGloss && existingGloss !== selectedGloss) {
      report.conflicts += 1;
    }

    nextOverrides[formOverrideKey] = {
      ...nextOverrides[formOverrideKey],
      translationGloss: selectedGloss,
      note: `Imported from ${path.basename(filePath)} (${override.occurrenceKey}).`
    };
    report.imported += 1;
  }

  return {
    nextOverrides,
    report
  };
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    noBuild: argv.includes("--no-build"),
    inputPaths: argv
      .filter((arg) => !arg.startsWith("--"))
      .map((arg) => path.resolve(process.cwd(), arg))
  };
}

async function main() {
  const { dryRun, inputPaths, noBuild } = parseArgs(process.argv.slice(2));
  const importPaths = inputPaths.length > 0 ? inputPaths : await getDefaultImportPaths();

  if (importPaths.length === 0) {
    throw new Error(
      `No Greek gloss export files found. Pass a file path or add JSON exports to ${path.relative(
        repoRoot,
        defaultImportDir
      )}.`
    );
  }

  let overrides = await loadJson(overridesPath, {});
  const bookCache = new Map();
  const totals = {
    imported: 0,
    skipped: 0,
    conflicts: 0,
    lemmaDefaults: 0
  };

  for (const importPath of importPaths) {
    const result = await importExportFile(importPath, overrides, bookCache);
    overrides = result.nextOverrides;
    totals.imported += result.report.imported;
    totals.skipped += result.report.skipped;
    totals.conflicts += result.report.conflicts;
    totals.lemmaDefaults += result.report.lemmaDefaults;
  }

  if (!dryRun) {
    await writeFile(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);
  }

  console.log(
    `${dryRun ? "Validated" : "Imported"} ${totals.imported} Greek form translation override(s).`
  );

  if (totals.lemmaDefaults > 0) {
    console.log(
      `Skipped ${totals.lemmaDefaults} lemma default(s); they are exported for backup but are not exact-form overrides.`
    );
  }

  if (totals.skipped > 0) {
    console.log(`Skipped ${totals.skipped} token override(s) that could not be matched.`);
  }

  if (totals.conflicts > 0) {
    console.log(`Replaced ${totals.conflicts} existing exact-form override(s).`);
  }

  if (!dryRun && !noBuild && totals.imported > 0) {
    const buildResult = spawnSync(process.execPath, [buildScriptPath], {
      cwd: repoRoot,
      stdio: "inherit"
    });

    if (buildResult.status !== 0) {
      process.exitCode = buildResult.status ?? 1;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
