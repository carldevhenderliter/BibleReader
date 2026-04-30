import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";

import { SearchStrongsParallelRows } from "@/app/components/SearchResultGroups";
import type { StrongsParallelVerseRow } from "@/lib/bible/strongs";

const rows: StrongsParallelVerseRow[] = [
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
  onOpenStrongs = jest.fn()
}: {
  onOpenStrongs?: (strongsNumbers: string[], label?: string | null) => void;
}) {
  const [expandedVerseRows, setExpandedVerseRows] = useState<Record<string, boolean>>({});

  return (
    <SearchStrongsParallelRows
      expandedVerseRows={expandedVerseRows}
      onOpenStrongs={onOpenStrongs}
      onToggleVerseRow={(row) =>
        setExpandedVerseRows((current) => ({
          ...current,
          [`H7225:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]:
            !current[`H7225:${row.bookSlug}:${row.chapterNumber}:${row.verseNumber}`]
        }))
      }
      rows={rows}
      strongsNumber="H7225"
    />
  );
}

describe("SearchStrongsParallelRows", () => {
  it("renders verse references collapsed by default and expands them inline", () => {
    render(<Harness />);

    expect(
      screen.queryByRole("region", { name: "Versions for Genesis 1:1" })
    ).not.toBeInTheDocument();

    const firstVerseToggle = screen.getByRole("button", { name: /Genesis 1:1/i });
    expect(firstVerseToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(firstVerseToggle);

    expect(firstVerseToggle).toHaveAttribute("aria-expanded", "true");
    const expandedVerse = screen.getByRole("region", { name: "Versions for Genesis 1:1" });
    expect(within(expandedVerse).getByText("WEB")).toBeInTheDocument();
    expect(within(expandedVerse).getByText("KJV")).toBeInTheDocument();

    fireEvent.click(firstVerseToggle);

    expect(firstVerseToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("region", { name: "Versions for Genesis 1:1" })
    ).not.toBeInTheDocument();
  });

  it("allows multiple verse rows to stay open without rendering navigation buttons", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /Genesis 1:1/i }));
    fireEvent.click(screen.getByRole("button", { name: /Genesis 2:4/i }));

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

  it("stops verse-row clicks from bubbling to a parent click handler", () => {
    const onParentClick = jest.fn();

    render(
      <div onClick={onParentClick}>
        <Harness />
      </div>
    );

    fireEvent.click(screen.getByRole("button", { name: /Genesis 1:1/i }));

    expect(onParentClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("region", { name: "Versions for Genesis 1:1" }));

    expect(onParentClick).not.toHaveBeenCalled();
  });
});
