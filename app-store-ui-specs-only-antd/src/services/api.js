import axios from 'axios';
import { notification } from 'antd';
import { normalizeScopes, safeReturn } from './contracts';
import i18n from '../i18n';
let config;
let unauthorizedHandler;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};
const http = axios.create({ withCredentials: true });
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.endsWith('/login')
    )
      unauthorizedHandler?.();
    return Promise.reject(error);
  },
);
export const unwrap = (payload) =>
  payload && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload;
export async function request(method, url, data, params) {
  const response = await http({ method, url, data, params });
  return unwrap(response.data);
}
export async function loadConfig() {
  const response = await axios.get('/store/public/conf/config.json');
  if (!response.data?.serverConfig?.invoker)
    throw new Error('GET /store/public/conf/config.json');
  config = response.data;
  return config;
}
export const getConfig = () => config;
export const invoke = (family, method, path, data, params) =>
  request(
    method,
    config.serverConfig.invoker.uri +
      config.serverConfig.invoker[family] +
      path,
    data,
    params,
  );
export const store = (method, path, data, params) =>
  invoke('store', method, path, data, params);
export const devices = (path, params) =>
  invoke('deviceMgt', 'GET', path, undefined, params);
export const publisher = (path) => invoke('publisher', 'GET', path);
export async function session() {
  const username = await request('POST', '/store-ui-request-handler/user');
  const granted = await request('GET', config.serverConfig.scopeUri);
  return { username, scopes: normalizeScopes(granted) };
}
export async function login(values) {
  await request(
    'POST',
    config.serverConfig.loginUri,
    new URLSearchParams({ ...values, platform: 'store' }),
  );
  return session();
}
export function authDestination(sso = false) {
  const redirect = safeReturn(location.pathname + location.search);
  return sso
    ? `${config.serverConfig.ssoLoginUri}?redirect=${encodeURIComponent(redirect)}`
    : `/store/login?redirect=${encodeURIComponent(redirect)}`;
}
export async function logout(sso = false) {
  if (sso) {
    location.assign(config.serverConfig.ssoLogoutUri);
    return;
  }
  await request('POST', config.serverConfig.logoutUri);
}
export function showError(error, fallback) {
  if (error?.response?.status === 401) return;
  const raw = error?.response?.data;
  const detail =
    typeof raw === 'string' && !raw.startsWith('<')
      ? raw
      : typeof raw?.data === 'string'
        ? raw.data
        : raw?.message;
  notification.error({
    message: i18n.t('There was a problem'),
    description: i18n.t(fallback || detail || 'There was a problem'),
    duration: 10,
  });
}
export function showOptionError(error, listName) {
  const status = error?.response?.status;
  if (status === 401) return;
  const raw = error?.response?.data;
  const detail =
    typeof raw === 'string'
      ? raw
      : typeof raw?.data === 'string'
        ? raw.data
        : raw?.message;
  notification[status === 409 ? 'warning' : 'error']({
    message: i18n.t('There was a problem'),
    description: status === 400 || status === 409 ? detail : i18n.t(listName),
    duration: 10,
  });
}
export async function download(release) {
  try {
    const response = await axios.get(release.installerPath, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = release.packageName || '';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    showError(error);
  }
}
