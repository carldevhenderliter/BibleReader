"use client";

import type { PropsWithChildren } from "react";

import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return <ReaderVersionProvider>{children}</ReaderVersionProvider>;
}
