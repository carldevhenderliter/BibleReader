import { fireEvent, render, screen, within } from "@testing-library/react";

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
    slug: "job",
    name: "Job",
    abbreviation: "Job",
    testament: "Old",
    chapterCount: 42,
    order: 18
  },
  {
    slug: "matthew",
    name: "Matthew",
    abbreviation: "Matt",
    testament: "New",
    chapterCount: 28,
    order: 40,
    compositionDate: "c. 70–90 AD"
  },
  {
    slug: "james",
    name: "James",
    abbreviation: "Jas",
    testament: "New",
    chapterCount: 5,
    order: 59,
    compositionDate: "c. 45–62 AD"
  },
  {
    slug: "gospel-harmony",
    name: "Gospel Harmony",
    abbreviation: "Harmony",
    testament: "New",
    chapterCount: 68,
    order: 67
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

    const oldTestamentSection = screen
      .getByRole("heading", { name: "Genesis to Malachi" })
      .closest("section");
    const newTestamentSection = screen
      .getByRole("heading", { name: "Matthew to Revelation" })
      .closest("section");

    expect(oldTestamentSection).not.toBeNull();
    expect(screen.getByRole("link", { name: "Open Genesis" })).toHaveAttribute(
      "href",
      "/read/genesis"
    );
    expect(screen.getByRole("link", { name: "Open Exodus" })).toHaveAttribute(
      "href",
      "/read/exodus"
    );
    expect(
      within(oldTestamentSection as HTMLElement).getAllByRole("link").map((link) => link.getAttribute("href"))
    ).toEqual(["/read/genesis", "/read/exodus", "/read/job"]);
    expect(newTestamentSection).not.toBeNull();
    expect(
      within(newTestamentSection as HTMLElement).getByRole("link", {
        name: "Open Matthew"
      })
    ).toHaveAttribute(
      "href",
      "/read/matthew"
    );
    expect(
      within(newTestamentSection as HTMLElement).getByText("c. 70–90 AD")
    ).toBeInTheDocument();
    expect(
      within(newTestamentSection as HTMLElement).getByText("c. 45–62 AD")
    ).toBeInTheDocument();
    expect(
      within(newTestamentSection as HTMLElement).getByRole("link", {
        name: "Open Gospel Harmony"
      })
    ).toHaveAttribute("href", "/read/gospel-harmony");
    expect(screen.getByRole("link", { name: "Open 1 Clement" })).toHaveAttribute(
      "href",
      "/fathers/1-clement"
    );
    expect(screen.getByRole("link", { name: "Open The Recognitions of Clement" })).toHaveAttribute(
      "href",
      "/fathers/recognitions-of-clement"
    );
  });

  it("renders the chronological Old Testament section in the configured order", () => {
    render(<HomePageContent books={books} fathersWorks={[]} />);

    fireEvent.click(
      within(
        screen.getByRole("heading", { name: "Genesis to Malachi" }).closest("section") as HTMLElement
      ).getByRole("button", { name: "Chronological" })
    );

    const oldTestamentSection = screen
      .getByRole("heading", { name: "Genesis to Malachi" })
      .closest("section");

    expect(oldTestamentSection).not.toBeNull();
    const chronologicalLinks = within(oldTestamentSection as HTMLElement).getAllByRole("link");

    expect(chronologicalLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/read/genesis",
      "/read/job",
      "/read/exodus"
    ]);
  });

  it("renders the chronological New Testament section in the configured order", () => {
    render(<HomePageContent books={books} fathersWorks={[]} />);

    fireEvent.click(
      within(
        screen.getByRole("heading", { name: "Matthew to Revelation" }).closest("section") as HTMLElement
      ).getByRole("button", { name: "Chronological" })
    );

    const chronologicalSection = screen
      .getByRole("heading", { name: "Matthew to Revelation" })
      .closest("section");

    expect(chronologicalSection).not.toBeNull();
    const chronologicalLinks = within(chronologicalSection as HTMLElement).getAllByRole("link");

    expect(chronologicalLinks.map((link) => link.getAttribute("href"))).toEqual([
      "/read/james",
      "/read/matthew",
      "/read/gospel-harmony"
    ]);
  });

  it("filters the library by testament", () => {
    render(<HomePageContent books={books} fathersWorks={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "New Testament" }));

    expect(screen.queryByRole("heading", { name: "Genesis to Malachi" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Matthew to Revelation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NT Matthew" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "OT Genesis" })).not.toBeInTheDocument();
  });

  it("lets the user hide individual books from the library lists", () => {
    render(<HomePageContent books={books} fathersWorks={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "OT Exodus" }));

    expect(screen.getByRole("button", { name: "OT Exodus" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("link", { name: "Open Exodus" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Genesis" })).toBeInTheDocument();
  });
});
