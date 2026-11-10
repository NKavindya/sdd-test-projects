import { useEffect, useState } from 'react';
import { ConfigProvider, Result } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import frFR from 'antd/locale/fr_FR';
import esES from 'antd/locale/es_ES';
import { useTranslation } from 'react-i18next';
import {
  loadConfig,
  request,
  session,
  devices,
  setUnauthorizedHandler,
  authDestination,
  showError,
} from './services/api';
import { scopes } from './services/contracts';
import { StoreContext } from './services/context';
import { Loading } from './shared/Feedback';
import Login from './scenes/Login';
import Shell from './scenes/Shell';
export default function App() {
  const { t, i18n } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const [state, setState] = useState({ loading: true });
  const [handoff, setHandoff] = useState(null);
  async function bootstrap() {
    let config;
    try {
      config = await loadConfig();
      let user;
      try {
        user = await session();
      } catch (error) {
        if (error.response?.status !== 401) throw error;
        let uiConfig = {};
        try {
          uiConfig = await request('GET', config.serverConfig.appUiConfigUri);
        } catch {
          /* deployment optional */
        }
        setState({
          loading: false,
          config,
          uiConfig,
          user: null,
          deviceTypes: [],
          theme: config.theme,
        });
        if (uiConfig.isSsoEnable) window.location.assign(authDestination(true));
        else if (location.pathname !== '/login')
          history.replace(
            '/login?redirect=' +
              encodeURIComponent(
                '/store' + location.pathname + location.search,
              ),
          );
        return;
      }
      let uiConfig = {};
      try {
        uiConfig = await request('GET', config.serverConfig.appUiConfigUri);
      } catch {
        /* keep deployment defaults */
      }
      const [types, branding] = await Promise.allSettled([
        user.scopes.includes(scopes.types)
          ? devices('/device-types')
          : Promise.resolve([]),
        devices('/whitelabel'),
      ]);
      if (
        [types, branding].some(
          (result) =>
            result.status === 'rejected' &&
            result.reason.response?.status === 401,
        )
      ) {
        setState({
          loading: false,
          config,
          uiConfig,
          user: null,
          deviceTypes: [],
          theme: config.theme,
        });
        if (uiConfig.isSsoEnable) window.location.assign(authDestination(true));
        else
          history.replace(
            '/login?redirect=' +
              encodeURIComponent(
                '/store' + location.pathname + location.search,
              ),
          );
        return;
      }
      if (types.status === 'rejected') showError(types.reason);
      const deviceTypes =
        types.status === 'fulfilled'
          ? types.value.filter(
              (x) =>
                x.deviceTypeMetaDefinition?.storeVisibilityEnabled === true,
            )
          : [];
      const theme = {
        ...config.theme,
        ...(branding.status === 'fulfilled' ? branding.value : {}),
      };
      document.title = `${theme.appTitle || config.defaultAppTitle} App Store`;
      if (theme.favicon)
        document.querySelector('link[rel="icon"]').href = theme.favicon;
      setState({ loading: false, config, uiConfig, user, deviceTypes, theme });
      if (location.pathname === '/login') history.replace('/');
    } catch (error) {
      setState({ loading: false, config, fatal: error });
    }
  }
  useEffect(() => {
    bootstrap();
  }, []);
  useEffect(() => {
    if (!state.config) return;
    setUnauthorizedHandler(() => {
      setHandoff(null);
      setState((s) => ({ ...s, user: null }));
      if (state.uiConfig?.isSsoEnable)
        window.location.assign(authDestination(true));
      else if (window.location.pathname !== '/store/login')
        history.replace(
          '/login?redirect=' +
            encodeURIComponent(
              window.location.pathname + window.location.search,
            ),
        );
    });
    return () => setUnauthorizedHandler(null);
  }, [state.config, state.uiConfig]);
  const has = (scope) => state.user?.scopes.includes(scope) || false;
  const value = {
    ...state,
    has,
    handoff,
    setHandoff,
    refresh: bootstrap,
    clearSession: () => {
      setHandoff(null);
      setState((s) => ({ ...s, user: null }));
    },
  };
  return (
    <ConfigProvider
      locale={{ en: enUS, ja: jaJP, fr: frFR, es: esES }[i18n.language] || enUS}
      theme={{
        token: {
          colorPrimary: state.theme?.primaryColor || '#4288BA',
          fontFamily: 'Poppins, sans-serif',
          controlHeight: 42,
          borderRadius: 10,
        },
        components: { Button: { primaryShadow: 'none' } },
      }}
    >
      <StoreContext.Provider value={value}>
        {state.loading ? (
          <Loading />
        ) : state.fatal ? (
          <Result status="error" title={t('There was a problem')} />
        ) : state.user ? (
          <Shell />
        ) : (
          <Login />
        )}
      </StoreContext.Provider>
    </ConfigProvider>
  );
}
