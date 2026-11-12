import type { Application, Filter, Identity } from './model.ts';
export function normalizeScopes(response: unknown): string[] {
  const value =
    response && typeof response === 'object' && 'userScopes' in response
      ? response.userScopes
      : response;
  const entries = typeof value === 'string' ? [value] : value;
  if (!Array.isArray(entries)) return [];
  return [
    ...new Set(
      entries.flatMap((entry: unknown) =>
        typeof entry === 'string' ? entry.split(/[\s,]+/).filter(Boolean) : [],
      ),
    ),
  ];
}
export function safeRedirect(value: string | null): string {
  return value &&
    /^\/store(?:\/|$)/.test(value) &&
    !value.includes('\\') &&
    !/[\r\n]/.test(value)
    ? value
    : '/store/';
}
export function buildSsoLoginUrl(
  loginUri: string,
  spaOrigin: string,
  returnPath: string | null,
): string {
  const loginUrl = new URL(loginUri, spaOrigin);
  // The handler stores this parameter in the session for its final redirect.
  // Keep the SPA origin: the OAuth callback may be served on UEM's port.
  loginUrl.searchParams.set(
    'redirect',
    new URL(safeRedirect(returnPath), spaOrigin).href,
  );
  return loginUrl.href;
}
export function unwrap<T>(value: unknown): T {
  if (
    value &&
    typeof value === 'object' &&
    'data' in value &&
    Object.keys(value).every((key) =>
      ['data', 'code', 'status', 'message'].includes(key),
    )
  )
    return (value as { data: T }).data;
  return value as T;
}
export function catalogueFilter(
  deviceType: string,
  firmware: boolean,
  offset: number,
  filter: Filter = {},
): Filter {
  return {
    deviceType: deviceType === 'web-clip' ? '' : deviceType,
    appTypes: firmware
      ? ['CUSTOM']
      : deviceType === 'web-clip'
        ? ['WEB_CLIP']
        : ['ENTERPRISE', 'PUBLIC', 'WEB_APP'],
    appReleaseState: 'PUBLISHED',
    limit: firmware ? 14 : 30,
    offset,
    ...filter,
  };
}
export function subscriptionPath(
  uuid: string,
  identity: Identity,
  action: 'install' | 'uninstall',
  ae = false,
): string {
  return `/subscription/${encodeURIComponent(uuid)}/${identity === 'device' ? 'devices' : identity.toUpperCase()}/${ae ? 'ent-app-install/' : ''}${action}`;
}
export const installable = (app: Application) =>
  app.applicationReleases[0]?.currentStatus === 'PUBLISHED';
export const playSynced = (app: Application) =>
  app.categories?.includes('GooglePlaySyncedApp') ?? false;
