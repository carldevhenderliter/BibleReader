import { ESV_API_KEY_ENV_NAME } from "@/lib/bible/constants";
import { getEsvChapter, isEsvEnabled, parseEsvChapterText } from "@/lib/bible/esv";
import type { BookMeta } from "@/lib/bible/types";

const john: BookMeta = {
  slug: "john",
  name: "John",
  abbreviation: "John",
  testament: "New",
  chapterCount: 21,
  order: 43
};

describe("esv helpers", () => {
  const originalApiKey = process.env[ESV_API_KEY_ENV_NAME];
  const originalFetch = global.fetch;

  beforeEach(() => {
    delete process.env[ESV_API_KEY_ENV_NAME];
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;

    if (originalApiKey) {
      process.env[ESV_API_KEY_ENV_NAME] = originalApiKey;
    } else {
      delete process.env[ESV_API_KEY_ENV_NAME];
    }
  });

  it("detects whether ESV is configured", () => {
    expect(isEsvEnabled()).toBe(false);

    process.env[ESV_API_KEY_ENV_NAME] = "test-key";

    expect(isEsvEnabled()).toBe(true);
  });

  it("parses verse-numbered passage text into verses", () => {
    expect(parseEsvChapterText("[1] In the beginning was the Word. [2] He was in the beginning."))
      .toEqual([
        { number: 1, text: "In the beginning was the Word." },
        { number: 2, text: "He was in the beginning." }
      ]);
  });

  it("loads a chapter through the ESV API", async () => {
    process.env[ESV_API_KEY_ENV_NAME] = "test-key";
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        passages: ["[1] In the beginning was the Word. [2] He was in the beginning with God."]
      })
    } as Response);

    await expect(getEsvChapter(john, 1)).resolves.toEqual({
      bookSlug: "john",
      chapterNumber: 1,
      verses: [
        { number: 1, text: "In the beginning was the Word." },
        { number: 2, text: "He was in the beginning with God." }
      ]
    });
  });
});
