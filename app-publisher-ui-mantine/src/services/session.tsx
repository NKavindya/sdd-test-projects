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
import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { configureApi, invoke, request } from "./api";
import { parseScopes, safeRedirect } from "./contracts.mjs";
import { platformApi } from "./platformIntegrations";
import type { RuntimeConfig } from "./types";
interface Session {
  config: RuntimeConfig;
  username: string;
  scopes: string[];
  androidEnterpriseToken: string | null;
  isSso: boolean;
  uiConfig: any;
  has: (scope: string) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
export const useSession = () => {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider missing");
  return value;
};
export function SessionProvider({ children }: { children: ReactNode }) {
  const generation = useRef(0);
  const [androidEnterpriseToken, setAndroidEnterpriseToken] = useState<
    string | null
  >(null);
  const [config, setConfig] = useState<RuntimeConfig>();
  const [username, setUsername] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [uiConfig, setUiConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const loadSession = useCallback(async (cfg: RuntimeConfig) => {
    const current = ++generation.current;
    setAndroidEnterpriseToken(null);
    configureApi(cfg);
    let user = "";
    let granted: string[] = [];
    try {
      const result = await request<string>(
        "POST",
        `${cfg.serverConfig.invoker.contextPath}/user`,
      );
      if (typeof result !== "string" || !result)
        throw new Error("Invalid session response");
      const response = await request<any>("GET", cfg.serverConfig.scopeUri);
      if (!(
        Array.isArray(response) ||
        typeof response === "string" ||
        typeof response?.userScopes === "string" ||
        Array.isArray(response?.userScopes)
      ))
        throw new Error("Invalid scope response");
      user = result;
      granted = parseScopes(response);
    } catch {
      user = "";
      granted = [];
    }
    let ui: any = {};
    try {
      ui = await request("GET", cfg.serverConfig.appUiConfigUri);
    } catch {
      /* Optional configuration: retain defaults */
    }
    if (user && granted.includes("dm:whitelable:view")) {
      try {
        ui = {
          ...ui,
          whitelabel: await invoke(
            "GET",
            "/whitelabel",
            undefined,
            "deviceMgt",
          ),
        };
      } catch {
        /* Optional branding: retain defaults */
      }
    }
    const token = user
      ? await platformApi.enterpriseToken(window.location.origin)
      : null;
    if (current !== generation.current) return;
    setAndroidEnterpriseToken(token);
    setUiConfig(ui || {});
    setUsername(user);
    setScopes(granted);
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/app-publisher/public/conf/config.json", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error();
        const cfg = await response.json();
        if (!cfg.serverConfig?.invoker?.publisher) throw new Error();
        if (!active) return;
        setConfig(cfg);
        await loadSession(cfg);
      } catch {
        if (active) setFatal("Error occurred while loading the configuration");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
      generation.current++;
    };
  }, [loadSession]);
  useEffect(() => {
    const expire = () => {
      generation.current++;
      setAndroidEnterpriseToken(null);
      setUsername("");
      setScopes([]);
    };
    window.addEventListener("publisher:unauthorized", expire);
    return () => window.removeEventListener("publisher:unauthorized", expire);
  }, []);
  if (fatal)
    return (
      <Center mih="100vh">
        <Alert color="red" title={fatal}>
          <Button onClick={() => location.reload()}>Retry</Button>
        </Alert>
      </Center>
    );
  if (loading || !config)
    return (
      <Center mih="100vh">
        <Stack align="center">
          <Loader />
          <Text>Connecting to App Publisher…</Text>
        </Stack>
      </Center>
    );
  return (
    <Context.Provider
      value={{
        config,
        username,
        scopes,
        androidEnterpriseToken,
        uiConfig,
        isSso: uiConfig.isSsoEnable === true || uiConfig.isSsoEnable === "true",
        has: (scope) => scopes.includes(scope),
        refresh: () => loadSession(config),
        logout: async () => {
          generation.current++;
          setAndroidEnterpriseToken(null);
          if (
            uiConfig.isSsoEnable === true ||
            uiConfig.isSsoEnable === "true"
          ) {
            location.assign(
              `${config.serverConfig.ssoLogoutUri}?redirect=${encodeURIComponent("/app-publisher/login")}`,
            );
            return;
          }
          await request("POST", config.serverConfig.logoutUri);
          setUsername("");
          setScopes([]);
          location.assign("/app-publisher/login");
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export { safeRedirect };
