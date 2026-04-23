import { render, screen } from "@testing-library/react";

import { HomePageContent } from "@/app/components/HomePageContent";
import type { BookMeta } from "@/lib/bible/types";
import type { FathersWorkMeta } from "@/lib/fathers/types";

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
    order: 40,
    compositionDate: "c. 70–90 AD"
  }
];

const fathersWorks: FathersWorkMeta[] = [
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
  },
  {
    slug: "recognitions-of-clement",
    title: "The Recognitions of Clement",
    shortTitle: "Recognitions",
    author: "T. Flavius Clemens",
    order: 14,
    corpus: "apostolic-fathers",
    sectionCount: 508,
    greekSource: "",
    englishSource: "PDF/NA1.pdf (main text)"
  }
];

describe("HomePageContent", () => {
  it("renders books in canonical order grouped by testament", () => {
    render(<HomePageContent books={books} fathersWorks={fathersWorks} />);

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
    expect(screen.getByText("c. 70–90 AD")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open 1 Clement" })).toHaveAttribute(
      "href",
      "/fathers/1-clement"
    );
    expect(screen.getByRole("link", { name: "Open The Recognitions of Clement" })).toHaveAttribute(
      "href",
      "/fathers/recognitions-of-clement"
    );
  });
});
