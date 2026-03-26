import { notFound } from "next/navigation";
import { screen } from "@testing-library/react";

import BookPage from "@/app/read/[book]/page";
import * as bibleData from "@/lib/bible/data";
import { renderWithReaderCustomization } from "@/test/utils/render-with-reader-customization";

jest.mock("@/lib/bible/data");

const mockedGetBooks = jest.mocked(bibleData.getBooks);
const mockedGetBookBySlug = jest.mocked(bibleData.getBookBySlug);
const mockedGetBookPayload = jest.mocked(bibleData.getBookPayload);

describe("BookPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the whole-book view with bundled versions", async () => {
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
    mockedGetBookPayload.mockResolvedValue({
      book: {
        slug: "genesis",
        name: "Genesis",
        abbreviation: "Gen",
        testament: "Old",
        chapterCount: 50,
        order: 1
      },
      chapters: [
        {
          bookSlug: "genesis",
          chapterNumber: 1,
          verses: [{ number: 1, text: "In the beginning, God created the heavens and the earth." }]
        }
      ]
    });

    const element = await BookPage({
      params: Promise.resolve({
        book: "genesis"
      })
    });

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "Genesis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
    expect(mockedGetBooks).toHaveBeenCalledWith("web");
    expect(mockedGetBookBySlug).toHaveBeenCalledWith("genesis", "web");
    expect(mockedGetBookPayload).toHaveBeenNthCalledWith(1, "genesis", "web");
    expect(mockedGetBookPayload).toHaveBeenNthCalledWith(2, "genesis", "kjv");
  });

  it("calls notFound when whole-book data is missing", async () => {
    mockedGetBooks.mockResolvedValue([]);
    mockedGetBookBySlug.mockResolvedValue(null);
    mockedGetBookPayload.mockResolvedValue(null);

    await expect(
      BookPage({
        params: Promise.resolve({
          book: "missing"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });
});
