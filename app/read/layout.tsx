import type { ReactNode } from "react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderNotesProvider } from "@/app/components/ReaderNotesProvider";

type ReadLayoutProps = {
  children: ReactNode;
};

export default function ReadLayout({ children }: ReadLayoutProps) {
  return (
    <ReaderCustomizationProvider>
      <ReaderNotesProvider>{children}</ReaderNotesProvider>
    </ReaderCustomizationProvider>
  );
}
