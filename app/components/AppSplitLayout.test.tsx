import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { setMockPathname } from "@/test/mocks/next-navigation";

const SPLIT_SEARCH_WIDTH_STORAGE_KEY = "bible-reader.split-search-width-rem";
const SPLIT_STUDY_WIDTH_STORAGE_KEY = "bible-reader.split-study-width-rem";
const SPLIT_COLLAPSED_PANES_STORAGE_KEY = "bible-reader.split-collapsed-panes";
const APP_LAYOUT_MAX_WIDTH_REM = 103.25;
const SEARCH_SHELL_VIEWPORT_MARGIN_REM = 2.7;
const SPLIT_PANE_DIVIDER_WIDTH_REM = 0.875;

function getMinimumVisiblePaneWidthRem(viewportWidth = window.innerWidth) {
  const viewportWidthRem = viewportWidth / 16;
  const contentWidthRem = Math.min(
    APP_LAYOUT_MAX_WIDTH_REM,
    Math.max(0, viewportWidthRem - SEARCH_SHELL_VIEWPORT_MARGIN_REM)
  );

  return (contentWidthRem - SPLIT_PANE_DIVIDER_WIDTH_REM * 2) / 3;
}

function renderSplitLayout() {
  return render(
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <ReaderCustomizationProvider>
            <SearchCustomizationProvider>
              <AppSplitLayout>
                <div>Reader content</div>
              </AppSplitLayout>
              <BottomSearchBar />
            </SearchCustomizationProvider>
          </ReaderCustomizationProvider>
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
      media: "(min-width: 64rem)",
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn()
    }))
  });
}

function setNavigatorDevice({
  maxTouchPoints = 0,
  platform = "MacIntel",
  userAgent = "Mozilla/5.0"
}: {
  maxTouchPoints?: number;
  platform?: string;
  userAgent?: string;
} = {}) {
  Object.defineProperty(window.navigator, "maxTouchPoints", {
    configurable: true,
    value: maxTouchPoints
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: platform
  });
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent
  });
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width
  });
}

function getVisiblePaneWidths(layout: Element | null) {
  const styleValue = layout?.getAttribute("style") ?? "";
  const match = styleValue.match(
    /grid-template-columns:\s*(?:3rem\s+)?minmax\(0,\s*1fr\)\s+0\.875rem\s+([0-9.]+)rem(?:\s+0\.875rem\s+([0-9.]+)rem)?/
  );

  if (!match) {
    throw new Error(`Unable to read pane widths from layout style: ${styleValue}`);
  }

  return {
    search: Number(match[1]),
    study: Number(match[2] ?? 0)
  };
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
    setNavigatorDevice();
    setViewportWidth(1600);
  });

  it("renders separate reader-search and search-study dividers in split view", () => {
    renderSplitLayout();

    expect(screen.getByRole("button", { name: "Resize reader and search panes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resize search and study panes" })).toBeInTheDocument();
  });

  it("keeps split view active on iPad widths below the desktop breakpoint", () => {
    setDesktopMode(false);
    setNavigatorDevice({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15"
    });
    setViewportWidth(820);

    renderSplitLayout();

    expect(screen.getByRole("button", { name: "Resize reader and search panes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search pane")).toBeInTheDocument();
    expect(screen.getByLabelText("Study pane")).toBeInTheDocument();
  });

  it("does not let the search pane shrink below one third of the split layout", () => {
    const { container } = renderSplitLayout();
    const divider = screen.getByRole("button", { name: "Resize reader and search panes" });
    const layout = container.querySelector(".app-layout");
    const minimumPaneWidthRem = getMinimumVisiblePaneWidthRem();

    fireEvent.pointerDown(divider, { clientX: 1000 });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 808 }));
      window.dispatchEvent(new PointerEvent("pointerup", { clientX: 808 }));
    });

    expect(getVisiblePaneWidths(layout).search).toBeCloseTo(minimumPaneWidthRem, 1);
    expect(Number(window.localStorage.getItem(SPLIT_SEARCH_WIDTH_STORAGE_KEY))).toBeCloseTo(
      minimumPaneWidthRem,
      1
    );
  });

  it("does not let the study pane shrink below one third of the split layout", () => {
    const { container } = renderSplitLayout();
    const divider = screen.getByRole("button", { name: "Resize search and study panes" });
    const layout = container.querySelector(".app-layout");
    const minimumPaneWidthRem = getMinimumVisiblePaneWidthRem();

    fireEvent.pointerDown(divider, { clientX: 1000 });
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 840 }));
      window.dispatchEvent(new PointerEvent("pointerup", { clientX: 840 }));
    });

    expect(getVisiblePaneWidths(layout).study).toBeCloseTo(minimumPaneWidthRem, 1);
    expect(Number(window.localStorage.getItem(SPLIT_STUDY_WIDTH_STORAGE_KEY))).toBeCloseTo(
      minimumPaneWidthRem,
      1
    );
  });

  it("restores saved search and study pane widths", async () => {
    window.localStorage.setItem(SPLIT_SEARCH_WIDTH_STORAGE_KEY, "24");
    window.localStorage.setItem(SPLIT_STUDY_WIDTH_STORAGE_KEY, "22");
    const { container } = renderSplitLayout();
    const minimumPaneWidthRem = getMinimumVisiblePaneWidthRem();

    await waitFor(() => {
      const widths = getVisiblePaneWidths(container.querySelector(".app-layout"));

      expect(widths.search).toBeCloseTo(minimumPaneWidthRem, 1);
      expect(widths.study).toBeCloseTo(minimumPaneWidthRem, 1);
    });
  });

  it("restores collapsed panes as rails and allows reopening them", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: false, search: true, study: false })
    );

    renderSplitLayout();

    expect(await screen.findByLabelText("Collapsed panes dock")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Show search pane" }));

    expect(await screen.findByLabelText("Search pane")).toBeInTheDocument();
  });

  it("collapses and reopens the study pane from its hide control", async () => {
    renderSplitLayout();

    fireEvent.click(screen.getByRole("button", { name: "Hide study pane" }));

    expect(await screen.findByLabelText("Collapsed panes dock")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Show study pane" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show study pane" }));

    expect(await screen.findByLabelText("Study pane")).toBeInTheDocument();
  });

  it("stacks multiple collapsed pane buttons in the shared left dock", async () => {
    window.localStorage.setItem(
      SPLIT_COLLAPSED_PANES_STORAGE_KEY,
      JSON.stringify({ reader: true, search: true, study: false })
    );

    renderSplitLayout();

    const dock = await screen.findByLabelText("Collapsed panes dock");
    const dockButtons = within(dock).getAllByRole("button");

    expect(dockButtons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Show reader pane",
      "Show search pane"
    ]);
  });

  it("does not render split dividers on mobile", () => {
    setDesktopMode(false);
    setNavigatorDevice({
      maxTouchPoints: 5,
      platform: "iPhone",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    });

    renderSplitLayout();

    expect(screen.queryByRole("button", { name: "Resize reader and search panes" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resize search and study panes" })).not.toBeInTheDocument();
  });
});
