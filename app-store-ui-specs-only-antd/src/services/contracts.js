// Wire tokens and routes are from Store API + feature specifications.
export const scopes = {
  view: 'am:store:app:view',
  modify: 'am:store:app:modify',
  install: 'am:store:app:sub:install',
  uninstall: 'am:store:app:sub:uninstall',
  reviewView: 'am:store:app:review:view',
  reviewUpdate: 'am:store:app:review:update',
  reviewAdmin: 'am:admin:store:app:review:update',
  subView: 'am:admin:store:app:sub:view',
  subModify: 'am:admin:store:app:sub:modify',
  versions: 'am:admin:store:app:release-versions:view',
  firmware: 'am:store:firmware:view',
  device: 'dm:devices:view',
  user: 'um:users:user-details:view',
  role: 'rm:roles:view',
  group: 'gm:groups:view',
  adminGroup: 'gm:admin:groups:view',
  groupDevices: 'gm:devices:view',
  hide: 'dm:hide:unauthorized:functions',
  types: 'dm:device-type:view',
  conf: 'dm:conf:view',
  publisher: 'am:pub:app:update',
};
export const cannotPerform =
  "Can't perform the action. This release isn't in an installable state.";
export const isInstallable = (release) =>
  release?.currentStatus === 'PUBLISHED';
export const isPlaySynced = (app) =>
  app?.categories?.includes('GooglePlaySyncedApp');
export function safeReturn(value) {
  if (!value) return '/store/';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin &&
      url.pathname.startsWith('/store/') &&
      url.pathname !== '/store/login'
      ? url.pathname + url.search + url.hash
      : '/store/';
  } catch {
    return '/store/';
  }
}
export const normalizeScopes = (value) =>
  Array.isArray(value)
    ? value
    : String(value || '')
        .split(/[\s,]+/)
        .filter(Boolean);
export const releaseOf = (app, uuid) =>
  app?.applicationReleases?.find((r) => r.uuid === uuid) ||
  app?.applicationReleases?.[0];
export function catalogueFilter(type, firmware, filter, offset = 0) {
  return {
    ...filter,
    deviceType: type,
    appTypes: firmware
      ? ['CUSTOM']
      : type === 'web-clip'
        ? ['WEB_CLIP']
        : ['ENTERPRISE', 'PUBLIC', 'WEB_APP'],
    limit: firmware ? 14 : 30,
    offset,
  };
}
export function operationPath(uuid, type, action, enterprise = false) {
  return `/subscription/${encodeURIComponent(uuid)}/${type === 'device' ? 'devices' : type.toUpperCase()}/${enterprise ? 'ent-app-install/' : ''}${action}`;
}
export function devicePayload(rows) {
  return rows.map((row) => {
    const d = row.device || row;
    return { id: d.deviceIdentifier, type: d.type };
  });
}
export const toLocalTime = (value) =>
  value ? new Date(value).toLocaleString() : '—';
export function deviceValue(device, key) {
  return (
    device.deviceInfo?.[key] ??
    device.properties?.find((p) => p.name === key)?.value
  );
}
export const listRows = (data) =>
  Array.isArray(data) ? data : data?.data || [];
