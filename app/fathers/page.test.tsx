import { screen } from "@testing-library/react";

import FathersPage from "@/app/fathers/page";
import * as fathersData from "@/lib/fathers/data";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/fathers/data");

const mockedGetAuthenticFathersWorks = jest.mocked(fathersData.getAuthenticFathersWorks);

describe("FathersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the authentic Apostolic Fathers library", async () => {
    mockedGetAuthenticFathersWorks.mockResolvedValue([
      {
        slug: "1-clement",
        title: "1 Clement",
        shortTitle: "1 Clem.",
        author: "Clement of Rome",
        order: 1,
        corpus: "apostolic-fathers",
        sectionCount: 66,
        greekSource: "example-greek",
        englishSource: "example-english",
        compositionDate: "c. 96 AD",
        fullTextUrl: "https://www.ccel.org/ccel/lightfoot/fathers.ii.i.html",
        fullTextSource: "CCEL Lightfoot",
        authenticityStatus: "accepted"
      },
      {
        slug: "papias-fragments",
        title: "Fragments of Papias",
        shortTitle: "Papias Frg.",
        author: "Papias of Hierapolis",
        order: 11,
        corpus: "apostolic-fathers",
        sectionCount: 10,
        greekSource: "",
        englishSource: "https://www.newadvent.org/fathers/0125.htm",
        compositionDate: "c. 110–130 AD",
        fullTextUrl: "https://www.newadvent.org/fathers/0125.htm",
        fullTextSource: "New Advent, Roberts-Donaldson",
        authenticityStatus: "fragmentary"
      }
    ]);

    const element = await FathersPage();

    renderWithReaderCustomization(element);

    expect(screen.getByRole("link", { name: "Open 1 Clement" })).toHaveAttribute(
      "href",
      "/fathers/1-clement"
    );
    expect(screen.getByRole("link", { name: "Open Fragments of Papias" })).toHaveAttribute(
      "href",
      "/fathers/papias-fragments"
    );
    expect(screen.getByText("Authentic Apostolic Fathers")).toBeInTheDocument();
  });
});
