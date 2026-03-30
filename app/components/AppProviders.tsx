"use client";

import type { PropsWithChildren } from "react";

import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <WritingAssistantProvider>
          <LookupProvider>
            <ReaderCustomizationProvider>
              <SearchCustomizationProvider>{children}</SearchCustomizationProvider>
            </ReaderCustomizationProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}
