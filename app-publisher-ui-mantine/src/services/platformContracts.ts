/*
 * Copyright (C) 2018 - 2024 Entgra (Pvt) Ltd, Inc - All Rights Reserved.
 *
 * Unauthorised copying/redistribution of this file, via any medium is strictly prohibited.
 *
 * Licensed under the Entgra Commercial License, Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       https://entgra.io/licenses/entgra-commercial/1.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
export const ENTERPRISE_ROOT = "/device-mgt/android/v1.0/enterprise";
export const AE_VIEW = "and:enterprise:view";
export const AE_MODIFY = "and:enterprise:modify";
export const VPP_SYNC = "am:store:vpp:assets:modify";
export function enterpriseStoreUrl(origin: string) {
  const query = new URLSearchParams({
    approveApps: "true",
    searchEnabled: "true",
    isPrivateAppsEnabled: "true",
    isWebAppEnabled: "true",
    isOrganizeAppPageVisible: "true",
    isManagedConfigEnabled: "true",
    host: origin,
  });
  return `/store-url?${query}`;
}
export function enterpriseSyncPath(packageName: string) {
  const value = packageName.trim();
  if (!value) throw new Error("ae.packageRequired");
  return `/products/sync?${new URLSearchParams({ approveAppPackage: value })}`;
}
export function enterpriseResultKey(status: number) {
  if (status === 200) return "ae.syncSuccess";
  if (status === 404) return "ae.packageNotFound";
  if (status === 409) return "ae.packageExists";
  return "ae.syncError";
}
export function playApproveUrl(token: string) {
  return `https://play.google.com/work/embedded/search?${new URLSearchParams({ token, mode: "APPROVE", showsearchbox: "TRUE" })}`;
}
export function integrationAccess(
  scopes: readonly string[],
  token: string | null,
) {
  return {
    androidImport: !!token && scopes.includes(AE_VIEW),
    androidApprove: !!token,
    appleVpp: scopes.includes(VPP_SYNC),
    managedConfigurations: !!token && scopes.includes(AE_MODIFY),
  };
}

export interface ManagedConfigEvent {
  mcmId: string;
  name: string;
}
export function managedConfigurationUrl(
  token: string,
  packageName: string,
  mcmId?: string,
) {
  const query = new URLSearchParams({ token, packageName });
  if (mcmId) {
    query.set("mcmId", mcmId);
    query.set("canDelete", "true");
  }
  return `https://play.google.com/managed/mcm?${query}`;
}
export function managedConfigurationEvent(value: unknown): ManagedConfigEvent {
  if (
    !value ||
    typeof value !== "object" ||
    !("mcmId" in value) ||
    typeof value.mcmId !== "string" ||
    !value.mcmId.trim()
  )
    throw new Error("ae.managedInvalidEvent");
  return {
    mcmId: value.mcmId,
    name: "name" in value && typeof value.name === "string" ? value.name : "",
  };
}
