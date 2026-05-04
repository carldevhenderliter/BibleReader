import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { BibleGreekUndertextProvider } from "@/app/components/BibleGreekUndertextProvider";
import { GreekGlossOverridesProvider } from "@/app/components/GreekGlossOverridesProvider";
import {
  ReaderBottomBarProvider,
  useReaderBottomBar
} from "@/app/components/ReaderBottomBarProvider";
import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { VerseTranslationOverridesProvider } from "@/app/components/VerseTranslationOverridesProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";
import { SearchCustomizationProvider } from "@/app/components/SearchCustomizationProvider";

type WrapperProps = {
  children: ReactNode;
};

function ReaderBottomBarTestHost() {
  const { bottomBarPanel } = useReaderBottomBar();

  return bottomBarPanel ? <div data-testid="reader-bottom-bar-test-host">{bottomBarPanel}</div> : null;
}

function Wrapper({ children }: WrapperProps) {
  return (
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <VerseTranslationOverridesProvider>
            <BibleGreekUndertextProvider>
              <GreekGlossOverridesProvider>
                <ReaderCustomizationProvider>
                  <ReaderBottomBarProvider>
                    <SearchCustomizationProvider>
                      {children}
                      <ReaderBottomBarTestHost />
                    </SearchCustomizationProvider>
                  </ReaderBottomBarProvider>
                </ReaderCustomizationProvider>
              </GreekGlossOverridesProvider>
            </BibleGreekUndertextProvider>
          </VerseTranslationOverridesProvider>
        </LookupProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
