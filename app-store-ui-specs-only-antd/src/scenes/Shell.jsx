import { useEffect, useRef, useState } from 'react';
import { Avatar, Dropdown, Layout, Modal, Select, Tabs } from 'antd';
import {
  AppstoreOutlined,
  HeartOutlined,
  ApiOutlined,
  UserOutlined,
  AndroidFilled,
  AppleFilled,
  WindowsFilled,
  GlobalOutlined,
} from '@ant-design/icons';
import {
  Redirect,
  Route,
  Switch,
  useHistory,
  useLocation,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Twemoji from 'react-twemoji';
import Joyride, { STATUS } from 'react-joyride';
import EntgraSider from '../shared/EntgraSider';
import EntgraHeader from '../shared/EntgraHeader';
import EntgraFooter from '../shared/EntgraFooter';
import { useStore } from '../services/context';
import { logout, showError } from '../services/api';
import { scopes } from '../services/contracts';
import Catalogue from './catalogue/Catalogue';
import Release from './release/Release';
import Wizard from './operations/Wizard';
import Firmware from './firmware/Firmware';
export default function Shell() {
  const { t, i18n } = useTranslation();
  const { user, has, theme, deviceTypes, uiConfig, config, clearSession } =
    useStore();
  const history = useHistory();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [tour, setTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const header = useRef();
  const rawType = location.pathname.split('/')[1];
  const deviceType = ['android', 'ios', 'windows', 'web-clip'].includes(rawType)
    ? rawType
    : 'android';
  const section = location.pathname.includes('/favourite-apps')
    ? 'favourite-apps'
    : 'applications';
  const home = `/${deviceTypes[0]?.name || 'web-clip'}/applications`;
  useEffect(() => {
    if (!header.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (
        entries.some((x) => x.isIntersecting) &&
        !localStorage.getItem('ui-tour-store')
      ) {
        localStorage.setItem('ui-tour-store', '1');
        setTour(true);
      }
    });
    observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  function restartTour() {
    setCollapsed(false);
    setTourKey((x) => x + 1);
    setTour(true);
  }
  function confirmLogout() {
    Modal.confirm({
      title: t('Logout'),
      okText: t('OK'),
      cancelText: t('Cancel'),
      onOk: async () => {
        try {
          await logout(uiConfig?.isSsoEnable);
          clearSession();
          history.replace('/login');
        } catch (error) {
          showError(error);
        }
      },
    });
  }
  // External console paths are deployment-owned; never guess routes absent from Specs.
  const links = config.deploymentLinks || {};
  const menu = [
    {
      key: 'store',
      icon: <AppstoreOutlined />,
      label: t('App Store'),
      children: [
        {
          key: 'applications',
          icon: <AppstoreOutlined />,
          label: <span className="tour-applications">{t('Applications')}</span>,
          onClick: () => history.push(`/${deviceType}/applications`),
        },
        {
          key: 'favourite-apps',
          icon: <HeartOutlined />,
          label: <span className="tour-favourites">{t('Favourites')}</span>,
          onClick: () => history.push(`/${deviceType}/favourite-apps`),
        },
      ],
    },
    ...(!has('dm:hide:endpoint:mgt')
      ? [
          {
            key: 'endpoint',
            icon: <ApiOutlined />,
            label: (
              <span className="tour-endpoint">{t('Endpoint Manager')}</span>
            ),
            disabled: !links.endpointManager,
            onClick: () =>
              window.open(
                links.endpointManager,
                '_blank',
                'noopener,noreferrer',
              ),
          },
        ]
      : []),
    ...(!has('dm:hide:app:publisher')
      ? [
          {
            key: 'publisher',
            icon: <ApiOutlined />,
            label: <span className="tour-publisher">{t('App Publisher')}</span>,
            disabled: !links.appPublisher,
            onClick: () =>
              window.open(links.appPublisher, '_blank', 'noopener,noreferrer'),
          },
        ]
      : []),
  ];
  const typeLabels = {
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    'web-clip': 'Web Apps',
  };
  const icons = {
    android: <AndroidFilled style={{ color: '#7db343' }} />,
    ios: <AppleFilled style={{ color: '#535c68' }} />,
    windows: <WindowsFilled style={{ color: '#008cc4' }} />,
  };
  const steps = [
    ['.tour-profile', 'Start UI Tour'],
    ['.tour-applications', 'Applications'],
    ['.tour-favourites', 'Favourites'],
    ['.tour-endpoint', 'Endpoint Manager'],
    ['.tour-publisher', 'App Publisher'],
  ].map(([target, content]) => ({
    target,
    content: t(content),
    disableBeacon: true,
  }));
  return (
    <Layout className="store-shell">
      <EntgraSider
        rootPath="/"
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        width={258}
        minHeight="100vh"
        logo={theme.logo}
        logoIcon={theme.logoIcon}
        currentLocation={section}
        openGroups={['store']}
        items={menu}
      />
      <Layout className="shell-body">
        <div ref={header}>
          <EntgraHeader mode="horizontal">
            <Select
              className="jump-navigator"
              showSearch
              variant="borderless"
              suffixIcon={null}
              value={null}
              placeholder={t('Navigate me to…')}
              optionFilterProp="searchText"
              onChange={(value) => history.push(value)}
              options={
                has(scopes.view)
                  ? ['applications', 'favourite-apps'].map((key) => ({
                      value: `/${deviceType}/${key}`,
                      searchText: t(
                        key === 'applications' ? 'Applications' : 'Favourites',
                      ),
                      label: (
                        <>
                          <span>
                            {t(
                              key === 'applications'
                                ? 'Applications'
                                : 'Favourites',
                            )}
                          </span>
                          <small className="jump-path">
                            {t('Home')} /{' '}
                            {t(key === 'applications' ? 'Apps' : 'Favourites')}
                          </small>
                        </>
                      ),
                    }))
                  : []
              }
            />
            <div className="header-spacer" />
            <Select
              className="language"
              showSearch
              optionFilterProp="searchText"
              variant="borderless"
              value={i18n.language}
              onChange={(value) => i18n.changeLanguage(value)}
              options={Object.entries({
                en: '🇺🇸 English',
                ja: '🇯🇵 Japanese',
                fr: '🇫🇷 French',
                es: '🇪🇸 Spanish',
              }).map(([value, label]) => ({
                value,
                searchText: label,
                label: (
                  <Twemoji options={{ folder: 'svg', ext: '.svg' }}>
                    {label}
                  </Twemoji>
                ),
              }))}
            />
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'name', label: user.username, disabled: true },
                  {
                    key: 'tour',
                    label: t('Start UI Tour'),
                    onClick: restartTour,
                  },
                  { key: 'logout', label: t('Logout'), onClick: confirmLogout },
                ],
              }}
            >
              <button
                className="profile-button tour-profile"
                aria-label={user.username}
              >
                <Avatar
                  style={{ background: '#4288BA' }}
                  icon={<UserOutlined />}
                />
              </button>
            </Dropdown>
          </EntgraHeader>
        </div>
        <Layout.Content className="shell-content">
          <Tabs
            className="platform-strip"
            activeKey={deviceType}
            onChange={(key) => history.push(`/${key}/${section}`)}
            items={[
              ...deviceTypes.map((type) => ({
                key: type.name,
                label: (
                  <>
                    {icons[type.name] || <GlobalOutlined />}{' '}
                    {t(typeLabels[type.name] || type.name)}
                  </>
                ),
              })),
              {
                key: 'web-clip',
                label: (
                  <>
                    <GlobalOutlined /> {t('Web Apps')}
                  </>
                ),
              },
            ]}
          />
          <div className="scene">
            <Switch>
              <Route
                exact
                path="/:deviceType/applications"
                render={() => <Catalogue key={location.pathname} />}
              />
              <Route
                exact
                path="/:deviceType/favourite-apps"
                render={() => <Catalogue favourites key={location.pathname} />}
              />
              <Route
                exact
                path="/:deviceType/apps/:uuid/:action(install|uninstall)"
                component={Wizard}
              />
              <Route exact path="/:deviceType/apps/:uuid" component={Release} />
              <Route
                exact
                path="/:deviceType/firmware/:id"
                component={Firmware}
              />
              <Route>
                <Redirect to={home} />
              </Route>
            </Switch>
          </div>
        </Layout.Content>
        <EntgraFooter
          text={theme.footerText ?? t('Unified Endpoint Manager')}
        />
      </Layout>
      <Joyride
        key={tourKey}
        steps={steps}
        run={tour}
        continuous
        showSkipButton
        showProgress
        locale={{
          back: t('Back'),
          close: t('Cancel'),
          last: t('End'),
          next: t('Next'),
          skip: t('Skip'),
        }}
        callback={({ status }) => {
          if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status))
            setTour(false);
        }}
        styles={{ options: { primaryColor: '#4288BA', zIndex: 2000 } }}
      />
    </Layout>
  );
}
