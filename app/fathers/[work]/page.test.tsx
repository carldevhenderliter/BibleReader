import { notFound } from "next/navigation";
import { screen } from "@testing-library/react";

import FathersReaderPage from "@/app/fathers/[work]/page";
import * as fathersData from "@/lib/fathers/data";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/fathers/data");

const mockedGetFathersWorkPayload = jest.mocked(fathersData.getFathersWorkPayload);

describe("FathersReaderPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders 1 Clement in the dedicated Fathers reader", async () => {
    mockedGetFathersWorkPayload.mockResolvedValue({
      work: {
        slug: "1-clement",
        title: "1 Clement",
        shortTitle: "1 Clem.",
        author: "Clement of Rome",
        order: 1,
        corpus: "apostolic-fathers",
        sectionCount: 1,
        greekSource: "example-greek",
        englishSource: "example-english"
      },
      segments: [
        {
          id: "1-clement:prologue",
          ref: "prologue",
          label: "Prologue",
          greek: "Ἡ ἐκκλησία",
          english: "The church",
          greekNormalized: "η εκκλησια",
          greekTokens: ["η", "εκκλησια"],
          greekLexicalTokens: [
            {
              surface: "Ἡ",
              lemma: "ὁ",
              entryKey: "G3588",
              strongs: "G3588",
              transliteration: "Ē",
              gloss: "this"
            },
            {
              surface: "ἐκκλησία",
              lemma: "ἐκκλησία",
              entryKey: "G1577",
              strongs: "G1577",
              transliteration: "ekklēsia",
              gloss: "assembly"
            }
          ]
        }
      ]
    });

    const element = await FathersReaderPage({
      params: Promise.resolve({
        work: "1-clement"
      })
    });

    renderWithReaderCustomization(element);

    expect(screen.getAllByText("1 Clement").length).toBeGreaterThan(0);
    expect(screen.getByText("Prologue")).toBeInTheDocument();
    expect(screen.getByText("The church")).toBeInTheDocument();
  });

  it("calls notFound for unsupported Fathers routes", async () => {
    mockedGetFathersWorkPayload.mockResolvedValue(null);

    await expect(
      FathersReaderPage({
        params: Promise.resolve({
          work: "didache"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
