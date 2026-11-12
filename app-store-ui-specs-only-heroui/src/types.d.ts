declare module 'react-twemoji' {
  import type { ComponentType, ReactNode } from 'react';
  const Twemoji: ComponentType<{
    children: ReactNode;
    options?: object;
    className?: string;
  }>;
  export default Twemoji;
}
