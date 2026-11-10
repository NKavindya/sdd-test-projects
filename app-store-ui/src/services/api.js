import axios from 'axios';
import {
  operationRequest,
  readPath,
  segment,
  unwrapHandler,
} from '../common/contracts';

export class SpecificationGap extends Error {}

export function createApi(config, onUnauthorized = () => {}) {
  // Same-origin browser requests preserve the request-handler session model.
  // During development Webpack proxies these paths to the configured UEM origin.
  const http = axios.create({ withCredentials: true });
  const server = config.serverConfig;
  const invoke = async (family, request) => {
    try {
      return unwrapHandler(
        await http.request({
          ...request,
          url: `${server.invoker.uri}${server.invoker[family]}${request.url}`,
        }),
      );
    } catch (error) {
      if (error.response?.status === 401) onUnauthorized();
      throw error;
    }
  };
  const store = (request) => invoke('store', request);
  const reference = async (name, params = {}, signal) => {
    const binding = config.contracts?.[name];
    if (!binding?.path || binding.rows == null)
      throw new SpecificationGap(
        `Missing ${name} API contract; see docs/gap-register.md.`,
      );
    const result = await invoke(binding.family || 'deviceMgt', {
      method: 'GET',
      url: binding.path,
      params,
      signal,
    });
    const rows = readPath(result, binding.rows);
    if (!Array.isArray(rows))
      throw new SpecificationGap(`Invalid ${name} response mapping.`);
    return {
      rows,
      count: binding.count ? readPath(result, binding.count) : rows.length,
      binding,
    };
  };
  return {
    session: {
      user: async () => unwrapHandler(await http.post(server.userUri)),
      scopes: async () => unwrapHandler(await http.get(server.scopeUri)),
      login: (username, password) =>
        http.post(
          server.loginUri,
          new URLSearchParams({ username, password, platform: 'store' }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
        ),
      logout: () => http.post(server.logoutUri),
      uiConfig: async () => (await http.get(server.appUiConfigUri)).data,
    },
    reference,
    deviceFilters: (signal) =>
      invoke('deviceMgt', { method: 'GET', url: '/devices/filters', signal }),
    list: (kind, filter, signal) =>
      store({
        method: 'POST',
        url: `/applications/${kind}`,
        data: filter,
        signal,
      }),
    favourite: (appId, remove) =>
      store({
        method: remove ? 'DELETE' : 'POST',
        url: `/applications/favourite/${segment(appId)}`,
      }),
    release: (appType, uuid, signal) =>
      store({
        method: 'GET',
        url: `/applications/${segment(appType)}/${segment(uuid)}`,
        signal,
      }),
    releases: (appId, appType, filter, signal) =>
      store({
        method: 'POST',
        url: `/applications/${segment(appId)}/releases/${segment(appType)}`,
        data: filter,
        signal,
      }),
    versions: (uuid, signal) =>
      store({
        method: 'GET',
        url: `/admin/release-versions/${segment(uuid)}`,
        signal,
      }),
    reviews: (uuid, personal, offSet = 0, limit = 20, signal) =>
      store({
        method: 'GET',
        url: `/reviews/app/${personal ? 'user/' : ''}${segment(uuid)}`,
        params: { offSet, limit },
        signal,
      }),
    rating: (uuid, signal) =>
      store({
        method: 'GET',
        url: `/reviews/${segment(uuid)}/app-rating`,
        signal,
      }),
    saveReview: (uuid, reviewId, data, parentId) =>
      store({
        method: reviewId == null ? 'POST' : 'PUT',
        url: `/reviews/${segment(uuid)}${reviewId != null ? `/${segment(reviewId)}` : parentId != null ? `/${segment(parentId)}` : ''}`,
        data,
      }),
    deleteReview: (uuid, reviewId, admin) =>
      store({
        method: 'DELETE',
        url: `${admin ? '/admin' : ''}/reviews/${segment(uuid)}/${segment(reviewId)}`,
      }),
    operation: (options) => store(operationRequest(options)),
    candidates: (uuid, kind, params, signal) =>
      store({
        method: 'GET',
        url: `/subscription/${segment(uuid)}/${kind === 'Device' ? 'devices' : kind.toUpperCase()}`,
        params,
        signal,
      }),
    counts: (uuid, signal) =>
      store({
        method: 'GET',
        url: `/admin/subscription/${segment(uuid)}/subscriptions/count`,
        signal,
      }),
    subscriptions: (uuid, kind, params, status, signal) => {
      const statusValue =
        config.contracts?.subscriptionStatus?.[params.subscriptionStatus];
      if (statusValue == null)
        throw new SpecificationGap(
          'Subscription status query values require confirmation.',
        );
      return store({
        method: 'GET',
        url: `/admin/subscription/${segment(uuid)}/subscriptions/${segment(kind.toLowerCase())}${status ? `/devices/${segment(status)}` : ''}`,
        params: { ...params, subscriptionStatus: statusValue },
        signal,
      });
    },
    operations: (uuid, deviceId, signal) =>
      store({
        method: 'GET',
        url: `/admin/subscription/devices/${segment(deviceId)}/operations/${segment(uuid)}`,
        signal,
      }),
    updateStatus: (deviceId, data) =>
      store({
        method: 'PUT',
        url: `/admin/subscription/device/${segment(deviceId)}/status`,
        data,
      }),
    firmwareDevices: (uuid, groupId, params, signal) =>
      store({
        method: 'GET',
        url: `/firmware/${segment(uuid)}${groupId != null ? `/groups/${segment(groupId)}` : ''}/devices`,
        params,
        signal,
      }),
    download: async (installerPath) => {
      return (
        await http.get(installerPath, {
          responseType: 'blob',
          withCredentials: false,
        })
      ).data;
    },
  };
}
