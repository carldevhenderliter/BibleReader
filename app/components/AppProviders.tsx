"use client";

import type { PropsWithChildren } from "react";

import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>{children}</LookupProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}
