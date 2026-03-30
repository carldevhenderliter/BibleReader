import {
  DEFAULT_SEARCH_CUSTOMIZATION,
  getSearchCustomizationVariables,
  normalizeSearchCustomization
} from "@/lib/search-customization";

describe("search customization", () => {
  it("returns default settings for invalid input", () => {
    expect(normalizeSearchCustomization(null)).toEqual(DEFAULT_SEARCH_CUSTOMIZATION);
    expect(normalizeSearchCustomization("bad")).toEqual(DEFAULT_SEARCH_CUSTOMIZATION);
  });

  it("normalizes partial and invalid values", () => {
    expect(
      normalizeSearchCustomization({
        textSize: 9,
        lineHeight: 0,
        bodyFont: "mono",
        uiFont: "technical",
        density: "compact"
      })
    ).toEqual({
      textSize: 2.25,
      lineHeight: 1.25,
      bodyFont: "mono",
      uiFont: "technical",
      density: "compact"
    });
  });

  it("fills missing fields when restoring older saved values", () => {
    expect(
      normalizeSearchCustomization({
        textSize: 1.4
      })
    ).toEqual({
      ...DEFAULT_SEARCH_CUSTOMIZATION,
      textSize: 1.4
    });
  });

  it("maps settings to search css custom properties", () => {
    const variables = getSearchCustomizationVariables({
      textSize: 2.08,
      lineHeight: 1.9,
      bodyFont: "humanist",
      uiFont: "technical",
      density: "compact"
    });

    expect(variables["--search-text-size"]).toBe("2.08rem");
    expect(variables["--search-line-height"]).toBe("1.9");
    expect(variables["--search-body-font"]).toContain("Inter");
    expect(variables["--search-ui-font"]).toContain("Eurostile");
    expect(variables["--search-density"]).toBe("compact");
    expect(variables["--search-density-card-padding"]).toBe("0.78rem");
  });
});
