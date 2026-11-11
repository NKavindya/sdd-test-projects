import { normalizeScopes } from './session-data';
import { wizardContexts } from './handoff';
import axios from 'axios';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { configure, request, api, notifyError } from './client';
import type { Config } from './types';
interface Session {
  config: Config;
  username: string;
  permissions: string[];
  types: string[];
  sso: boolean;
  has: (scope: string) => boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
export function useSession() {
  return useContext(Context)!;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Config>();
  const [username, setUsername] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [sso, setSso] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();
  const authenticate = async (c: Config) => {
    const user = await request<string>(
      'POST',
      '/store-ui-request-handler/user',
    );
    const access = await request<unknown>('GET', c.serverConfig.scopeUri);
    const list = normalizeScopes(access);
    setPermissions(list);
    setTypes([]);
    if (list.includes('dm:device-type:view')) {
      try {
        const data = await api<
          {
            name: string;
            deviceTypeMetaDefinition: { storeVisibilityEnabled: boolean };
          }[]
        >('deviceMgt', 'GET', '/device-types');
        setTypes(
          data
            .filter(
              (t) =>
                t.deviceTypeMetaDefinition?.storeVisibilityEnabled === true,
            )
            .map((t) => t.name),
        );
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 401) throw e;
        notifyError(e);
      }
    }
    try {
      const theme = await api<Partial<Config['theme']>>(
        'deviceMgt',
        'GET',
        '/whitelabel',
      );
      setConfig({ ...c, theme: { ...c.theme, ...theme } });
      document.title = `${theme.appTitle || c.defaultAppTitle} App Store`;
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) throw e;
      /* Branding is optional; use supplied defaults. */
    }
    setUsername(user);
  };
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const c = await fetch('/store/public/conf/config.json').then((r) => {
          if (!r.ok) throw new Error('There was a problem');
          return r.json() as Promise<Config>;
        });
        if (!active) return;
        configure(c);
        setConfig(c);
        let enabled = false;
        try {
          const ui = await request<{ isSsoEnable?: boolean }>(
            'GET',
            c.serverConfig.appUiConfigUri,
          );
          enabled = !!ui.isSsoEnable;
          setSso(enabled);
        } catch {
          /* Deployment-owned optional settings. */
        }
        try {
          await authenticate(c);
        } catch (error) {
          if (!axios.isAxiosError(error) || error.response?.status !== 401)
            throw error;
          if (enabled) {
            location.assign(c.serverConfig.ssoLoginUri);
            return;
          }
          navigate(
            '/store/login?redirect=' +
              encodeURIComponent(location.pathname + location.search),
            { replace: true },
          );
        }
      } catch (e) {
        setFatal(e instanceof Error ? e.message : 'There was a problem');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const expired = () => {
      wizardContexts.clear();
      setUsername('');
      setPermissions([]);
      if (sso && config) location.assign(config.serverConfig.ssoLoginUri);
      else if (loc.pathname != '/store/login')
        navigate(
          '/store/login?redirect=' +
            encodeURIComponent(loc.pathname + loc.search),
          { replace: true },
        );
    };
    window.addEventListener('store:unauthorized', expired);
    return () => window.removeEventListener('store:unauthorized', expired);
  }, [loc, sso, config, navigate]);
  if (fatal)
    return (
      <div className="status-panel">
        <h1>There was a problem</h1>
        <p>{fatal}</p>
      </div>
    );
  if (loading || !config)
    return (
      <div className="full-loading">
        <span className="spinner" />
      </div>
    );
  return (
    <Context.Provider
      value={{
        config,
        username,
        permissions,
        types,
        sso,
        has: (s) => permissions.includes(s),
        refresh: () => authenticate(config),
        logout: async () => {
          await request(
            sso ? 'GET' : 'POST',
            sso
              ? config.serverConfig.ssoLogoutUri
              : config.serverConfig.logoutUri,
          );
          wizardContexts.clear();
          setUsername('');
          setPermissions([]);
          navigate('/store/login', { replace: true });
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
