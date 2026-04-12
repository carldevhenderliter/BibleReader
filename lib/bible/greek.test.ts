import {
  getGreekLemmaEntry,
  lookupGreekDictionary,
  normalizeGreekFormLookupValue,
  normalizeGreekLookupValue
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
});
