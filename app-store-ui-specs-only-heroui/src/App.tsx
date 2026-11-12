import { Button } from './shared/Button';
import { useEffect, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Joyride } from 'react-joyride';
import { Globe, Smartphone, AppWindow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSession } from './services/session';
import { config } from './services/client';
import { buildSsoLoginUrl } from './services/contracts';
import { EntgraSider } from './shared/EntgraSider';
import { EntgraHeader } from './shared/EntgraHeader';
import { EntgraFooter } from './shared/EntgraFooter';
import { Empty, Loading } from './shared/ui';
import Login from './scenes/Login';
import Catalogue from './scenes/Catalogue';
import ReleasePage from './scenes/Release';
import Wizard from './scenes/Wizard';
import Firmware from './scenes/Firmware';
export default function App() {
  const session = useSession();
  const { t } = useTranslation();
  const loc = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [tour, setTour] = useState(false);
  const [tourId, setTourId] = useState(0);
  const first = session.types[0]?.name || 'web-clip';
  const deviceType = loc.pathname.split('/')[1] || first;
  useEffect(() => {
    if (
      session.username &&
      !session.loading &&
      !localStorage.getItem('ui-tour-store')
    ) {
      localStorage.setItem('ui-tour-store', '1');
      setTour(true);
    }
  }, [session.username, session.loading]);
  useEffect(() => {
    if (
      !session.loading &&
      !session.username &&
      !session.error &&
      session.sso
    ) {
      const returnPath =
        loc.pathname === '/login'
          ? new URLSearchParams(loc.search).get('redirect')
          : '/store' + loc.pathname + loc.search;
      window.location.assign(
        buildSsoLoginUrl(
          config.serverConfig.ssoLoginUri,
          window.location.origin,
          returnPath,
        ),
      );
    }
  }, [
    session.loading,
    session.username,
    session.error,
    session.sso,
    loc.pathname,
    loc.search,
  ]);
  if (session.loading) return <Loading />;
  if (session.error)
    return <Empty title="There was a problem" description={session.error} />;
  if (!session.username && session.sso) return <Loading />;
  if (!session.username)
    return loc.pathname === '/login' ? (
      <Login />
    ) : (
      <Navigate
        replace
        to={`/login?redirect=${encodeURIComponent('/store' + loc.pathname + loc.search)}`}
      />
    );
  if (loc.pathname === '/login') return <Navigate to="/" replace />;
  const types = [...session.types, { id: -1, name: 'web-clip' }];
  const platform = (name: string) =>
    name === 'web-clip'
      ? 'Web Apps'
      : name === 'ios'
        ? 'iOS'
        : name === 'android'
          ? 'Android'
          : name === 'windows'
            ? 'Windows'
            : name;
  return (
    <div className={'app ' + (collapsed ? 'is-collapsed' : '')}>
      <EntgraSider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        deviceType={deviceType}
      />
      <div className="shell">
        <EntgraHeader
          deviceType={deviceType}
          onTour={() => {
            setTourId((x) => x + 1);
            setTour(true);
          }}
        />
        <div className="content-frame">
          <div className="device-strip">
            {types.map((type) => (
              <Button
                key={type.id}
                variant="ghost"
                className={
                  (type.name ===
                  (['android', 'ios', 'windows', 'web-clip'].includes(
                    deviceType,
                  )
                    ? deviceType
                    : 'android')
                    ? 'active '
                    : '') + type.name
                }
                onPress={() =>
                  navigate(
                    `/${type.name}/${loc.pathname.includes('favourite-apps') ? 'favourite-apps' : 'applications'}`,
                  )
                }
              >
                {type.name === 'web-clip' ? (
                  <Globe size={16} />
                ) : type.name === 'windows' ? (
                  <AppWindow size={16} />
                ) : (
                  <Smartphone size={16} />
                )}{' '}
                {t(platform(type.name))}
              </Button>
            ))}
          </div>
          <main>
            <Routes>
              <Route
                path="/"
                element={<Navigate to={`/${first}/applications`} replace />}
              />
              <Route
                path="/:deviceType"
                element={<Navigate to={`/${first}/applications`} replace />}
              />
              <Route
                path="/:deviceType/applications"
                element={
                  <Catalogue key={loc.pathname + String(loc.state?.selected)} />
                }
              />
              <Route
                path="/:deviceType/favourite-apps"
                element={<Catalogue key={loc.pathname} favourites />}
              />
              <Route
                path="/:deviceType/apps/:uuid"
                element={<ReleasePage key={loc.pathname + loc.search} />}
              />
              <Route
                path="/:deviceType/apps/:uuid/install"
                element={<Wizard />}
              />
              <Route
                path="/:deviceType/apps/:uuid/uninstall"
                element={<Wizard uninstall />}
              />
              <Route
                path="/:deviceType/firmware/:id"
                element={<Firmware key={loc.pathname} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <EntgraFooter
          text={session.theme.footerText ?? t('Unified Endpoint Manager')}
        />
      </div>
      <Joyride
        key={tourId}
        continuous
        options={{
          primaryColor: '#4288BA',
          showProgress: true,
          buttons: ['back', 'close', 'primary', 'skip'],
        }}
        run={tour}
        steps={[
          'profile',
          'applications',
          'favourites',
          'endpoint',
          'publisher',
        ].map((id, i) => ({
          target: `#tour-${id}`,
          content: t(
            [
              'Start UI Tour',
              'Applications',
              'Favourites',
              'Endpoint Manager',
              'App Publisher',
            ][i],
          ),
        }))}
        onEvent={(e) => {
          if (e.status === 'finished' || e.status === 'skipped') setTour(false);
        }}
      />
    </div>
  );
}
