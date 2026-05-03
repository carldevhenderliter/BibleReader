import {
  GREEK_VERB_PARADIGM_UNAVAILABLE_NOTE,
  getGreekVerbParadigmForToken
} from "@/lib/bible/greek-paradigms";

describe("getGreekVerbParadigmForToken", () => {
  it("returns null for non-verbs", () => {
    expect(
      getGreekVerbParadigmForToken({
        morphology: "N-GSF",
        decodedMorphology: "noun genitive singular feminine"
      })
    ).toBeNull();
  });

  it("builds a finite indicative chart and highlights the active cell", () => {
    const paradigm = getGreekVerbParadigmForToken({
      morphology: "V-3AMI-S",
      decodedMorphology: "verb aorist middle indicative third person singular"
    });

    expect(paradigm).not.toBeNull();
    expect(paradigm?.title).toBe("Aorist Middle Indicative");
    expect(paradigm?.highlightedCellId).toBe("3s");
    expect(paradigm?.availabilityNote).toBeUndefined();
    expect(paradigm?.cells.find((cell) => cell.id === "3s")?.ending).toBe("ατο");
    expect(paradigm?.cells.find((cell) => cell.id === "3s")?.displayText).toBe("stem-ατο");
    expect(paradigm?.cells.find((cell) => cell.id === "1p")?.ending).toBe("αμεθα");
  });

  it("parses standard morphology codes with person and number", () => {
    const paradigm = getGreekVerbParadigmForToken({
      morphology: "V-PAI-1P",
      decodedMorphology: "verb present active indicative first person plural"
    });

    expect(paradigm?.title).toBe("Present Active Indicative");
    expect(paradigm?.highlightedCellId).toBe("1p");
    expect(paradigm?.cells.find((cell) => cell.id === "1p")?.ending).toBe("ομεν");
  });

  it("returns the safe fallback note for non-finite verb forms", () => {
    const paradigm = getGreekVerbParadigmForToken({
      morphology: "V-PAN",
      decodedMorphology: "verb present active infinitive"
    });

    expect(paradigm?.title).toBe("Present Active Infinitive");
    expect(paradigm?.availabilityNote).toBe(GREEK_VERB_PARADIGM_UNAVAILABLE_NOTE);
    expect(paradigm?.cells).toHaveLength(0);
  });
});
