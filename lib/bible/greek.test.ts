import {
  buildGreekLearningQuiz,
  getGreekGlossOptions,
  getGreekLemmaEntry,
  getGreekMorphologyDetails,
  getGreekVerseOccurrences,
  getGreekTokenOccurrenceKey,
  isTypedGreekQuizAnswerCorrect,
  lookupGreekDictionary,
  normalizeGreekFormLookupValue,
  normalizeGreekLookupValue,
  resolveGreekTokenGloss,
  transliterateGreekSurface
} from "@/lib/bible/greek";

describe("Greek dictionary lookup", () => {
  it("normalizes accents, case, and final sigma for lemma lookups", () => {
    expect(normalizeGreekLookupValue("Ἀρχή")).toBe("αρχη");
    expect(normalizeGreekLookupValue("ἀρχης")).toBe("αρχησ");
    expect(normalizeGreekFormLookupValue("ἀρχῆς")).toBe("αρχησ");
  });

  it("loads lemma entries by Strong’s number", async () => {
    const entry = await getGreekLemmaEntry("G746");

    expect(entry).toMatchObject({
      lemma: "ἀρχή",
      strongs: "G746",
      transliteration: "archē"
    });
    expect(entry?.forms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          form: "ἀρχῆς",
          morphology: "N-GSF"
        })
      ])
    );
  });

  it("resolves inflected forms back to the lemma entry", async () => {
    const results = await lookupGreekDictionary("ἀρχῆς");

    expect(results[0]).toMatchObject({
      matchType: "form",
      entry: expect.objectContaining({
        lemma: "ἀρχή",
        strongs: "G746"
      }),
      selectedForm: expect.objectContaining({
        form: "ἀρχῆς",
        morphology: "N-GSF"
      })
    });
  });

  it("matches decomposed unicode forms", async () => {
    const results = await lookupGreekDictionary("ἀρχῆς");

    expect(results[0]?.entry.strongs).toBe("G746");
    expect(results[0]?.selectedForm?.form).toBe("ἀρχῆς");
  });

  it("matches transliteration and English gloss lookups", async () => {
    const transliterationResults = await lookupGreekDictionary("arche");
    const glossResults = await lookupGreekDictionary("beginning");

    expect(transliterationResults.some((result) => result.entry.strongs === "G746")).toBe(true);
    expect(glossResults.some((result) => result.entry.strongs === "G746")).toBe(true);
  });

  it("loads Fathers fallback entries through the merged Greek dictionary indexes", async () => {
    const entry = await getGreekLemmaEntry("AF-1CLEM:παροικουσα");
    const results = await lookupGreekDictionary("παροικοῦσα");

    expect(entry).toMatchObject({
      entryKey: "AF-1CLEM:παροικουσα",
      lemma: "παροικοῦσα",
      sources: expect.arrayContaining(["1 Clement"])
    });
    expect(results[0]).toMatchObject({
      matchType: "lemma",
      entry: expect.objectContaining({
        entryKey: "AF-1CLEM:παροικουσα"
      })
    });
  });

  it("builds stable occurrence keys for repeated Greek tokens", () => {
    expect(getGreekTokenOccurrenceKey("john", 1, 1, 3)).toBe("john:1:1:3");
  });

  it("can limit Greek verse occurrences to an exact selected form", async () => {
    const formMatches = await getGreekVerseOccurrences("G746", "ἀρχῆς");

    expect(
      formMatches.some(
        (entry) => entry.bookSlug === "genesis" && entry.chapterNumber === 1 && entry.verseNumber === 1
      )
    ).toBe(false);
    expect(
      formMatches.some(
        (entry) => entry.bookSlug === "1-john" && entry.chapterNumber === 1 && entry.verseNumber === 1
      )
    ).toBe(true);
  }, 15000);

  it("builds readable gloss options from lemma data", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const options = getGreekGlossOptions(entry!, "beginning");

    expect(options.map((option) => option.label)).toEqual(
      expect.arrayContaining(["beginning", "origin"])
    );
    expect(options.every((option) => !/\s/.test(option.label))).toBe(true);
  });

  it("prefers stored per-token gloss overrides over generated defaults", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const token = {
      surface: "ἀρχῆς",
      lemma: "ἀρχή",
      strongs: "G746",
      gloss: "beginning"
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("beginning");
    expect(
      resolveGreekTokenGloss(token, entry, {
        occurrenceKey: "john:1:1:1",
        strongs: "G746",
        lemma: "ἀρχή",
        selectedGloss: "origin",
        source: "lemma-option"
      })
    ).toBe("origin");
    expect(
      resolveGreekTokenGloss(
        token,
        entry,
        null,
        {
          strongs: "G746",
          lemma: "ἀρχή",
          selectedGloss: "origin",
          source: "lemma-option"
        }
      )
    ).toBe("origin");
  });

  it("reduces multi-word default glosses to a single head word until overridden", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const token = {
      surface: "ἀρχῆς",
      lemma: "ἀρχή",
      strongs: "G746",
      gloss: "of the beginning"
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("beginning");
  });

  it("prefers a cleaner lemma gloss when a token gloss is just a list of alternatives", async () => {
    const entry = await getGreekLemmaEntry("G746");
    const token = {
      surface: "ἀρχῇ",
      lemma: "ἀρχή",
      strongs: "G746",
      gloss: "origin; beginning"
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("beginning");
  });

  it("keeps proper names as the displayed one-word gloss", async () => {
    const entry = await getGreekLemmaEntry("G11");
    const token = {
      surface: "Ἀβραάμ",
      lemma: "Ἀβραάμ",
      strongs: "G11",
      gloss: 'Abraham, the Hebrew patriarch — Abraham'
    };

    expect(resolveGreekTokenGloss(token, entry, null)).toBe("Abraham");
  });

  it("extracts compact noun morphology details", () => {
    expect(
      getGreekMorphologyDetails({
        morphology: "N-GSF",
        decodedMorphology: "noun genitive singular feminine"
      })
    ).toMatchObject({
      label: "Noun · Genitive Singular Feminine",
      terms: expect.arrayContaining([
        expect.objectContaining({
          label: "Genitive",
          example: "Example: λογου = of the word"
        }),
        expect.objectContaining({
          label: "Singular",
          example: "Example: λογος = one word"
        })
      ])
    });
  });

  it("extracts compact verb morphology details", () => {
    expect(
      getGreekMorphologyDetails({
        morphology: "V-3AAI-S",
        decodedMorphology: "verb aorist active indicative third person singular"
      })
    ).toMatchObject({
      label: "Verb · Aorist Active Indicative",
      terms: expect.arrayContaining([
        expect.objectContaining({
          label: "Aorist",
          example: "Example: ειπεν = he said"
        }),
        expect.objectContaining({
          label: "Active",
          example: "Example: λυει = he loosens"
        }),
        expect.objectContaining({
          label: "Indicative",
          example: "Example: λεγει = he says"
        })
      ])
    });
  });

  it("transliterates displayed Greek word forms instead of only lemmas", () => {
    expect(transliterateGreekSurface("ἀρχῆς")).toBe("archēs");
    expect(transliterateGreekSurface("ἐγένετο")).toBe("egeneto");
    expect(transliterateGreekSurface("Ἰούδας")).toBe("Ioudas");
    expect(transliterateGreekSurface("Ἀγαπητοί")).toBe("Agapētoi");
  });

  it("builds a Greek learning quiz with four options using the full lemma definition as the correct answer", async () => {
    const quiz = await buildGreekLearningQuiz({
      entryKey: "G746",
      strongs: "G746",
      lemma: "ἀρχή",
      selectedForm: "ἀρχῆς",
      selectedFormMorphology: "N-GSF",
      selectedFormDecodedMorphology: "noun genitive singular feminine",
      transliteration: "archēs",
      gloss: "origin"
    });

    expect(quiz).toMatchObject({
      entry: expect.objectContaining({
        lemma: "ἀρχή",
        strongs: "G746"
      }),
      selectedFormValue: "ἀρχῆς",
      selectedTransliteration: "archēs",
      prompt: "Which meaning matches this word?",
      correctAnswer: "beginning, origin, or the person or thing that commences"
    });
    expect(quiz?.options).toHaveLength(4);
    expect(quiz?.options.filter((option) => option.isCorrect)).toHaveLength(1);
    expect(quiz?.options.map((option) => option.label)).toContain(
      "beginning, origin, or the person or thing that commences"
    );
  });

  it("falls back to lemma definitions when a quiz selection has no token gloss", async () => {
    const quiz = await buildGreekLearningQuiz({
      entryKey: "G746",
      strongs: "G746",
      lemma: "ἀρχή",
      selectedForm: "ἀρχῇ",
      selectedFormMorphology: "N-DSF",
      selectedFormDecodedMorphology: "noun dative singular feminine"
    });

    expect(quiz?.correctAnswer).toBe("beginning, origin, or the person or thing that commences");
    expect(new Set(quiz?.options.map((option) => option.label)).size).toBe(4);
  });

  it("accepts token glosses as valid typed quiz answers even when the lemma definition is longer", () => {
    expect(
      isTypedGreekQuizAnswerCorrect(
        "genealogy",
        "genealogy",
        "source, origin, or a book of one's lineage",
        "source, origin, or a book of one's lineage"
      )
    ).toBe(true);
  });

  it("accepts article answers like 'the' from long lemma definitions", () => {
    expect(
      isTypedGreekQuizAnswerCorrect(
        "The",
        null,
        "this, that, or these",
        "nullho,ho the definite article the sometimes to besupplied, at others omitted, in English idiom — the, this, that, one,he, she, it, etc.\nthis, that, these, etc.\nthe\nthis, that, or these"
      )
    ).toBe(true);
  });
});
