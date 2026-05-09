import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

import { SearchStrongsParallelRows } from "@/app/components/SearchResultGroups";
import type { StrongsParallelVerseRow } from "@/lib/bible/strongs";
import type { GreekDictionarySelection } from "@/lib/bible/types";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

const hebrewRows: StrongsParallelVerseRow[] = [
  {
    strongsNumber: "H7225",
    bookSlug: "genesis",
    bookName: "Genesis",
    chapterNumber: 1,
    verseNumber: 1,
    versions: [
      {
        version: "web",
        href: "/read/genesis?highlightChapter=1&highlight=1",
        entry: {
          bookSlug: "genesis",
          chapterNumber: 1,
          verseNumber: 1,
          text: "In the beginning, God created the heavens and the earth."
        }
      },
      {
        version: "kjv",
        href: "/read/genesis?highlightChapter=1&highlight=1&version=kjv",
        entry: {
          bookSlug: "genesis",
          chapterNumber: 1,
          verseNumber: 1,
          text: "In the beginning God created the heaven and the earth.",
          tokens: [{ text: "In the beginning", strongsNumbers: ["H7225"] }]
        }
      }
    ]
  },
  {
    strongsNumber: "H7225",
    bookSlug: "genesis",
    bookName: "Genesis",
    chapterNumber: 2,
    verseNumber: 4,
    versions: [
      {
        version: "web",
        href: "/read/genesis?highlightChapter=2&highlight=4",
        entry: {
          bookSlug: "genesis",
          chapterNumber: 2,
          verseNumber: 4,
          text: "This is the history of the heavens and of the earth."
        }
      },
      {
        version: "kjv",
        href: "/read/genesis?highlightChapter=2&highlight=4&version=kjv",
        entry: {
          bookSlug: "genesis",
          chapterNumber: 2,
          verseNumber: 4,
          text: "These are the generations of the heavens and of the earth.",
          tokens: [{ text: "These are the generations", strongsNumbers: ["H7225"] }]
        }
      }
    ]
  }
];

function Harness({
  onOpenGreekDictionary = jest.fn(),
  onOpenStrongs = jest.fn()
}: {
  onOpenGreekDictionary?: (selection: GreekDictionarySelection) => void;
  onOpenStrongs?: (strongsNumbers: string[], label?: string | null) => void;
}) {
  const [expandedVerseRows, setExpandedVerseRows] = useState<Record<string, boolean>>({});

  return (
    <SearchStrongsParallelRows
      expandedVerseRows={expandedVerseRows}
      onOpenGreekDictionary={onOpenGreekDictionary}
      onOpenStrongs={onOpenStrongs}
      onToggleVerseRow={(row) =>
        setExpandedVerseRows((current) => ({
          ...current,
          [`H7225:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]:
            !current[`H7225:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]
        }))
      }
      rows={hebrewRows}
      strongsNumber="H7225"
    />
  );
}

function GreekHarness({
  onOpenGreekDictionary = jest.fn(),
  onOpenStrongs = jest.fn()
}: {
  onOpenGreekDictionary?: (selection: GreekDictionarySelection) => void;
  onOpenStrongs?: (strongsNumbers: string[], label?: string | null) => void;
}) {
  const [expandedVerseRows, setExpandedVerseRows] = useState<Record<string, boolean>>({});
  const rows: StrongsParallelVerseRow[] = [
    {
      strongsNumber: "G3056",
      bookSlug: "john",
      bookName: "John",
      chapterNumber: 1,
      verseNumber: 1,
      versions: [
        {
          version: "web",
          href: "/read/john/1?highlight=1",
          entry: {
            version: "web",
            bookSlug: "john",
            bookName: "John",
            chapterNumber: 1,
            verseNumber: 1,
            text: "In the beginning was the Word, and the Word was with God.",
            greekTokens: [
              {
                surface: "λόγος",
                lemma: "λόγος",
                gloss: "Word",
                strongs: "G3056",
                entryKey: "G3056"
              }
            ]
          }
        },
        {
          version: "greek",
          href: "/read/john/1?highlight=1&version=greek",
          entry: {
            version: "greek",
            bookSlug: "john",
            bookName: "John",
            chapterNumber: 1,
            verseNumber: 1,
            text: "ἐν ἀρχῇ ἦν ὁ λόγος",
            greekTokens: [
              {
                surface: "λόγος",
                lemma: "λόγος",
                gloss: "word",
                strongs: "G3056",
                entryKey: "G3056",
                morphology: "N-NSM"
              }
            ]
          }
        },
        {
          version: "kjv",
          href: "/read/john/1?highlight=1&version=kjv",
          entry: {
            version: "kjv",
            bookSlug: "john",
            bookName: "John",
            chapterNumber: 1,
            verseNumber: 1,
            text: "In the beginning was the Word, and the Word was with God.",
            tokens: [{ text: "Word", strongsNumbers: ["G3056"] }]
          }
        }
      ]
    }
  ];

  return (
    <SearchStrongsParallelRows
      expandedVerseRows={expandedVerseRows}
      onOpenGreekDictionary={onOpenGreekDictionary}
      onOpenStrongs={onOpenStrongs}
      onToggleVerseRow={(row) =>
        setExpandedVerseRows((current) => ({
          ...current,
          [`G3056:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]:
            !current[`G3056:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]
        }))
      }
      rows={rows}
      strongsNumber="G3056"
    />
  );
}

describe("SearchStrongsParallelRows", () => {
  it("renders verse references collapsed by default and expands them inline", () => {
    render(<Harness />);

    expect(
      screen.queryByRole("region", { name: "Versions for Genesis 1:1" })
    ).not.toBeInTheDocument();

    const firstRow = screen.getByText("Genesis 1:1").closest("article");
    expect(firstRow).not.toBeNull();
    const firstVerseToggle = within(firstRow as HTMLElement).getByRole("button", {
      name: "Show versions"
    });
    expect(firstVerseToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(firstVerseToggle);

    expect(firstVerseToggle).toHaveAttribute("aria-expanded", "true");
    const expandedVerse = screen.getByRole("region", { name: "Versions for Genesis 1:1" });
    expect(within(expandedVerse).getByText("WEB")).toBeInTheDocument();
    expect(within(expandedVerse).getByText("KJV")).toBeInTheDocument();

    fireEvent.click(
      within(firstRow as HTMLElement).getByRole("button", { name: "Hide versions" })
    );

    expect(
      within(firstRow as HTMLElement).getByRole("button", { name: "Show versions" })
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: "Versions for Genesis 1:1" })
    ).not.toBeInTheDocument();
  });

  it("allows multiple verse rows to stay open without rendering navigation buttons", () => {
    render(<Harness />);

    const firstRow = screen.getByText("Genesis 1:1").closest("article");
    const secondRow = screen.getByText("Genesis 2:4").closest("article");

    expect(firstRow).not.toBeNull();
    expect(secondRow).not.toBeNull();

    fireEvent.click(
      within(firstRow as HTMLElement).getByRole("button", { name: "Show versions" })
    );
    fireEvent.click(
      within(secondRow as HTMLElement).getByRole("button", { name: "Show versions" })
    );

    const firstExpandedVerse = screen.getByRole("region", {
      name: "Versions for Genesis 1:1"
    });
    const secondExpandedVerse = screen.getByRole("region", {
      name: "Versions for Genesis 2:4"
    });

    expect(screen.getAllByRole("region", { name: /Versions for Genesis/i })).toHaveLength(2);
    expect(within(firstExpandedVerse).queryByRole("button", { name: "Open" })).toBeNull();
    expect(within(secondExpandedVerse).getByText("KJV")).toBeInTheDocument();
  });

  it("highlights non-KJV English versions for Strong's matches", () => {
    render(<Harness />);

    const firstRow = screen.getByText("Genesis 1:1").closest("article");
    expect(firstRow).not.toBeNull();

    fireEvent.click(
      within(firstRow as HTMLElement).getByRole("button", { name: "Show versions" })
    );

    const expandedVerse = screen.getByRole("region", { name: "Versions for Genesis 1:1" });
    const webSection = within(expandedVerse)
      .getByText("WEB")
      .closest(".search-strongs-parallel-cell");

    expect(webSection).not.toBeNull();
    expect((webSection as HTMLElement).querySelector(".strongs-inline-match")).not.toBeNull();
  });

  it("highlights KJV, Greek, and English lines for Greek Strong's matches", () => {
    renderWithReaderCustomization(<GreekHarness />);

    const firstRow = screen.getByText("John 1:1").closest("article");
    expect(firstRow).not.toBeNull();

    fireEvent.click(
      within(firstRow as HTMLElement).getByRole("button", { name: "Show versions" })
    );

    const expandedVerse = screen.getByRole("region", { name: "Versions for John 1:1" });
    const webSection = within(expandedVerse)
      .getByText("WEB")
      .closest(".search-strongs-parallel-cell");
    const greekSection = within(expandedVerse)
      .getByText("Greek")
      .closest(".search-strongs-parallel-cell");
    const kjvSection = within(expandedVerse)
      .getByText("KJV")
      .closest(".search-strongs-parallel-cell");

    expect(webSection).not.toBeNull();
    expect(greekSection).not.toBeNull();
    expect(kjvSection).not.toBeNull();
    expect((webSection as HTMLElement).querySelector(".strongs-inline-match")).not.toBeNull();
    expect((greekSection as HTMLElement).querySelector(".strongs-token-match")).not.toBeNull();
    expect((kjvSection as HTMLElement).querySelector(".strongs-token-match")).not.toBeNull();
  });

  it("stops verse-row clicks from bubbling to a parent click handler", () => {
    const onParentClick = jest.fn();

    render(
      <div onClick={onParentClick}>
        <Harness />
      </div>
    );

    const firstRow = screen.getByText("Genesis 1:1").closest("article");
    expect(firstRow).not.toBeNull();

    fireEvent.click(
      within(firstRow as HTMLElement).getByRole("button", { name: "Show versions" })
    );

    expect(onParentClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("region", { name: "Versions for Genesis 1:1" }));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
