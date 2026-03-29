import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { VerseList } from "@/app/components/VerseList";
import type { Verse } from "@/lib/bible/types";

const verses: Verse[] = [
  {
    number: 1,
    text: "In the beginning God created the heaven and the earth.",
    tokens: [
      {
        text: "In the beginning",
        strongsNumbers: ["H7225"]
      },
      {
        text: " God created the heaven and the earth."
      }
    ]
  }
];

describe("VerseList", () => {
  it("renders plain text when Strongs is disabled", () => {
    render(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs={false}
        verses={verses}
      />
    );

    expect(screen.getByText("In the beginning God created the heaven and the earth.")).toBeInTheDocument();
    expect(screen.queryByText("H7225")).not.toBeInTheDocument();
  });

  it("opens a Strongs popup from a tagged token", async () => {
    render(
      <VerseList
        bookSlug="genesis"
        chapterNumber={1}
        showStrongs
        verses={verses}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /In the beginning H7225/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getAllByText("H7225").length).toBeGreaterThan(0);
      expect(screen.getByText(/Transliteration:/i)).toBeInTheDocument();
    });
  });
});
