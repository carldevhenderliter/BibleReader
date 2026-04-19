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

  it("renders English-only Fathers works without Greek placeholders", async () => {
    mockedGetFathersWorkPayload.mockResolvedValue({
      work: {
        slug: "preaching-of-peter",
        title: "The Preaching of Peter",
        shortTitle: "Preaching",
        author: "T. Flavius Clemens / Jackson H. Snyder",
        order: 15,
        corpus: "apostolic-fathers",
        sectionCount: 2,
        greekSource: "",
        englishSource: "PDF/NA1.pdf (Appendix A)"
      },
      segments: [
        {
          id: "preaching-of-peter:introduction",
          ref: "introduction",
          label: "Introduction",
          greek: "",
          english: "Kefa’s Letter to Ya’akov",
          greekNormalized: "",
          greekTokens: []
        },
        {
          id: "preaching-of-peter:section-1",
          ref: "chapter-i",
          label: "Chapter I: Doctrine of Reserve",
          greek: "",
          english: "Knowing, my brother, your eager desire after that which is for the advantage of us all.",
          greekNormalized: "",
          greekTokens: []
        }
      ]
    });

    const element = await FathersReaderPage({
      params: Promise.resolve({
        work: "preaching-of-peter"
      })
    });

    renderWithReaderCustomization(element);

    expect(screen.getByText("The Preaching of Peter")).toBeInTheDocument();
    expect(screen.getByText("Chapter I: Doctrine of Reserve")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Knowing, my brother, your eager desire after that which is for the advantage of us all."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText("Apostolic Fathers")).not.toBeInTheDocument();
    expect(screen.getByText("Fathers Reader")).toBeInTheDocument();
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
