import type { ReactNode } from "react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";
import { ReaderNotesProvider } from "@/app/components/ReaderNotesProvider";
import { ReaderVersionProvider } from "@/app/components/ReaderVersionProvider";

type ReadLayoutProps = {
  children: ReactNode;
};

export default function ReadLayout({ children }: ReadLayoutProps) {
  return (
    <ReaderVersionProvider>
      <ReaderCustomizationProvider>
        <ReaderNotesProvider>{children}</ReaderNotesProvider>
      </ReaderCustomizationProvider>
    </ReaderVersionProvider>
  );
}
