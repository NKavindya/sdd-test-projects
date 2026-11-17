import type { ReactNode } from "react";
export function EntgraHeader({ children }: { children: ReactNode }) {
  return <header className="entgra-header">{children}</header>;
}
