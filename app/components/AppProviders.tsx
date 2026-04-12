"use client";

import type { PropsWithChildren } from "react";

import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderTtsProvider } from "@/app/components/ReaderTtsProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
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
            <VerseTranslationOverridesProvider>
              <GreekGlossOverridesProvider>
                <ReaderCustomizationProvider>
                  <ReaderTtsProvider>
                    <SearchCustomizationProvider>{children}</SearchCustomizationProvider>
                  </ReaderTtsProvider>
                </ReaderCustomizationProvider>
              </GreekGlossOverridesProvider>
            </VerseTranslationOverridesProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}
