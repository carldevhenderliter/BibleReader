import type { ReactNode } from "react";

import { ReaderCustomizationProvider } from "@/app/components/ReaderCustomizationProvider";

type ReadLayoutProps = {
  children: ReactNode;
};

export default function ReadLayout({ children }: ReadLayoutProps) {
  return <ReaderCustomizationProvider>{children}</ReaderCustomizationProvider>;
}
