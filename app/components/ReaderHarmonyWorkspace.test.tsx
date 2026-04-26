import { fireEvent, render, screen } from "@testing-library/react";

import { ReaderHarmonyWorkspace } from "@/app/components/ReaderHarmonyWorkspace";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { GOSPEL_HARMONY_DOCUMENTS_STORAGE_KEY } from "@/lib/gospel-harmony";

function renderHarmonyWorkspace() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <ReaderHarmonyWorkspace />
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

describe("ReaderHarmonyWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates a local Gospel harmony document", () => {
    renderHarmonyWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "New harmony" }));

    expect(screen.getByLabelText("Harmony document title")).toHaveValue(
      "Chronological Harmony of the Gospels"
    );
    expect(screen.getByText("Prologue and Genealogies")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /John 1:1-18/i }).length).toBeGreaterThan(0);
  });

  it("stores created harmony documents in local storage", () => {
    renderHarmonyWorkspace();

    fireEvent.click(screen.getByRole("button", { name: "New harmony" }));
    fireEvent.change(screen.getByLabelText("Harmony document title"), {
      target: { value: "My Gospel Harmony" }
    });

    const stored = window.localStorage.getItem(GOSPEL_HARMONY_DOCUMENTS_STORAGE_KEY) ?? "";

    expect(stored).toContain("My Gospel Harmony");
    expect(stored).toContain("Prologue and Genealogies");
  });
});
