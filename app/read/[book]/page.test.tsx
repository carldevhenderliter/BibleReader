import { notFound, redirect } from "next/navigation";
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

  it("redirects to chapter one when whole-book mode is not requested", async () => {
    await expect(
      BookPage({
        params: Promise.resolve({
          book: "genesis"
        }),
        searchParams: Promise.resolve({
          version: "kjv"
        })
      })
    ).rejects.toThrow("NEXT_REDIRECT:/read/genesis/1?version=kjv");

    expect(redirect).toHaveBeenCalledWith("/read/genesis/1?version=kjv");
  });

  it("renders the whole-book view when view=book for KJV", async () => {
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
      }),
      searchParams: Promise.resolve({
        view: "book",
        version: "kjv"
      })
    });

    renderWithReaderCustomization(element);

    expect(screen.getByRole("heading", { name: "Genesis" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chapter 1" })).toBeInTheDocument();
    expect(mockedGetBooks).toHaveBeenCalledWith("kjv");
    expect(mockedGetBookBySlug).toHaveBeenCalledWith("genesis", "kjv");
    expect(mockedGetBookPayload).toHaveBeenCalledWith("genesis", "kjv");
  });

  it("calls notFound when whole-book data is missing", async () => {
    mockedGetBooks.mockResolvedValue([]);
    mockedGetBookBySlug.mockResolvedValue(null);
    mockedGetBookPayload.mockResolvedValue(null);

    await expect(
      BookPage({
        params: Promise.resolve({
          book: "missing"
        }),
        searchParams: Promise.resolve({
          view: "book",
          version: "kjv"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalled();
  });

  it("calls notFound for ESV whole-book requests when ESV is unavailable", async () => {
    await expect(
      BookPage({
        params: Promise.resolve({
          book: "genesis"
        }),
        searchParams: Promise.resolve({
          view: "book",
          version: "esv"
        })
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
