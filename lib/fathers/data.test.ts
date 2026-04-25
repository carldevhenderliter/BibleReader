import {
  getAuthenticFathersWorks,
  getFathersWorkBySlug,
  getFathersWorkPayload,
  getFathersWorks
} from "@/lib/fathers/data";

describe("fathers data", () => {
  it("loads the Fathers manifest", async () => {
    const works = await getFathersWorks();

    expect(works).toHaveLength(25);
    expect(works[0]?.slug).toBe("1-clement");
    expect(works.at(-1)?.slug).toBe("theophilus-to-autolycus");
  });

  it("filters the authentic Fathers corpus", async () => {
    const works = await getAuthenticFathersWorks();

    expect(works.map((work) => work.slug)).toEqual([
      "1-clement",
      "ignatius-ephesians",
      "ignatius-magnesians",
      "ignatius-trallians",
      "ignatius-romans",
      "ignatius-philadelphians",
      "ignatius-smyrnaeans",
      "ignatius-polycarp",
      "polycarp-to-philippians",
      "papias-fragments",
      "justin-first-apology",
      "justin-second-apology",
      "justin-dialogue-with-trypho",
      "athenagoras-plea-for-the-christians",
      "athenagoras-on-the-resurrection",
      "theophilus-to-autolycus"
    ]);
    expect(works.find((work) => work.slug === "2-clement")).toBeUndefined();
    expect(works.find((work) => work.slug === "didache")).toBeUndefined();
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
    expect(payload?.segments[0]?.greekLexicalTokens?.[0]).toEqual(
      expect.objectContaining({
        surface: expect.any(String),
        lemma: expect.any(String),
        entryKey: expect.any(String),
        transliteration: expect.any(String),
        gloss: expect.any(String)
      })
    );
  });

  it("loads Hermas as aligned heading-level sections", async () => {
    const payload = await getFathersWorkPayload("shepherd-of-hermas");

    expect(payload?.segments[0]?.ref).toBe("vision-1");
    expect(payload?.segments[0]?.label).toBe("Vision 1");
    expect(payload?.segments[0]?.greek).toContain("Ὁ θρέψας με");
    expect(payload?.segments[0]?.english).toContain("The master, who reared me");
  });

  it("loads NA1 Clementine works as English-only Fathers payloads", async () => {
    const [work, payload] = await Promise.all([
      getFathersWorkBySlug("recognitions-of-clement"),
      getFathersWorkPayload("recognitions-of-clement")
    ]);

    expect(work?.title).toBe("The Recognitions of Clement");
    expect(work?.englishSource).toBe("PDF/NA1.pdf (main text)");
    expect(work?.greekSource).toBe("");
    expect(payload?.segments[0]?.label).toBe("Book I · Chapter I: Clement’s Early History; Doubts");
    expect(payload?.segments[0]?.english).toContain("I Clement, who was born in the city of Rome");
    expect(payload?.segments[0]?.greek).toBe("");
    expect(payload?.segments[0]?.greekTokens).toEqual([]);
    expect(payload?.segments[0]?.greekLexicalTokens).toBeUndefined();
    expect(payload?.segments[0]?.englishTokens?.[0]).toEqual({
      type: "word",
      text: "I",
      wordIndex: 0
    });
    expect(payload?.segments[0]?.greekUndertextAnnotations).toEqual([]);
  });

  it("loads Papias as an English-only fragment collection", async () => {
    const [work, payload] = await Promise.all([
      getFathersWorkBySlug("papias-fragments"),
      getFathersWorkPayload("papias-fragments")
    ]);

    expect(work?.authenticityStatus).toBe("fragmentary");
    expect(work?.fullTextUrl).toBe("https://www.newadvent.org/fathers/0125.htm");
    expect(payload?.segments).toHaveLength(10);
    expect(payload?.segments[0]?.label).toBe("Fragment I");
    expect(payload?.segments[0]?.english).toContain("Exposition of the Oracles of the Lord");
    expect(payload?.segments[0]?.greek).toBe("");
    expect(payload?.segments[0]?.greekTokens).toEqual([]);
  });

  it("loads Justin's First Apology as an authentic English-first Fathers work", async () => {
    const [work, payload] = await Promise.all([
      getFathersWorkBySlug("justin-first-apology"),
      getFathersWorkPayload("justin-first-apology")
    ]);

    expect(work?.authenticityStatus).toBe("accepted");
    expect(work?.fullTextUrl).toBe("https://www.newadvent.org/fathers/0126.htm");
    expect(payload?.segments[0]?.label).toBe("Chapter 1 · Address");
    expect(payload?.segments[0]?.english).toContain("To the Emperor Titus Ælius Adrianus Antoninus");
    expect(payload?.segments[0]?.greek).toBe("");
    expect(payload?.segments[0]?.greekTokens).toEqual([]);
  });
});
