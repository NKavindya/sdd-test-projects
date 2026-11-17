import { AppShell } from "@mantine/core";
import type { ReactNode } from "react";
export function EntgraSider({ children }: { children: ReactNode }) {
  return (
    <AppShell.Navbar className="publisher-sider">{children}</AppShell.Navbar>
  );
}
