import type { Application } from './model';
const contexts = new Map<string, Application>();
export function createHandoff(app: Application) {
  const token = crypto.randomUUID();
  contexts.set(token, app);
  return token;
}
export const getHandoff = (token: unknown) =>
  typeof token === 'string' ? contexts.get(token) : undefined;
