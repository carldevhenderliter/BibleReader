import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppSplitLayout } from "@/app/components/AppSplitLayout";
import { AppProviders } from "@/app/components/AppProviders";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { SiteHeader } from "@/app/components/SiteHeader";

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
