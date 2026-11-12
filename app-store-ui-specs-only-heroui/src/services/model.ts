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
  supportedOsVersions?: string;
  rating?: number;
  packageName?: string;
}
export interface Application {
  id: number;
  name: string;
  description?: string;
  categories?: string[];
  tags?: string[];
  type: string;
  deviceType: string;
  rating?: number;
  isFavourite?: boolean;
  isAndroidEnterpriseApp?: boolean;
  packageName?: string;
  applicationReleases: Release[];
  firmwareModels?: string[];
}
export interface Page {
  offset: number;
  limit: number;
  size: number;
  count: number;
}
export interface AppList {
  applications: Application[];
  pagination: Page;
}
export interface ReleaseList {
  releases: Release[];
  pagination: Page;
}
export interface DeviceType {
  id: number;
  name: string;
  deviceTypeMetaDefinition?: { storeVisibilityEnabled: boolean };
}
export interface Device {
  id: number;
  name: string;
  type: string;
  deviceIdentifier: string;
  lastUpdatedTimeStamp?: number;
  enrolmentInfo?: { owner: string; ownership: string; status: string };
  deviceInfo?: Record<string, string>;
  properties?: { name: string; value: string }[];
}
export interface Group {
  id: number;
  name: string;
  childrenGroups?: Group[];
  deviceCount?: number;
}
export interface Review {
  id: number;
  content: string;
  rating: number;
  username: string;
  createdAt?: string;
  replies?: Review[];
}
export interface Rating {
  ratingValue: number;
  noOfUsers: number;
  ratingVariety: Record<string, number>;
}
export interface SubscriptionCount {
  subscriptionType: string;
  subscriptionCount: number;
  unsubscriptionCount: number;
}
export interface SubscriptionRow {
  id?: number;
  name?: string;
  owner?: string;
  subId?: number;
  device?: Device;
  deviceId?: number;
  deviceIdentifier?: string;
  deviceName?: string;
  deviceOwner?: string;
  type?: string;
  status?: string;
  deviceStatus?: string;
  action?: string;
  actionType?: string;
  actionTriggeredBy?: string;
  actionTriggeredTimestamp?: string;
  deviceCount?: number;
}
export interface ListResult<T> {
  count?: number;
  recordsTotal?: number;
  recordsFiltered?: number;
  data: T[];
}
export type Filter = Record<string, string | number | boolean | string[]>;
export type Identity = 'device' | 'user' | 'role' | 'group';
export const scope = {
  view: 'am:store:app:view',
  modify: 'am:store:app:modify',
  install: 'am:store:app:sub:install',
  uninstall: 'am:store:app:sub:uninstall',
  reviews: 'am:store:app:review:view',
  reviewWrite: 'am:store:app:review:update',
  reviewAdmin: 'am:admin:store:app:review:update',
  subscriptions: 'am:admin:store:app:sub:view',
  status: 'am:admin:store:app:sub:modify',
  versions: 'am:admin:store:app:release-versions:view',
  firmware: 'am:store:firmware:view',
  devices: 'dm:devices:view',
  users: 'um:users:user-details:view',
  roles: 'rm:roles:view',
  groups: 'gm:groups:view',
  adminGroups: 'gm:admin:groups:view',
  hide: 'dm:hide:unauthorized:functions',
} as const;
