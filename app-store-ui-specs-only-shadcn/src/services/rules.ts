// Observable gates from ST-AP / ST-IN / ST-UN / ST-SE.
export function catalogueTypes(deviceType: string, firmware = false): string[] {
  return firmware
    ? ['CUSTOM']
    : deviceType === 'web-clip'
      ? ['WEB_CLIP']
      : ['ENTERPRISE', 'PUBLIC', 'WEB_APP'];
}
export function isInstallable(release: { currentStatus: string }) {
  return release.currentStatus === 'PUBLISHED';
}
export function safeStorePath(value: string | null, origin: string) {
  try {
    const url = new URL(value || '/store/', origin);
    return url.origin === origin && url.pathname.startsWith('/store/')
      ? url.pathname + url.search
      : '/store/';
  } catch {
    return '/store/';
  }
}
export function selectionReady(
  selection: unknown[],
  scheduled: boolean,
  time: string,
) {
  return selection.length > 0 && (!scheduled || !!time);
}
export function subscriptionWireStatus(label: 'Installed' | 'Uninstalled') {
  return label === 'Installed' ? 'subscribed' : 'unsubscribed';
}
