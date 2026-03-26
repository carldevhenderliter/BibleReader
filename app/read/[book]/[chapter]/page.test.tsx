import { notFound } from "next/navigation";
import { screen } from "@testing-library/react";

import ReaderChapterPage from "@/app/read/[book]/[chapter]/page";
import * as bibleData from "@/lib/bible/data";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/bible/data");

const mockedGetBooks = jest.mocked(bibleData.getBooks);
const mockedGetBookBySlug = jest.mocked(bibleData.getBookBySlug);
const mockedGetChapter = jest.mocked(bibleData.getChapter);

describe("ReaderChapterPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls notFound for invalid params", async () => {
    await expect(
      ReaderChapterPage({
        params: Promise.resolve({
          book: "genesis",
          chapter: "0"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound when the book or chapter cannot be loaded", async () => {
    mockedGetBooks.mockResolvedValue([]);
    mockedGetBookBySlug.mockResolvedValue(null);
    mockedGetChapter.mockResolvedValue(null);

    await expect(
      ReaderChapterPage({
        params: Promise.resolve({
          book: "missing",
          chapter: "1"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders a chapter when params resolves successfully", async () => {
    mockedGetBooks.mockResolvedValue([
      {
        slug: "genesis",
        name: "Genesis",
        abbreviation: "Gen",
        testament: "Old",
        chapterCount: 50,
        order: 1
      }
    ]);
    mockedGetBookBySlug.mockResolvedValue({
      slug: "genesis",
      name: "Genesis",
      abbreviation: "Gen",
      testament: "Old",
      chapterCount: 50,
      order: 1
    });
    mockedGetChapter.mockResolvedValue({
      bookSlug: "genesis",
      chapterNumber: 1,
      verses: [{ number: 1, text: "In the beginning, God created the heavens and the earth." }]
    });

    const element = await ReaderChapterPage({
      params: Promise.resolve({
        book: "genesis",
        chapter: "1"
      })
    });

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "Genesis 1" })).toBeInTheDocument();
    expect(
      screen.getByText("In the beginning, God created the heavens and the earth.")
    ).toBeInTheDocument();
    expect(mockedGetBooks).toHaveBeenCalledWith("web");
    expect(mockedGetBookBySlug).toHaveBeenCalledWith("genesis", "web");
    expect(mockedGetChapter).toHaveBeenNthCalledWith(1, "genesis", 1, "web");
    expect(mockedGetChapter).toHaveBeenNthCalledWith(2, "genesis", 1, "kjv");
  });
});
