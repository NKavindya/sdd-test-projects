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
import { api, invoke, invokeEnterprise } from "./api";
import { enterpriseStoreUrl, enterpriseSyncPath } from "./platformContracts";
export const platformApi = {
  playSyncedApps: (page: number) =>
    api.list({
      appTypes: ["PUBLIC"],
      deviceType: "android",
      categories: ["GooglePlaySyncedApp"],
      isNotRetired: true,
      offset: (page - 1) * 10,
      limit: 10,
    }),
  async enterpriseToken(origin: string): Promise<string | null> {
    try {
      const result = await invokeEnterprise<{ token?: unknown }>(
        "GET",
        enterpriseStoreUrl(origin),
        undefined,
        { expireSessionOn401: false },
      );
      return typeof result?.token === "string" && result.token
        ? result.token
        : null;
    } catch {
      // Enrollment is optional. Missing/expired embed tokens must not block the Publisher session.
      return null;
    }
  },
  importAndroidPackage: (packageName: string, signal?: AbortSignal) =>
    invokeEnterprise<unknown>(
      "GET",
      enterpriseSyncPath(packageName),
      undefined,
      { signal },
    ),
  depMetadata: (signal?: AbortSignal) =>
    invoke<{ metaValue?: unknown }>(
      "GET",
      "/metadata/DEP_META_KEY",
      undefined,
      "deviceMgt",
      { signal },
    ),
  managedConfiguration: (packageName: string, signal?: AbortSignal) =>
    invokeEnterprise<{ mcmId?: string }>(
      "GET",
      `/managed-configs/package/${encodeURIComponent(packageName)}`,
      undefined,
      { signal },
    ),
  saveManagedConfiguration: (
    updating: boolean,
    config: { mcmId: string; profileName: string; packageName: string },
    signal?: AbortSignal,
  ) =>
    invokeEnterprise<unknown>(
      updating ? "PUT" : "POST",
      "/managed-configs",
      config,
      { signal },
    ),
  deleteManagedConfiguration: (mcmId: string, signal?: AbortSignal) =>
    invokeEnterprise<unknown>(
      "DELETE",
      `/managed-configs/mcm/${encodeURIComponent(mcmId)}`,
      undefined,
      { signal },
    ),
  syncVpp: (signal?: AbortSignal) =>
    invoke<unknown>("GET", "/vpp/assets/sync", undefined, "store", { signal }),
};
