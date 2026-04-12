import {
  getGreekCaseDetails,
  getGreekGlossOptions,
  getGreekLemmaEntry,
  getGreekTokenOccurrenceKey,
  lookupGreekDictionary,
  normalizeGreekFormLookupValue,
  normalizeGreekLookupValue,
  resolveGreekTokenGloss
} from "@/lib/bible/greek";

describe("Greek dictionary lookup", () => {
  it("normalizes accents, case, and final sigma for lemma lookups", () => {
    expect(normalizeGreekLookupValue("Ἀρχή")).toBe("αρχη");
    expect(normalizeGreekLookupValue("ἀρχης")).toBe("αρχησ");
    expect(normalizeGreekFormLookupValue("ἀρχῆς")).toBe("αρχησ");
  });

  it("loads lemma entries by Strong’s number", async () => {
    const entry = await getGreekLemmaEntry("G746");

    expect(entry).toMatchObject({
      lemma: "ἀρχή",
      strongs: "G746",
      transliteration: "archē"
    });
    expect(entry?.forms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          form: "ἀρχῆς",
          morphology: "N-GSF"
        })
      ])
    );
  });

  it("resolves inflected forms back to the lemma entry", async () => {
    const results = await lookupGreekDictionary("ἀρχῆς");

    expect(results[0]).toMatchObject({
      matchType: "form",
      entry: expect.objectContaining({
        lemma: "ἀρχή",
        strongs: "G746"
      }),
      selectedForm: expect.objectContaining({
        form: "ἀρχῆς",
        morphology: "N-GSF"
      })
    });
  });

  it("matches decomposed unicode forms", async () => {
    const results = await lookupGreekDictionary("ἀρχῆς");

    expect(results[0]?.entry.strongs).toBe("G746");
    expect(results[0]?.selectedForm?.form).toBe("ἀρχῆς");
  });

  it("matches transliteration and English gloss lookups", async () => {
    const transliterationResults = await lookupGreekDictionary("arche");
    const glossResults = await lookupGreekDictionary("beginning");

    expect(transliterationResults.some((result) => result.entry.strongs === "G746")).toBe(true);
    expect(glossResults.some((result) => result.entry.strongs === "G746")).toBe(true);
  });

  it("builds stable occurrence keys for repeated Greek tokens", () => {
    expect(getGreekTokenOccurrenceKey("john", 1, 1, 3)).toBe("john:1:1:3");
  });

  it("builds readable gloss options from lemma data", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const options = getGreekGlossOptions(entry!, "beginning");

    expect(options.map((option) => option.label)).toEqual(
      expect.arrayContaining(["beginning", "origin"])
    );
  });

  it("prefers stored per-token gloss overrides over generated defaults", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const token = {
      surface: "ἀρχῆς",
      lemma: "ἀρχή",
      strongs: "G746",
      gloss: "beginning"
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("beginning");
    expect(
      resolveGreekTokenGloss(token, entry, {
        occurrenceKey: "john:1:1:1",
        strongs: "G746",
        lemma: "ἀρχή",
        selectedGloss: "origin",
        source: "lemma-option"
      })
    ).toBe("origin");
  });

  it("reduces multi-word default glosses to a single head word until overridden", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const token = {
      surface: "ἀρχῆς",
      lemma: "ἀρχή",
      strongs: "G746",
      gloss: "of the beginning"
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("beginning");
  });

  it("extracts Greek case details from morphology", () => {
    expect(
      getGreekCaseDetails({
        morphology: "N-GSF",
        decodedMorphology: "noun genitive singular feminine"
      })
    ).toMatchObject({
      key: "genitive",
      label: "Genitive"
    });
  });
});
