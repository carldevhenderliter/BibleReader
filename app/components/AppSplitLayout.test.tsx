import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { setMockPathname } from "@/test/mocks/next-navigation";

const SPLIT_LAYOUT_WIDTH_STORAGE_KEY = "bible-reader.split-layout-width-rem";
const SEARCH_INPUT_LABEL = "Search books, words, phrases, or Strongs numbers";

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

  it("renders a draggable desktop divider", () => {
    renderSplitLayout();

    expect(screen.getByRole("button", { name: "Resize split view" })).toBeInTheDocument();
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

    expect(layout).toHaveStyle("--app-layout-lookup-width: 30rem");
    expect(window.localStorage.getItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY)).toBe("30");
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

  it("clamps a saved split width to the lower minimum lookup width", () => {
    window.localStorage.setItem(SPLIT_LAYOUT_WIDTH_STORAGE_KEY, "8");
    const { container } = renderSplitLayout();

    return waitFor(() => {
      expect(container.querySelector(".app-layout")).toHaveStyle("--app-layout-lookup-width: 18rem");
    });
  });

  it("grows the lookup side automatically from the number of query columns without exceeding the cap", async () => {
    setViewportWidth(800);
    const { container } = renderSplitLayout();

    fireEvent.focus(screen.getByLabelText(SEARCH_INPUT_LABEL));
    fireEvent.change(screen.getByLabelText(SEARCH_INPUT_LABEL), {
      target: { value: "John 1:1, light, faith, grace" }
    });

    await screen.findByRole("button", { name: /Verse John 1:1/i });

    await waitFor(() => {
      expect(container.querySelector(".app-layout")).toHaveStyle("--app-layout-lookup-width: 37.5rem");
    });
  });

  it("does not render the desktop divider on mobile", () => {
    setDesktopMode(false);
    setNavigatorDevice({
      maxTouchPoints: 5,
      platform: "iPhone",
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
    });
    renderSplitLayout();

    expect(screen.queryByRole("button", { name: "Resize split view" })).not.toBeInTheDocument();
  });

  it("keeps the divider available after an iPad portrait resize", async () => {
    setDesktopMode(false);
    setNavigatorDevice({
      maxTouchPoints: 5,
      platform: "MacIntel",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15"
    });
    setViewportWidth(1024);

    renderSplitLayout();

    expect(screen.getByRole("button", { name: "Resize split view" })).toBeInTheDocument();

    setViewportWidth(768);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Resize split view" })).toBeInTheDocument();
    });
  });
});
