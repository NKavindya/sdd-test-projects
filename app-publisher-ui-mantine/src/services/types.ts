export interface Release {
  uuid: string;
  description: string;
  version: string;
  installerPath?: string;
  iconPath?: string;
  bannerPath?: string;
  screenshots?: string[];
  releaseType: string;
  currentStatus: string;
  price?: number;
  isSharedWithAllTenants?: boolean;
  metaData?: string;
  supportedOsVersions?: string;
  rating?: number;
  packageName?: string;
  [key: string]: unknown;
}
export interface Application {
  id: number;
  name: string;
  description: string;
  type: string;
  deviceType: string;
  categories: string[];
  tags: string[];
  unrestrictedRoles: string[];
  subMethod: string;
  applicationReleases: Release[];
  rating?: number;
  packageName?: string;
  isDeletableApp?: boolean;
  isHideableApp?: boolean;
  isAndroidEnterpriseApp?: boolean;
  firmwareModels?: string[];
  firmwareModelIds?: number[];
  [key: string]: unknown;
}
export interface AppList {
  applications: Application[];
  pagination: { count: number; offset: number; limit: number; size: number };
}
export interface DeviceType {
  id: number;
  name: string;
  deviceTypeMetaDefinition?: Record<string, unknown>;
}
export interface RuntimeConfig {
  appName: string;
  defaultAppTitle: string;
  theme: { primaryColor: string };
  serverConfig: {
    invoker: {
      contextPath: string;
      uri: string;
      publisher: string;
      store: string;
      deviceMgt: string;
    };
    loginUri: string;
    logoutUri: string;
    ssoLoginUri: string;
    ssoLogoutUri: string;
    scopeUri: string;
    platform: string;
    appUiConfigUri: string;
  };
  lifecycle: Record<string, { title: string; text: string; step: number }>;
  deviceTypes: { mobileTypes: string[] };
  applicationFormConfigs: Record<
    string,
    { endpoint: string; releaseWrapperName: string; installationType: string }
  >;
  [key: string]: unknown;
}
export type Filter = Record<string, string | number | boolean | string[]>;
