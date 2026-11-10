import { useTranslation } from 'react-i18next';
import enUS from 'antd/locale/en_US';
import jaJP from 'antd/locale/ja_JP';
import frFR from 'antd/locale/fr_FR';
import esES from 'antd/locale/es_ES';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { App as AntApp, ConfigProvider } from 'antd';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { createApi, SpecificationGap } from './services/api';
import {
  normalizeScopes,
  readPath,
  safeReturn,
  ssoLoginUrl,
  scopes,
} from './common/contracts';
import { StoreContext } from './services/StoreContext';
import { ErrorState, Loading } from './components/States';
import Login from './scenes/Login';
import Home from './scenes/Home';
import Applications from './scenes/Home/scenes/Applications';
import Favourites from './scenes/Home/scenes/Favourites';
import Release from './scenes/Home/scenes/Release';
import Install from './scenes/Home/scenes/Install';
import Uninstall from './scenes/Home/scenes/Uninstall';
import Firmware from './scenes/Home/scenes/Firmware';

function Store({ config }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [boot, setBoot] = useState({ loading: true, error: null });
  const [uiConfig, setUiConfig] = useState(null);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [branding, setBranding] = useState(config.theme);
  useEffect(() => {
    document.title = `${branding.appTitle || config.defaultAppTitle || 'Entgra'} App Store`;
  }, [branding.appTitle, config.defaultAppTitle]);
  const [handoff, setHandoff] = useState(null);
  const unauthorized = useCallback(() => {
    setUser(null);
    if (uiConfig?.isSsoEnable) {
      window.location.assign(
        ssoLoginUrl(
          config.serverConfig.ssoLoginUri,
          location.pathname + location.search,
          window.location.origin,
        ),
      );
      return;
    }
    navigate(
      `/store/login?redirect=${encodeURIComponent(location.pathname + location.search)}`,
      { replace: true },
    );
  }, [
    navigate,
    location.pathname,
    location.search,
    uiConfig?.isSsoEnable,
    config.serverConfig.ssoLoginUri,
  ]);
  const api = useMemo(
    () => createApi(config, unauthorized),
    [config, unauthorized],
  );

  const initialize = useCallback(async () => {
    setBoot({ loading: true, error: null });
    try {
      const username = await api.session.user();
      const permissions = normalizeScopes(await api.session.scopes());
      const currentUser = { username, scopes: permissions };
      const rawUiConfig = await api.session.uiConfig();
      const settings = readPath(rawUiConfig, config.contracts.uiConfig.root);
      setUiConfig(settings);
      if (permissions.includes(scopes.deviceTypes)) {
        const result = await api.reference('deviceTypes');
        setDeviceTypes(
          result.rows.filter(
            (type) =>
              type.deviceTypeMetaDefinition?.storeVisibilityEnabled === true,
          ),
        );
      } else setDeviceTypes([]);
      if (config.contracts?.whitelabel) {
        const theme = await api.reference('whitelabel');
        setBranding({ ...config.theme, ...theme.rows[0] });
      }
      setUser(currentUser);
      setBoot({ loading: false, error: null });
    } catch (error) {
      if (error.response?.status === 401) {
        try {
          const raw = await api.session.uiConfig();
          if (
            !config.contracts?.uiConfig ||
            config.contracts.uiConfig.root == null
          ) {
            throw new SpecificationGap(
              'Missing ui-config response mapping; see docs/gap-register.md.',
            );
          }
          const settings = readPath(raw, config.contracts.uiConfig.root);
          setUiConfig(settings);
          if (settings.isSsoEnable) {
            window.location.assign(
              ssoLoginUrl(
                config.serverConfig.ssoLoginUri,
                location.pathname + location.search,
                window.location.origin,
              ),
            );
            return;
          }
          setUser(null);
          setBoot({ loading: false, error: null });
        } catch (configError) {
          setBoot({ loading: false, error: configError });
        }
      } else setBoot({ loading: false, error });
    }
  }, [api, config, location.pathname, location.search]);
  // Navigation changes replace the 401 callback, but must not re-probe a live session.
  useEffect(() => {
    initialize();
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps
  const can = (scope) => user?.scopes.includes(scope) || false;
  const landing = `/store/${deviceTypes[0]?.name || 'web-clip'}/applications`;
  useEffect(() => {
    if (!/\/apps\/[^/]+\/(install|uninstall)$/.test(location.pathname))
      setHandoff(null);
  }, [location.pathname]);
  const context = {
    api,
    config,
    user,
    can,
    deviceTypes,
    branding,
    uiConfig,
    initialize,
    handoff,
    setHandoff,
  };

  if (boot.loading) return <Loading fullscreen />;
  if (boot.error) return <ErrorState error={boot.error} />;
  if (!user)
    return (
      <StoreContext.Provider value={context}>
        <Routes>
          <Route path="/store/login" element={<Login />} />
          <Route
            path="*"
            element={
              <Navigate
                replace
                to={`/store/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
              />
            }
          />
        </Routes>
      </StoreContext.Provider>
    );
  return (
    <StoreContext.Provider value={context}>
      <Routes>
        <Route
          path="/store/login"
          element={
            <Navigate
              replace
              to={safeReturn(
                new URLSearchParams(location.search).get('redirect'),
                window.location.origin,
              )}
            />
          }
        />
        <Route path="/store" element={<Home />}>
          <Route index element={<Navigate replace to={landing} />} />
          <Route
            path=":deviceType"
            element={<Navigate replace to={landing} />}
          />
          <Route path=":deviceType/applications" element={<Applications />} />
          <Route path=":deviceType/favourite-apps" element={<Favourites />} />
          <Route path=":deviceType/apps/:uuid" element={<Release />} />
          <Route path=":deviceType/apps/:uuid/install" element={<Install />} />
          <Route
            path=":deviceType/apps/:uuid/uninstall"
            element={<Uninstall />}
          />
          <Route path=":deviceType/firmware/:id" element={<Firmware />} />
        </Route>
        <Route path="*" element={<Navigate replace to={landing} />} />
      </Routes>
    </StoreContext.Provider>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const [state, setState] = useState({ config: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/store/conf/config.json', { signal: controller.signal }).then(
      ({ data }) => {
        setState({ config: data, error: null });
      },
      (error) => {
        if (error.code !== 'ERR_CANCELED') setState({ config: null, error });
      },
    );
    return () => controller.abort();
  }, []);
  return (
    <ConfigProvider
      locale={{ en: enUS, ja: jaJP, fr: frFR, es: esES }[i18n.language] || enUS}
      theme={{
        token: {
          colorPrimary: state.config?.theme.primaryColor || '#4288BA',
          fontFamily: 'Poppins',
          borderRadius: 10,
          controlHeight: 42,
        },
        components: {
          Button: { borderRadius: 10, primaryShadow: 'none' },
          Menu: { fontSize: 16, itemSelectedBg: '#f0f2f5' },
        },
      }}
    >
      <AntApp>
        {state.error ? (
          <ErrorState error={state.error} />
        ) : state.config ? (
          <BrowserRouter>
            <Store config={state.config} />
          </BrowserRouter>
        ) : (
          <Loading fullscreen />
        )}
      </AntApp>
    </ConfigProvider>
  );
}
