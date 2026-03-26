import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import { getBibleVersionOptions, normalizeBibleVersion, resolveBibleVersion } from "@/lib/bible/version";

describe("bible version helpers", () => {
  it("defaults to WEB when no version is provided", () => {
    expect(resolveBibleVersion(undefined, { esvEnabled: false })).toBe(DEFAULT_BIBLE_VERSION);
    expect(normalizeBibleVersion(undefined, { esvEnabled: false })).toBe(DEFAULT_BIBLE_VERSION);
  });

  it("rejects invalid versions and unavailable ESV", () => {
    expect(resolveBibleVersion("nrsv", { esvEnabled: false })).toBeNull();
    expect(resolveBibleVersion("esv", { esvEnabled: false })).toBeNull();
    expect(normalizeBibleVersion("esv", { esvEnabled: false })).toBe(DEFAULT_BIBLE_VERSION);
  });

  it("allows ESV when the capability flag is enabled", () => {
    expect(resolveBibleVersion("esv", { esvEnabled: true })).toBe("esv");
  });

  it("marks ESV as disabled in the version options when unavailable", () => {
    const disabledOptions = getBibleVersionOptions(false);
    const enabledOptions = getBibleVersionOptions(true);

    expect(disabledOptions.find((option) => option.id === "esv")?.disabled).toBe(true);
    expect(enabledOptions.find((option) => option.id === "esv")?.disabled).toBe(false);
  });
});
