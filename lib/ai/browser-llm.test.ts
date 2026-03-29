import {
  getLocalBibleAiAvailability,
  normalizeLocalBibleAiProgress,
  resetLocalBibleAiForTests
} from "@/lib/ai/browser-llm";

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

function setNavigatorState({
  userAgent = "Mozilla/5.0",
  gpu = {}
}: {
  userAgent?: string;
  gpu?: object | undefined;
}) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent
  });
  Object.defineProperty(window.navigator, "gpu", {
    configurable: true,
    value: gpu
  });
}

describe("browser llm availability", () => {
  beforeEach(() => {
    resetLocalBibleAiForTests();
  });

  it("supports desktop browsers with WebGPU", () => {
    setDesktopMode(true);
    setNavigatorState({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      gpu: {}
    });

    expect(getLocalBibleAiAvailability()).toEqual({
      isSupported: true,
      reason: ""
    });
  });

  it("disables local AI on touch mobile devices", () => {
    setDesktopMode(true);
    setNavigatorState({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      gpu: {}
    });

    expect(getLocalBibleAiAvailability()).toEqual({
      isSupported: false,
      reason: "Local AI is desktop-first right now."
    });
  });

  it("normalizes init progress into UI-friendly values", () => {
    expect(
      normalizeLocalBibleAiProgress({
        progress: 1.4,
        timeElapsed: 123,
        text: "  Loading model  "
      })
    ).toEqual({
      progress: 1,
      label: "Loading model"
    });
  });
});
