import axios from 'axios';
import { unwrap } from './contracts';
export interface Config {
  defaultAppTitle: string;
  appName: string;
  theme: {
    primaryColor: string;
    logo: string;
    logoIcon: string;
    footerText?: string;
    appTitle?: string;
    favicon?: string;
  };
  serverConfig: {
    loginUri: string;
    logoutUri: string;
    ssoLoginUri: string;
    ssoLogoutUri: string;
    scopeUri: string;
    appUiConfigUri: string;
    invoker: {
      uri: string;
      store: string;
      publisher: string;
      deviceMgt: string;
    };
  };
  links?: { addPolicy?: string };
  search?: { title: string; path: string; scopes: string[] }[];
}
export let config: Config;
const http = axios.create({ withCredentials: true });
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export async function request<T>(
  method: string,
  url: string,
  data?: unknown,
  params?: object,
): Promise<T> {
  try {
    const r = await http.request({ method, url, data, params });
    return unwrap<T>(r.data);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      if (e.response?.status === 401)
        window.dispatchEvent(new Event('store:unauthorized'));
      throw new ApiError(
        e.response?.status ?? 0,
        typeof e.response?.data === 'string'
          ? e.response.data
          : typeof e.response?.data?.data === 'string'
            ? e.response.data.data
            : e.response?.data?.message ||
              e.response?.data?.data?.message ||
              e.message,
      );
    }
    throw e;
  }
}
export async function loadConfig() {
  config = await request<Config>('GET', '/store/conf/config.json');
  return config;
}
export function api<T>(
  path: string,
  method = 'GET',
  data?: unknown,
  params?: object,
  area: 'store' | 'deviceMgt' | 'publisher' = 'store',
) {
  return request<T>(
    method,
    config.serverConfig.invoker.uri + config.serverConfig.invoker[area] + path,
    data,
    params,
  );
}
export const dm = <T>(path: string, params?: object) =>
  api<T>(path, 'GET', undefined, params, 'deviceMgt');
export const publisher = <T>(path: string) =>
  api<T>(path, 'GET', undefined, undefined, 'publisher');
