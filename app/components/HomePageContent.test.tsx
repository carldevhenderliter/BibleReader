import { render, screen } from "@testing-library/react";

import { HomePageContent } from "@/app/components/HomePageContent";
import type { BookMeta } from "@/lib/bible/types";

const books: BookMeta[] = [
  {
    slug: "genesis",
    name: "Genesis",
    abbreviation: "Gen",
    testament: "Old",
    chapterCount: 50,
    order: 1
  },
  {
    slug: "exodus",
    name: "Exodus",
    abbreviation: "Exod",
    testament: "Old",
    chapterCount: 40,
    order: 2
  },
  {
    slug: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    testament: "New",
    chapterCount: 28,
    order: 40
  }
];

describe("HomePageContent", () => {
  it("renders books in canonical order grouped by testament", () => {
    render(<HomePageContent books={books} esvEnabled={false} />);

    expect(screen.getByRole("link", { name: "Open Genesis" })).toHaveAttribute(
      "href",
      "/read/genesis"
    );
    expect(screen.getByRole("link", { name: "Open Exodus" })).toHaveAttribute(
      "href",
      "/read/exodus"
    );
    expect(screen.getByRole("link", { name: "Open Matthew" })).toHaveAttribute(
      "href",
      "/read/matthew"
    );
  });
});
