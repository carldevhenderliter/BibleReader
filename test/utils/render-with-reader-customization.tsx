import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

type WrapperProps = {
  children: ReactNode;
};

function Wrapper({ children }: WrapperProps) {
  return (
    <ReaderVersionProvider>
      <ReaderCustomizationProvider>{children}</ReaderCustomizationProvider>
    </ReaderVersionProvider>
  );
}

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
