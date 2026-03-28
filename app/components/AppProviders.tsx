"use client";

import type { PropsWithChildren } from "react";

import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReaderVersionProvider>
      <LookupProvider>{children}</LookupProvider>
    </ReaderVersionProvider>
  );
}
