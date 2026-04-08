import {
  getFathersWorkBySlug,
  getFathersWorkPayload,
  getFathersWorks
} from "@/lib/fathers/data";

describe("fathers data", () => {
  it("loads the Apostolic Fathers manifest", async () => {
    const works = await getFathersWorks();

    expect(works).toHaveLength(13);
    expect(works[0]?.slug).toBe("1-clement");
    expect(works.at(-1)?.slug).toBe("shepherd-of-hermas");
  });

  it("loads 1 Clement with linked Greek and English segments", async () => {
    const [work, payload] = await Promise.all([
      getFathersWorkBySlug("1-clement"),
      getFathersWorkPayload("1-clement")
    ]);

    expect(work?.title).toBe("1 Clement");
    expect(payload?.segments[0]?.ref).toBe("prologue");
    expect(payload?.segments[0]?.greek).toContain("Ἡ ἐκκλησία τοῦ θεοῦ");
    expect(payload?.segments[0]?.english).toContain("The Church of God which sojourneth in Rome");
    expect(payload?.segments[0]?.greekNormalized).toContain("η εκκλησια του θεου");
    expect(payload?.segments[0]?.greekTokens).toContain("εκκλησια");
  });

  it("loads Hermas as aligned heading-level sections", async () => {
    const payload = await getFathersWorkPayload("shepherd-of-hermas");

    expect(payload?.segments[0]?.ref).toBe("vision-1");
    expect(payload?.segments[0]?.label).toBe("Vision 1");
    expect(payload?.segments[0]?.greek).toContain("Ὁ θρέψας με");
    expect(payload?.segments[0]?.english).toContain("The master, who reared me");
  });
});
