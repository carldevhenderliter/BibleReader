import { render, screen } from "@testing-library/react";

import { ContinueReading } from "@/app/components/ContinueReading";
import { LAST_READING_STORAGE_KEY } from "@/lib/bible/constants";

describe("ContinueReading", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores the saved passage and version", async () => {
    window.localStorage.setItem(
      LAST_READING_STORAGE_KEY,
      JSON.stringify({
        book: "john",
        chapter: 3,
        view: "chapter",
        version: "kjv"
      })
    );

    render(<ContinueReading />);

    expect(await screen.findByRole("link", { name: "Continue reading KJV" })).toHaveAttribute(
      "href",
      "/read/john/3?version=kjv"
    );
  });
});
