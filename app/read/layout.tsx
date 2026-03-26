import type { ReactNode } from "react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

type ReadLayoutProps = {
  children: ReactNode;
};

export default function ReadLayout({ children }: ReadLayoutProps) {
  return (
    <ReaderVersionProvider>
      <ReaderCustomizationProvider>{children}</ReaderCustomizationProvider>
    </ReaderVersionProvider>
  );
}
