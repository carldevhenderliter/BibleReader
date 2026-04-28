import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { BibleGreekUndertextProvider } from "@/app/components/BibleGreekUndertextProvider";
import { BottomSearchBar } from "@/app/components/BottomSearchBar";
import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import { ReaderBottomBarProvider } from "@/app/components/ReaderBottomBarProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";
import { WritingAssistantProvider } from "@/app/components/WritingAssistantProvider";

type WrapperProps = {
  children: ReactNode;
};

function Wrapper({ children }: WrapperProps) {
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
                      <SearchCustomizationProvider>
                        {children}
                        <BottomSearchBar />
                      </SearchCustomizationProvider>
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

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
