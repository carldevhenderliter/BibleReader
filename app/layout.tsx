import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Script from "next/script";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { AppProviders } from "@/app/components/AppProviders";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { SiteHeader } from "@/app/components/SiteHeader";

import "./globals.css";

const BROWSER_COMPAT_POLYFILLS = `
(function () {
  function defineIfMissing(target, key, value) {
    if (key in target) return;
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value: value
    });
  }

  defineIfMissing(Array.prototype, "at", function (index) {
    var length = this.length >>> 0;
    var normalizedIndex = Math.trunc(index) || 0;
    var resolvedIndex = normalizedIndex >= 0 ? normalizedIndex : length + normalizedIndex;
    if (resolvedIndex < 0 || resolvedIndex >= length) return undefined;
    return this[resolvedIndex];
  });

  defineIfMissing(Array.prototype, "flatMap", function (callback, thisArg) {
    var mapped = this.map(function (value, index, array) {
      return callback.call(thisArg, value, index, array);
    });
    var flattened = [];
    for (var i = 0; i < mapped.length; i += 1) {
      var item = mapped[i];
      if (Array.isArray(item)) {
        flattened.push.apply(flattened, item);
      } else {
        flattened.push(item);
      }
    }
    return flattened;
  });

  defineIfMissing(Object, "fromEntries", function (entries) {
    var result = {};
    for (var iterator = entries[Symbol.iterator](), step = iterator.next(); !step.done; step = iterator.next()) {
      var entry = step.value;
      result[entry[0]] = entry[1];
    }
    return result;
  });

  defineIfMissing(String.prototype, "matchAll", function (expression) {
    var sourceExpression =
      expression instanceof RegExp ? expression : new RegExp(String(expression), "g");
    var flags = sourceExpression.flags.indexOf("g") >= 0
      ? sourceExpression.flags
      : sourceExpression.flags + "g";
    var matcher = new RegExp(sourceExpression.source, flags);
    var source = String(this);

    return {
      [Symbol.iterator]: function () {
        return this;
      },
      next: function () {
        var nextMatch = matcher.exec(source);
        if (!nextMatch) {
          return { done: true, value: undefined };
        }
        return { done: false, value: nextMatch };
      }
    };
  });
}());
`;

export const metadata: Metadata = {
  title: "Bible Reader",
  description: "A simple, complete Bible reading experience from Genesis to Revelation."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="browser-compat-polyfills"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: BROWSER_COMPAT_POLYFILLS }}
        />
      </head>
      <body>
        <AppProviders>
          <div className="ambient-orb ambient-orb-left" aria-hidden="true" />
          <div className="ambient-orb ambient-orb-right" aria-hidden="true" />
          <div className="ambient-grid" aria-hidden="true" />
          <div className="site-shell">
            <SiteHeader />
            <AppSplitLayout>{children}</AppSplitLayout>
            <BottomSearchBar />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
