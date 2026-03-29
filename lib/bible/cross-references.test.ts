import { getCrossReferenceEntry } from "@/lib/bible/cross-references";

describe("cross references", () => {
  it("loads resolved cross references for a curated verse", async () => {
    const entry = await getCrossReferenceEntry("web", "john", 1, 1);

    expect(entry).not.toBeNull();
    expect(entry?.groups.length).toBeGreaterThan(0);
    expect(entry?.groups[0]?.references.some((reference) => reference.bookSlug === "genesis")).toBe(
      true
    );
    expect(entry?.groups[0]?.references[0]?.text.length).toBeGreaterThan(0);
  });
});
