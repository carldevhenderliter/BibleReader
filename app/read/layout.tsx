import type { ReactNode } from "react";

type ReadLayoutProps = {
  children: ReactNode;
};

export default function ReadLayout({ children }: ReadLayoutProps) {
  return children;
}
