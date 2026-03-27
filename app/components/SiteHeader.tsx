"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();

  if (pathname.includes("/read")) {
    return null;
  }

  return (
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
  );
}
