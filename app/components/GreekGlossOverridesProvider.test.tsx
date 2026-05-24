import {
  buildGreekGlossExportPayload,
  downloadGreekGlossExportFile,
  GREEK_GLOSS_DEFAULTS_STORAGE_KEY,
  GREEK_GLOSS_EXPORT_SCHEMA,
  GREEK_GLOSS_EXPORT_VERSION,
  GREEK_GLOSS_OVERRIDES_STORAGE_KEY,
  normalizeGreekGlossExportPayload
} from "@/app/components/GreekGlossOverridesProvider";

describe("Greek gloss export", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds a portable Greek gloss export payload", () => {
    const payload = buildGreekGlossExportPayload(
      {
        "john:1:1:0": {
          occurrenceKey: "john:1:1:0",
          entryKey: "G746",
          strongs: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "custom"
        }
      },
      {
        "entry:G746": {
          entryKey: "G746",
          strongs: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "lemma-option"
        }
      },
      "2026-05-24T12:00:00.000Z"
    );

    expect(payload).toEqual({
      schema: GREEK_GLOSS_EXPORT_SCHEMA,
      version: GREEK_GLOSS_EXPORT_VERSION,
      exportedAt: "2026-05-24T12:00:00.000Z",
      overrides: {
        "john:1:1:0": {
          occurrenceKey: "john:1:1:0",
          entryKey: "G746",
          strongs: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "custom"
        }
      },
      lemmaDefaults: {
        "entry:G746": {
          entryKey: "G746",
          strongs: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "lemma-option"
        }
      }
    });
  });

  it("normalizes an exported payload and removes invalid entries", () => {
    const payload = normalizeGreekGlossExportPayload({
      schema: GREEK_GLOSS_EXPORT_SCHEMA,
      version: GREEK_GLOSS_EXPORT_VERSION,
      exportedAt: "2026-05-24T12:00:00.000Z",
      overrides: {
        "john:1:1:0": {
          occurrenceKey: "john:1:1:0",
          entryKey: "G746",
          lemma: "ἀρχή",
          selectedGloss: "origin",
          source: "custom"
        },
        broken: {
          occurrenceKey: "broken"
        }
      },
      lemmaDefaults: {
        "entry:G746": {
          entryKey: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "lemma-option"
        },
        broken: {
          lemma: "ἀρχή"
        }
      }
    });

    expect(Object.keys(payload?.overrides ?? {})).toEqual(["john:1:1:0"]);
    expect(Object.keys(payload?.lemmaDefaults ?? {})).toEqual(["entry:G746"]);
  });

  it("downloads the current browser gloss storage as JSON", () => {
    const createObjectURL = jest.fn(() => "blob:greek-gloss-export");
    const revokeObjectURL = jest.fn();
    const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation();

    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL
    });
    window.localStorage.setItem(
      GREEK_GLOSS_OVERRIDES_STORAGE_KEY,
      JSON.stringify({
        "john:1:1:0": {
          occurrenceKey: "john:1:1:0",
          entryKey: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "custom"
        }
      })
    );
    window.localStorage.setItem(
      GREEK_GLOSS_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        "entry:G746": {
          entryKey: "G746",
          lemma: "ἀρχή",
          selectedGloss: "beginning",
          source: "lemma-option"
        }
      })
    );

    const result = downloadGreekGlossExportFile(new Date("2026-05-24T12:00:00.000Z"));

    expect(result).toEqual({
      fileName: "greek-gloss-export-2026-05-24T12-00-00-000Z.json",
      overrideCount: 1,
      lemmaDefaultCount: 1
    });
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:greek-gloss-export");

    click.mockRestore();
  });
});
