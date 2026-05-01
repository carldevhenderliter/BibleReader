import { render, screen } from "@testing-library/react";

import { VerseTextContent } from "@/app/components/VerseTextContent";
import type { Verse } from "@/lib/bible/types";

const SAMPLE_VERSE: Verse = {
  number: 32,
  text: "But I say unto you, That whosoever shall put away his wife, saving for the cause of fornication.",
  tokens: [
    { text: "But I say unto you, That whosoever shall put away his wife, saving " },
    { text: "for the cause", strongsNumbers: ["G3056"] },
    { text: " of fornication." }
  ]
};

describe("VerseTextContent", () => {
  it("highlights the selected Strong's token in tagged verses", () => {
    const { container } = render(
      <VerseTextContent
        highlightedStrongsNumber="G3056"
        onOpenStrongs={() => {}}
        showStrongs
        verse={SAMPLE_VERSE}
      />
    );

    expect(container.querySelector("button.strongs-token-match")).not.toBeNull();
    expect(screen.getByRole("button", { name: /for the cause G3056/i })).toBeInTheDocument();
  });

  it("highlights plain-text phrase matches when token data is unavailable", () => {
    render(
      <VerseTextContent
        highlightedPhrases={["word", "God"]}
        verse={{
          number: 1,
          text: "The word of God came.",
          tokens: []
        }}
      />
    );

    const highlights = screen.getAllByText(/word|God/i);
    expect(highlights.every((node) => node.tagName === "MARK")).toBe(true);
  });
});
