import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

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
      <body>
        <div className="ambient-orb ambient-orb-left" aria-hidden="true" />
        <div className="ambient-orb ambient-orb-right" aria-hidden="true" />
        <div className="ambient-grid" aria-hidden="true" />
        <div className="site-shell">
          <header className="site-header">
            <div className="site-branding">
              <span className="site-badge">LIVE CANON</span>
              <Link className="site-brand" href="/">
                Bible Reader
              </Link>
            </div>
            <div className="site-header-meta">
              <p className="site-subtitle">World English Bible</p>
              <p className="site-header-copy">Genesis to Revelation in a focused digital reader</p>
            </div>
          </header>
          <main className="site-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
