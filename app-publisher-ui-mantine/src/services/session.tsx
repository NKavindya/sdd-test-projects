import { Alert, Button, Center, Loader, Stack, Text } from "@mantine/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { configureApi, invoke, request } from "./api";
import { parseScopes, safeRedirect } from "./contracts.mjs";
import type { RuntimeConfig } from "./types";
interface Session {
  config: RuntimeConfig;
  username: string;
  scopes: string[];
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
  const [config, setConfig] = useState<RuntimeConfig>();
  const [username, setUsername] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [uiConfig, setUiConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState("");
  const loadSession = useCallback(async (cfg: RuntimeConfig) => {
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
    };
  }, [loadSession]);
  useEffect(() => {
    const expire = () => {
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
        uiConfig,
        isSso: uiConfig.isSsoEnable === true || uiConfig.isSsoEnable === "true",
        has: (scope) => scopes.includes(scope),
        refresh: () => loadSession(config),
        logout: async () => {
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
