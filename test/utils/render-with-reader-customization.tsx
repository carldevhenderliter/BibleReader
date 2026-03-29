import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderWorkspaceProvider } from "@/app/components/ReaderWorkspaceProvider";
import { LookupProvider } from "@/app/components/LookupProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

type WrapperProps = {
  children: ReactNode;
};

function Wrapper({ children }: WrapperProps) {
  return (
    <ReaderVersionProvider>
      <ReaderWorkspaceProvider>
        <LookupProvider>
          <ReaderCustomizationProvider>{children}</ReaderCustomizationProvider>
        </LookupProvider>
      </ReaderWorkspaceProvider>
    </ReaderVersionProvider>
  );
}

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
