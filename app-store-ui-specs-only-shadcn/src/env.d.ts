/// <reference types="vite/client" />
declare module 'react-twemoji' {
  import type { ComponentType, ReactNode } from 'react';
  const Twemoji: ComponentType<{
    children: ReactNode;
    options?: Record<string, unknown>;
  }>;
  export default Twemoji;
}
