import type { Application, Release } from './types';
export const wizardContexts = new Map<
  string,
  { app: Application; release: Release }
>();
