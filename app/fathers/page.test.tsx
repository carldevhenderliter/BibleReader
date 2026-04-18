import { screen } from "@testing-library/react";

import FathersPage from "@/app/fathers/page";
import * as fathersData from "@/lib/fathers/data";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/fathers/data");

const mockedGetFathersWorks = jest.mocked(fathersData.getFathersWorks);

describe("FathersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the Fathers library with 1 Clement", async () => {
    mockedGetFathersWorks.mockResolvedValue([
      {
        slug: "1-clement",
        title: "1 Clement",
        shortTitle: "1 Clem.",
        author: "Clement of Rome",
        order: 1,
        corpus: "apostolic-fathers",
        sectionCount: 66,
        greekSource: "example-greek",
        englishSource: "example-english"
      }
    ]);

    const element = await FathersPage();

    renderWithReaderCustomization(element);

    expect(screen.getByRole("link", { name: "Open 1 Clement" })).toHaveAttribute(
      "href",
      "/fathers/1-clement"
    );
    expect(screen.getByText("Study early Christian Greek texts")).toBeInTheDocument();
  });
});
