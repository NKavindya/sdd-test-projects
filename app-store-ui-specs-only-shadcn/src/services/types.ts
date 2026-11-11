export interface Release {
  uuid: string;
  version: string;
  description?: string;
  installerPath?: string;
  iconPath?: string;
  screenshots?: string[];
  releaseType?: string;
  currentStatus: string;
  metaData?: string;
  packageName?: string;
  supportedOsVersions?: string;
  rating?: number;
}
export interface Application {
  id: number;
  name: string;
  description?: string;
  categories: string[];
  tags: string[];
  type: string;
  deviceType: string;
  rating: number;
  isFavourite: boolean;
  isAndroidEnterpriseApp?: boolean;
  packageName?: string;
  applicationReleases: Release[];
  firmwareModels?: string[];
}
export interface Device {
  id: number;
  name: string;
  type: string;
  deviceIdentifier: string;
  lastUpdatedTimeStamp?: number;
  deviceInfo?: Record<string, unknown>;
  properties?: { name: string; value: string }[];
  enrolmentInfo?: { owner: string; status: string; ownership: string };
}
export interface Group {
  id: number;
  name: string;
  childrenGroups?: Group[];
}
export interface Review {
  id: number;
  content: string;
  rating: number;
  username: string;
  replies?: Review[];
}
export interface DeviceSubscription {
  subId: number;
  deviceId: number;
  deviceIdentifier: string;
  type: string;
  deviceName: string;
  deviceOwner: string;
  status: string;
  actionType: string;
  actionTriggeredBy: string;
  actionTriggeredTimestamp: number;
  deviceStatus: string;
  device?: Device;
}
export interface Config {
  defaultAppTitle: string;
  theme: {
    logo: string;
    logoIcon: string;
    footerText?: string;
    appTitle?: string;
  };
  serverConfig: {
    invoker: {
      uri: string;
      store: string;
      publisher: string;
      deviceMgt: string;
    };
    loginUri: string;
    logoutUri: string;
    ssoLoginUri: string;
    ssoLogoutUri: string;
    scopeUri: string;
    appUiConfigUri: string;
  };
}
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
  devices: 'dm:devices:view',
  users: 'um:users:user-details:view',
  roles: 'rm:roles:view',
  groups: 'gm:groups:view',
  adminGroups: 'gm:admin:groups:view',
  hide: 'dm:hide:unauthorized:functions',
} as const;
