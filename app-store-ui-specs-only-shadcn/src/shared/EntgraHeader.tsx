import type { ReactNode } from 'react';
import { Crosshair } from 'lucide-react';
export function EntgraHeader({
  children,
  showTarget = true,
}: {
  children: ReactNode;
  showTarget?: boolean;
}) {
  return (
    <header className="entgra-header">
      {showTarget && <Crosshair size={17} aria-hidden />}
      {children}
    </header>
  );
}
