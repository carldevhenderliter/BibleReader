"use client";

import type { PropsWithChildren } from "react";

import { useReaderCustomization } from "@/app/components/ReaderCustomizationProvider";

type ReaderCustomizationShellProps = PropsWithChildren<{
  className?: string;
}>;

export function ReaderCustomizationShell({
  children,
  className = ""
}: ReaderCustomizationShellProps) {
  const { style } = useReaderCustomization();

  return (
    <div className={className.trim()} style={style}>
      {children}
    </div>
  );
}
