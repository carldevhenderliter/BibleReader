import { render, screen } from "@testing-library/react";

import { ContinueListening } from "@/app/components/ContinueListening";
import { LAST_AUDIO_SESSION_STORAGE_KEY } from "@/lib/bible/constants";

describe("ContinueListening", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("restores the saved audio session", async () => {
    window.localStorage.setItem(
      LAST_AUDIO_SESSION_STORAGE_KEY,
      JSON.stringify({
        autoplayKey: "galatians",
        bookSlug: "galatians",
        bookName: "Galatians",
        chapter: 1,
        view: "chapter",
        version: "web",
        href: "/read/galatians/1"
      })
    );

    render(<ContinueListening />);

    expect(await screen.findByRole("link", { name: "Resume audio Galatians" })).toHaveAttribute(
      "href",
      "/read/galatians/1"
    );
  });
});
