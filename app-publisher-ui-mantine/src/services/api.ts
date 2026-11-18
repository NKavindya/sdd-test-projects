import { notifications } from "@mantine/notifications";
import axios, { type AxiosRequestConfig, type Method } from "axios";
import { CHUNK_SIZE, chunkRanges, unwrap } from "./contracts.mjs";
import type {
  Application,
  AppList,
  DeviceType,
  Filter,
  Release,
  RuntimeConfig,
} from "./types";
import { ENTERPRISE_ROOT } from "./platformContracts";
let config: RuntimeConfig;
export type RequestOptions = AxiosRequestConfig & {
  expireSessionOn401?: boolean;
};
export const http = axios.create({ withCredentials: true, timeout: 60000 });
export const configureApi = (value: RuntimeConfig) => {
  config = value;
};
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
export function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "The request could not be completed.";
}
export function showError(error: unknown) {
  notifications.show({
    title: "Request failed",
    message: errorText(error),
    color: "red",
    autoClose: 10000,
  });
}
export async function request<T>(
  method: Method,
  url: string,
  data?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const { expireSessionOn401 = true, ...axiosOptions } = options || {};
  try {
    const response = await http.request({ method, url, data, ...axiosOptions });
    return unwrap(response.data) as T;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 0;
      if (
        expireSessionOn401 &&
        status === 401 &&
        !url.includes("/user") &&
        !url.includes("/login") &&
        !url.includes("/ui-config")
      )
        window.dispatchEvent(new Event("publisher:unauthorized"));
      const body = error.response?.data;
      const message =
        typeof body === "string" && !body.startsWith("<")
          ? body
          : body?.message || body?.errorMessage || body?.data?.message;
      const defaults: Record<number, string> = {
        0: "Unable to reach UEM. Check the backend and trusted certificate configuration.",
        400: "Please check the submitted values.",
        401: "Your session has expired. Sign in again.",
        403: "You do not have permission to perform this action, or the operation is not allowed in the current state.",
        404: "The requested resource could not be found.",
        409: "This name, package or binary already exists.",
        500: "UEM could not complete the request. Please try again.",
      };
      throw new ApiError(
        status,
        typeof message === "string"
          ? message
          : defaults[status] || `Request failed (${status}).`,
      );
    }
    throw error;
  }
}
export function invoke<T>(
  method: Method,
  path: string,
  data?: unknown,
  segment: "publisher" | "deviceMgt" | "store" = "publisher",
  options?: AxiosRequestConfig,
) {
  return request<T>(
    method,
    config.serverConfig.invoker.uri +
      config.serverConfig.invoker[segment] +
      path,
    data,
    options,
  );
}
export function invokeEnterprise<T>(
  method: Method,
  path: string,
  data?: unknown,
  options?: RequestOptions,
) {
  return request<T>(
    method,
    config.serverConfig.invoker.uri + ENTERPRISE_ROOT + path,
    data,
    options,
  );
}
export const api = {
  list: (filter: Filter, signal?: AbortSignal) =>
    invoke<AppList>("POST", "/applications", filter, "publisher", { signal }),
  app: (id: number) => invoke<Application>("GET", `/applications/${id}`),
  release: (uuid: string) =>
    invoke<Application>(
      "GET",
      `/applications/release/${encodeURIComponent(uuid)}`,
    ),
  releases: (id: number, filter: Filter) =>
    invoke<any>("POST", `/applications/${id}/releases`, filter),
  updateApp: (id: number, data: unknown) =>
    invoke<Application>("PUT", `/applications/${id}`, data),
  deleteApp: (id: number) => invoke("DELETE", `/admin/applications/${id}`),
  retireApp: (id: number) => invoke("PUT", `/admin/applications/retire/${id}`),
  deleteRelease: (uuid: string) =>
    invoke("DELETE", `/admin/applications/release/${encodeURIComponent(uuid)}`),
  updateRelease: (type: string, uuid: string, data: unknown) =>
    invoke<Release>(
      "PUT",
      `/applications/${({ ENTERPRISE: "ent", PUBLIC: "public", WEB_CLIP: "web", WEB_APP: "web", CUSTOM: "custom" } as Record<string, string>)[type]}-app-release/${encodeURIComponent(uuid)}`,
      data,
    ),
  categories: () => invoke<any[]>("GET", "/applications/categories"),
  tags: () => invoke<any[]>("GET", "/applications/tags"),
  deviceTypes: () =>
    invoke<DeviceType[]>("GET", "/device-types", undefined, "deviceMgt"),
  roles: (filter: string) =>
    invoke<{ roles: string[] }>(
      "GET",
      `/roles?filter=${encodeURIComponent(filter)}&offset=0&limit=50`,
      undefined,
      "deviceMgt",
    ),
  models: (type: string) =>
    invoke<any[]>(
      "GET",
      `/applications/available-firmware-models/device-types/${encodeURIComponent(type)}`,
    ),
};
export async function uploadFile(
  file: File,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
) {
  const dot = file.name.lastIndexOf(".");
  const link = await invoke<{ relativeTransferLink: string }>(
    "POST",
    "/applications/upload-links",
    {
      fileName: dot > 0 ? file.name.slice(0, dot) : file.name,
      extension: dot > 0 ? file.name.slice(dot + 1) : "",
      size: file.size,
    },
    "publisher",
    { signal },
  );
  if (!link?.relativeTransferLink)
    throw new Error("UEM did not return a transfer link.");
  const transfer = link.relativeTransferLink.replace(/^\/+/, "");
  if (
    !transfer.startsWith("application-mgt-publisher/v1.0/applications/uploads/")
  )
    throw new Error("UEM returned an unexpected transfer path.");
  const ranges = chunkRanges(file.size);
  for (let index = 0; index < ranges.length; index++) {
    const [start, end] = ranges[index];
    const form = new FormData();
    form.append("chunk", file.slice(start, end), file.name);
    await request(
      "POST",
      `${config.serverConfig.invoker.uri}/${transfer}`,
      form,
      { signal },
    );
    onProgress(Math.min(100, Math.round(((index + 1) / ranges.length) * 100)));
  }
  const uuid = transfer.split("/").pop();
  return `${config.serverConfig.invoker.uri}/uploads/${uuid}/${encodeURIComponent(file.name)}`;
}
export { CHUNK_SIZE };
export function mediaUrl(value?: string) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(parsed.protocol) ? value : undefined;
  } catch {
    return undefined;
  }
}
