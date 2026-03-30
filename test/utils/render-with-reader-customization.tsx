import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
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
            <ReaderCustomizationProvider>
              <SearchCustomizationProvider>{children}</SearchCustomizationProvider>
            </ReaderCustomizationProvider>
          </LookupProvider>
        </WritingAssistantProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
