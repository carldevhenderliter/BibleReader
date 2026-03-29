import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { setMockPathname } from "@/test/mocks/next-navigation";

const SPLIT_LAYOUT_WIDTH_STORAGE_KEY = "bible-reader.split-layout-width-rem";

function renderSplitLayout() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <AppSplitLayout>
            <div>Reader content</div>
          </AppSplitLayout>
          <BottomSearchBar />
        </LookupProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

function setDesktopMode(isDesktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      matches: isDesktop,
      media: "(min-width: 80rem)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
}

describe("AppSplitLayout", () => {
  beforeEach(() => {
    if (!("PointerEvent" in window)) {
      Object.defineProperty(window, "PointerEvent", {
        configurable: true,
        writable: true,
        value: MouseEvent
      });
    }

    window.localStorage.clear();
    jest.clearAllMocks();
    setMockPathname("/");
    setDesktopMode(true);
    setViewportWidth(1600);
  });

  it("renders a draggable desktop divider", () => {
    renderSplitLayout();

    expect(screen.getByRole("button", { name: "Resize split view" })).toBeInTheDocument();
  });

  it("updates and persists the split width when dragged", () => {
    const { container } = renderSplitLayout();
    const divider = screen.getByRole("button", { name: "Resize split view" });
    const layout = container.querySelector(".app-layout");

    fireEvent.pointerDown(divider, { clientX: 1000 });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 840 }));
      window.dispatchEvent(new PointerEvent("pointerup", { clientX: 840 }));
    });

    expect(layout).toHaveStyle("--app-layout-lookup-width: 34rem");
    expect(window.localStorage.getItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY)).toBe("34");
  });

  it("restores a saved split width on desktop", () => {
    window.localStorage.setItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY, "40");
    const { container } = renderSplitLayout();

    return waitFor(() => {
      expect(container.querySelector(".app-layout")).toHaveStyle("--app-layout-lookup-width: 40rem");
    });
  });

  it("clamps a saved split width to 75 percent of the viewport", () => {
    setViewportWidth(800);
    window.localStorage.setItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY, "80");
    const { container } = renderSplitLayout();

    return waitFor(() => {
      expect(container.querySelector(".app-layout")).toHaveStyle("--app-layout-lookup-width: 37.5rem");
    });
  });

  it("grows the lookup side automatically from the number of query columns without exceeding the cap", async () => {
    setViewportWidth(800);
    const { container } = renderSplitLayout();

    fireEvent.focus(screen.getByLabelText("Search books, words, or phrases"));
    fireEvent.change(screen.getByLabelText("Search books, words, or phrases"), {
      target: { value: "John 1:1, light, faith, grace" }
    });

    await screen.findByRole("button", { name: /Verse John 1:1/i });

    await waitFor(() => {
      expect(container.querySelector(".app-layout")).toHaveStyle("--app-layout-lookup-width: 37.5rem");
    });
  });

  it("does not render the desktop divider on mobile", () => {
    setDesktopMode(false);
    renderSplitLayout();

    expect(screen.queryByRole("button", { name: "Resize split view" })).not.toBeInTheDocument();
  });
});
