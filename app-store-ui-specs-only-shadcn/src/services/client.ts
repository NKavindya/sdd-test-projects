import { safeStorePath } from './rules';
import axios from 'axios';
import { toast } from 'sonner';
import i18n from '../i18n';
import type { Config } from './types';
let config: Config;
export function configure(value: Config) {
  config = value;
}
export function unwrap<T>(body: unknown): T {
  return (
    body && typeof body === 'object' && 'data' in body
      ? (body as { data: T }).data
      : body
  ) as T;
}
export const http = axios.create({
  withCredentials: true,
  paramsSerializer: { indexes: null },
});
http.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401)
      window.dispatchEvent(new Event('store:unauthorized'));
    return Promise.reject(e);
  },
);
export async function request<T>(
  method: string,
  url: string,
  data?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const r = await http.request({ method, url, data, params });
  return unwrap<T>(r.data);
}
export function api<T>(
  family: 'store' | 'publisher' | 'deviceMgt',
  method: string,
  path: string,
  data?: unknown,
  params?: Record<string, unknown>,
) {
  return request<T>(
    method,
    config.serverConfig.invoker.uri +
      config.serverConfig.invoker[family] +
      path,
    data,
    params,
  );
}
export function notifyError(error: unknown, fallback?: string) {
  if (axios.isAxiosError(error) && error.response?.status === 401) return;
  const body = axios.isAxiosError(error) ? error.response?.data : undefined;
  const detail =
    typeof body?.data === 'string'
      ? body.data
      : body?.data?.message || body?.message;
  const message =
    detail ||
    fallback ||
    (error instanceof Error ? error.message : 'There was a problem');
  const warning = axios.isAxiosError(error) && error.response?.status === 409;
  toast[warning ? 'warning' : 'error'](i18n.t('There was a problem'), {
    description: i18n.t(message),
    duration: 10000,
  });
}
export function safeReturn(value: string | null) {
  return safeStorePath(value, location.origin);
}
export function artifact(path?: string) {
  return path || '';
}
