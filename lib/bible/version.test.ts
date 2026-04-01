import { DEFAULT_BIBLE_VERSION } from "@/lib/bible/constants";
import {
  getBibleVersionOptions,
  normalizeBibleVersion,
  resolveBibleVersion
} from "@/lib/bible/version";

describe("bible version helpers", () => {
  it("defaults to WEB when no version is provided", () => {
    expect(resolveBibleVersion(undefined)).toBe(DEFAULT_BIBLE_VERSION);
    expect(normalizeBibleVersion(undefined)).toBe(DEFAULT_BIBLE_VERSION);
  });

  it("rejects invalid versions", () => {
    expect(resolveBibleVersion("nrsv")).toBeNull();
  });

  it("allows installed bundled versions including ESV", () => {
    expect(resolveBibleVersion("esv")).toBe("esv");
    expect(normalizeBibleVersion("esv")).toBe("esv");
  });

  it("lists ESV as an enabled option", () => {
    const options = getBibleVersionOptions();

    expect(options.find((option) => option.id === "esv")?.disabled).toBe(false);
  });
});
