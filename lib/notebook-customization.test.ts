import {
  DEFAULT_NOTEBOOK_CUSTOMIZATION,
  normalizeNotebookCustomization
} from "@/lib/notebook-customization";

describe("notebook customization", () => {
  it("returns defaults for invalid data", () => {
    expect(normalizeNotebookCustomization(null)).toEqual(DEFAULT_NOTEBOOK_CUSTOMIZATION);
  });

  it("clamps and normalizes stored values", () => {
    expect(
      normalizeNotebookCustomization({
        bodyFont: "mono",
        textSize: 4,
        lineHeight: 0.5,
        width: "focused",
        surfaceStyle: "paper"
      })
    ).toEqual({
      bodyFont: "mono",
      textSize: 1.6,
      lineHeight: 1.4,
      width: "focused",
      surfaceStyle: "paper"
    });
  });
});
