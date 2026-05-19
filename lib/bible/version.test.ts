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

  it("allows installed bundled versions including ESV, Greek, TR, and Hebrew", () => {
    expect(resolveBibleVersion("esv")).toBe("esv");
    expect(normalizeBibleVersion("esv")).toBe("esv");
    expect(resolveBibleVersion("greek")).toBe("greek");
    expect(normalizeBibleVersion("greek")).toBe("greek");
    expect(resolveBibleVersion("tr")).toBe("tr");
    expect(normalizeBibleVersion("tr")).toBe("tr");
    expect(resolveBibleVersion("mt")).toBe("mt");
    expect(normalizeBibleVersion("mt")).toBe("mt");
  });

  it("lists ESV, Greek, TR, and Hebrew as enabled options", () => {
    const options = getBibleVersionOptions();

    expect(options.find((option) => option.id === "esv")?.disabled).toBe(false);
    expect(options.find((option) => option.id === "greek")?.disabled).toBe(false);
    expect(options.find((option) => option.id === "tr")?.disabled).toBe(false);
    expect(options.find((option) => option.id === "mt")?.disabled).toBe(false);
    expect(options.find((option) => option.id === "mt")?.label).toBe("Hebrew");
  });
});
