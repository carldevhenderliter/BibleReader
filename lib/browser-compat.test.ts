import { installBrowserCompatPolyfills } from "@/lib/browser-compat";

describe("installBrowserCompatPolyfills", () => {
  it("leaves required compatibility helpers available", () => {
    installBrowserCompatPolyfills();

    expect(typeof Array.prototype.at).toBe("function");
    expect(typeof Array.prototype.flatMap).toBe("function");
    expect(typeof Object.fromEntries).toBe("function");
    expect(typeof String.prototype.matchAll).toBe("function");
  });
});
