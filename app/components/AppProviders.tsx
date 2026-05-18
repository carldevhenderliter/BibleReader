"use client";

import type { PropsWithChildren } from "react";

import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { BibleGreekUndertextProvider } from "@/app/components/BibleGreekUndertextProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { MobilePreviewProvider } from "@/app/components/MobilePreviewProvider";
import { ReaderBottomBarProvider } from "@/app/components/ReaderBottomBarProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <MobilePreviewProvider>
      <ReaderVersionProvider>
        <ReaderWorkspaceProvider>
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
        </ReaderWorkspaceProvider>
      </ReaderVersionProvider>
    </MobilePreviewProvider>
  );
}
