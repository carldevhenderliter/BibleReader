"use client";

import type { PropsWithChildren } from "react";

import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { BibleGreekUndertextProvider } from "@/app/components/BibleGreekUndertextProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderBottomBarProvider } from "@/app/components/ReaderBottomBarProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
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
              <BibleGreekUndertextProvider>
                <GreekGlossOverridesProvider>
                  <ReaderCustomizationProvider>
                    <ReaderBottomBarProvider>
                      <SearchCustomizationProvider>{children}</SearchCustomizationProvider>
                    </ReaderBottomBarProvider>
                  </ReaderCustomizationProvider>
                </GreekGlossOverridesProvider>
              </BibleGreekUndertextProvider>
            </VerseTranslationOverridesProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}
