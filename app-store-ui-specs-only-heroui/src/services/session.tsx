import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  config,
  loadConfig,
  request,
  dm,
  ApiError,
  type Config,
} from './client';
import type { DeviceType } from './model';
import { normalizeScopes } from './contracts';
interface Session {
  username: string;
  scopes: string[];
  types: DeviceType[];
  theme: Config['theme'];
  loading: boolean;
  error: string;
  sso: boolean;
  has: (s: string) => boolean;
  refresh: () => Promise<void>;
}
const SessionContext = createContext<Session>(null!);
export const useSession = () => useContext(SessionContext);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    username: '',
    scopes: [] as string[],
    types: [] as DeviceType[],
    theme: {
      logo: '/store/images/logo-white.png',
      logoIcon: '/store/images/favicon.svg',
      primaryColor: '#4288BA',
    } as Config['theme'],
    loading: true,
    error: '',
    sso: false,
  });
  async function refresh() {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      if (!config) await loadConfig();
      let sso = false;
      try {
        const ui = await request<{ isSsoEnable?: boolean }>(
          'GET',
          config.serverConfig.appUiConfigUri,
        );
        sso = ui.isSsoEnable === true;
      } catch {
        /* deployment config is optional */
      }
      setState((s) => ({ ...s, sso }));
      const username = await request<string>(
        'POST',
        '/store-ui-request-handler/user',
      );
      const raw = await request<unknown>('GET', config.serverConfig.scopeUri);
      const scopes = normalizeScopes(raw);
      let types: DeviceType[] = [];
      let theme = config.theme;
      if (scopes.includes('dm:device-type:view'))
        try {
          types = (await dm<DeviceType[]>('/device-types')).filter(
            (t) => t.deviceTypeMetaDefinition?.storeVisibilityEnabled === true,
          );
        } catch {
          /* keep Web Apps strip */
        }
      try {
        theme = {
          ...theme,
          ...(await dm<Partial<Config['theme']>>('/whitelabel')),
        };
      } catch {
        /* branding fallback */
      }
      document.title = `${theme.appTitle || config.defaultAppTitle} App Store`;
      const favicon = document.querySelector<HTMLLinkElement>('link[rel=icon]');
      if (favicon && theme.favicon) favicon.href = theme.favicon;
      setState({
        username,
        scopes,
        types,
        theme,
        loading: false,
        error: '',
        sso,
      });
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        username: '',
        scopes: [],
        error: e instanceof ApiError && e.status === 401 ? '' : String(e),
      }));
    }
  }
  useEffect(() => {
    void refresh();
    const unauthorized = () =>
      setState((s) => ({ ...s, username: '', scopes: [], loading: false }));
    window.addEventListener('store:unauthorized', unauthorized);
    return () => window.removeEventListener('store:unauthorized', unauthorized);
  }, []);
  return (
    <SessionContext.Provider
      value={{ ...state, refresh, has: (s) => state.scopes.includes(s) }}
    >
      {children}
    </SessionContext.Provider>
  );
}
