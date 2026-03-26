import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";

type WrapperProps = {
  children: ReactNode;
};

function Wrapper({ children }: WrapperProps) {
  return <ReaderCustomizationProvider>{children}</ReaderCustomizationProvider>;
}

export function renderWithReaderCustomization(ui: ReactElement) {
  return render(ui, { wrapper: Wrapper });
}
