import { getGreekSecondDeclensionChart } from "@/lib/bible/greek-grammar-charts";

describe("getGreekSecondDeclensionChart", () => {
  it("returns the masculine 2nd declension chart for -ος nouns", () => {
    const chart = getGreekSecondDeclensionChart({
      entryKey: "G3056",
      strongs: "G3056",
      lemma: "λόγος",
      selectedForm: "λόγου",
      selectedFormMorphology: "N-GSM",
      selectedFormDecodedMorphology: "noun genitive singular masculine"
    });

    expect(chart.status).toBe("supported");

    if (chart.status !== "supported") {
      throw new Error("Expected a supported chart");
    }

    expect(chart.gender).toBe("masculine");
    expect(chart.singular).toEqual(["ος", "ου", "ου", "ῳ", "ῳ", "ῳ", "ον", "ε"]);
    expect(chart.highlightedRowIndex).toBe(1);
    expect(chart.highlightedNumber).toBe("singular");
  });

  it("returns the neuter 2nd declension chart for -ον nouns", () => {
    const chart = getGreekSecondDeclensionChart({
      entryKey: "G2041",
      strongs: "G2041",
      lemma: "ἔργον",
      selectedForm: "ἔργα",
      selectedFormMorphology: "N-NPN",
      selectedFormDecodedMorphology: "noun nominative plural neuter"
    });

    expect(chart.status).toBe("supported");

    if (chart.status !== "supported") {
      throw new Error("Expected a supported chart");
    }

    expect(chart.gender).toBe("neuter");
    expect(chart.plural).toEqual(["α", "ων", "ων", "οις", "οις", "οις", "α", "α"]);
    expect(chart.highlightedRowIndex).toBe(0);
    expect(chart.highlightedNumber).toBe("plural");
  });

  it("returns an unsupported note for nouns outside the current chart", () => {
    const chart = getGreekSecondDeclensionChart({
      entryKey: "G746",
      strongs: "G746",
      lemma: "ἀρχή",
      selectedForm: "ἀρχῆς",
      selectedFormMorphology: "N-GSF",
      selectedFormDecodedMorphology: "noun genitive singular feminine"
    });

    expect(chart).toEqual({
      status: "unsupported",
      title: "2nd Declension Noun Chart",
      message: "This noun does not use the current 2nd declension chart."
    });
  });
});
