export const scopes = {
  view: 'am:store:app:view',
  favourite: 'am:store:app:modify',
  install: 'am:store:app:sub:install',
  uninstall: 'am:store:app:sub:uninstall',
  reviewView: 'am:store:app:review:view',
  reviewUpdate: 'am:store:app:review:update',
  reviewAdmin: 'am:admin:store:app:review:update',
  subscriptionView: 'am:admin:store:app:sub:view',
  subscriptionModify: 'am:admin:store:app:sub:modify',
  versions: 'am:admin:store:app:release-versions:view',
  firmware: 'am:store:firmware:view',
  deviceTypes: 'dm:device-type:view',
  devices: 'dm:devices:view',
  users: 'um:users:user-details:view',
  roles: 'rm:roles:view',
  groups: 'gm:groups:view',
  adminGroups: 'gm:admin:groups:view',
  groupDevices: 'gm:devices:view',
  hideFunctions: 'dm:hide:unauthorized:functions',
  hideEndpoint: 'dm:hide:endpoint:mgt',
  hidePublisher: 'dm:hide:app:publisher',
};

export function normalizeScopes(value) {
  // PermissionScopeHandler returns { data: { userScopes: "scope …" } }.
  // Keep legacy documented string/list payloads, without accepting arbitrary
  // object keys or treating a malformed response as a permission grant.
  const granted =
    value && typeof value === 'object' && !Array.isArray(value)
      ? value.userScopes
      : value;
  if (
    Array.isArray(granted) &&
    granted.every((scope) => typeof scope === 'string')
  )
    return granted;
  if (typeof granted === 'string') return granted.split(/\s+/).filter(Boolean);
  throw new Error('Unsupported scope response; see docs/gap-register.md.');
}

export function unwrapHandler(response) {
  if (response.data === '' || response.data == null) return undefined;
  if (
    typeof response.data !== 'object' ||
    !Object.hasOwn(response.data, 'data')
  ) {
    throw new Error('Unsupported handler envelope; see docs/gap-register.md.');
  }
  return response.data.data;
}

export const segment = (value) => encodeURIComponent(String(value));
export const isInstallable = (release, config) =>
  release?.currentStatus === config.appStates.published;
export const isPlaySynced = (app) =>
  app?.categories?.includes('GooglePlaySyncedApp');
export const appTypes = (platform) =>
  platform === 'web-clip' ? ['WEB_CLIP'] : ['ENTERPRISE', 'PUBLIC', 'WEB_APP'];

export function safeReturn(value, origin) {
  if (!value) return '/store/';
  try {
    const target = new URL(value, origin);
    return target.origin === origin && target.pathname.startsWith('/store/')
      ? `${target.pathname}${target.search}${target.hash}`
      : '/store/';
  } catch {
    return '/store/';
  }
}

export function ssoLoginUrl(loginUri, returnPath, origin) {
  const login = new URL(loginUri, origin);
  // The handler saves this parameter in HttpSession as redirectUrl and requires
  // it when redirecting after the OAuth callback. Use the SPA origin (including
  // its development port), while keeping the target inside the Store.
  login.searchParams.set(
    'redirect',
    new URL(safeReturn(returnPath, origin), origin).href,
  );
  return login.href;
}

export function operationRequest({
  uuid,
  kind,
  action,
  identities,
  enterprise,
  timestamp,
  blockUninstall,
  disableReexecute,
  requiresUpdatingExternal,
}) {
  const target = kind === 'Device' ? 'devices' : kind.toUpperCase();
  const params = {};
  if (timestamp != null) params.timestamp = timestamp;
  if (action === 'install' && blockUninstall != null)
    params['block-uninstall'] = blockUninstall;
  if (kind !== 'Device' && action === 'install' && disableReexecute != null)
    params['disable-operation-re-executing'] = disableReexecute;
  if (enterprise && requiresUpdatingExternal != null)
    params.requiresUpdatingExternal = requiresUpdatingExternal;
  return {
    method: 'POST',
    url: `/subscription/${segment(uuid)}/${target}/${enterprise ? 'ent-app-install/' : ''}${action}`,
    data: identities,
    params,
  };
}

export function readPath(value, pointer) {
  return pointer
    ? pointer.split('.').reduce((node, key) => node?.[key], value)
    : value;
}

// Absolute artifact URLs are deployment data: preserve protocol, host, port,
// path and query exactly. They do not use the Store invoker or API-origin proxy.
export function imageUrl(value) {
  if (!value) return undefined;
  const protocol = /^([a-z][a-z0-9+.-]*):/i.exec(value)?.[1].toLowerCase();
  return !protocol || ['http', 'https'].includes(protocol) ? value : undefined;
}
