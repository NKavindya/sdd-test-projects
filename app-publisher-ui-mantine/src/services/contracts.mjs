export const NON_CUSTOM_TYPES = ["ENTERPRISE", "PUBLIC", "WEB_APP", "WEB_CLIP"];
export const TYPE_FILTERS = {
  Enterprise: ["ENTERPRISE"],
  Public: ["PUBLIC"],
  "Web app": ["WEB_CLIP", "WEB_APP"],
  Custom: ["CUSTOM"],
  All: NON_CUSTOM_TYPES,
};
export const CHUNK_SIZE = 5242880;
export function unwrap(body) {
  return body &&
    typeof body === "object" &&
    Object.prototype.hasOwnProperty.call(body, "data")
    ? body.data
    : body;
}
export function parseScopes(body) {
  const data = unwrap(body);
  const value =
    Array.isArray(data) || typeof data === "string" ? data : data?.userScopes;
  return Array.isArray(value)
    ? value.filter((x) => typeof x === "string")
    : typeof value === "string"
      ? value.split(/\s+/).filter(Boolean)
      : [];
}
export function safeRedirect(value, fallback = "/app-publisher/apps") {
  if (
    !value ||
    !value.startsWith("/app-publisher/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, "https://publisher.invalid");
    return url.origin === "https://publisher.invalid"
      ? url.pathname + url.search + url.hash
      : fallback;
  } catch {
    return fallback;
  }
}
export function applicationFilter(
  criteria = {},
  page = 1,
  limit = 10,
  deviceType,
) {
  return {
    isNotRetired: true,
    appTypes: deviceType ? ["CUSTOM"] : NON_CUSTOM_TYPES,
    ...criteria,
    ...(deviceType ? { deviceType, appTypes: ["CUSTOM"] } : {}),
    offset: (page - 1) * limit,
    limit,
  };
}
export function chunkRanges(size) {
  const result = [];
  for (let start = 0; start < size; start += CHUNK_SIZE)
    result.push([start, Math.min(size, start + CHUNK_SIZE)]);
  result.push([size, size]);
  return result;
}
export function releasePath(type, deviceType, appId) {
  const segment = {
    ENTERPRISE: "ent-app",
    PUBLIC: "public-app",
    WEB_CLIP: "web-app",
    WEB_APP: "web-app",
    CUSTOM: "custom-app",
  }[type];
  if (!segment) throw new Error("Unsupported application type");
  return type === "WEB_CLIP" || type === "WEB_APP"
    ? `/applications/web-app/${appId}`
    : `/applications/${encodeURIComponent(deviceType)}/${segment}/${appId}`;
}
