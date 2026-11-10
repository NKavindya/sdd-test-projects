import Twemoji from 'react-twemoji';
import { productFooter } from '../../common/branding';
import EntgraSider from '@entgra-ui/antd/entgra_ui/components/EntgraSider';
import EntgraHeader from '@entgra-ui/antd/entgra_ui/components/EntgraHeader';
import EntgraFooter from '@entgra-ui/antd/entgra_ui/components/EntgraFooter';
import { useEffect, useRef, useState } from 'react';
import {
  App,
  Avatar,
  Button,
  Dropdown,
  Layout,
  Modal,
  Select,
  Space,
} from 'antd';
import {
  ApiOutlined,
  AndroidFilled,
  AppleFilled,
  AppstoreOutlined,
  GlobalOutlined,
  HeartOutlined,
  LogoutOutlined,
  UserOutlined,
  WindowsFilled,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Joyride from 'react-joyride';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/StoreContext';
import { scopes } from '../../common/contracts';

const icons = {
  android: <AndroidFilled />,
  ios: <AppleFilled />,
  windows: <WindowsFilled />,
  'web-clip': <GlobalOutlined />,
};
export default function Home() {
  const {
    config,
    user,
    branding,
    deviceTypes,
    can,
    api,
    uiConfig,
    initialize,
  } = useStore();
  const { t, i18n } = useTranslation();
  const { notification } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [tour, setTour] = useState(false);
  const header = useRef(null);
  const parts = location.pathname.split('/');
  const platform = ['android', 'ios', 'windows', 'web-clip'].includes(parts[2])
    ? parts[2]
    : 'android';
  const section =
    parts[3] === 'favourite-apps' ? 'favourite-apps' : 'applications';
  const destinations = [
    { value: 'applications', label: t('Applications') },
    { value: 'favourite-apps', label: t('Favourites') },
  ];
  const types = [...deviceTypes, { name: 'web-clip' }];
  const logout = () =>
    Modal.confirm({
      title: t('Logout'),
      okText: t('Done'),
      cancelText: t('Cancel'),
      onOk: async () => {
        if (uiConfig?.isSsoEnable) {
          window.location.assign(config.serverConfig.ssoLogoutUri);
          return;
        }
        try {
          await api.session.logout();
          await initialize();
        } catch {
          notification.error({ message: t('There was a problem') });
        }
      },
    });
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !localStorage.getItem('ui-tour-store')) {
        localStorage.setItem('ui-tour-store', '1');
        setTour(true);
      }
    });
    if (header.current) observer.observe(header.current);
    return () => observer.disconnect();
  }, []);
  const external = (key) => {
    const url = config.navigation?.[key];
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  return (
    <Layout className="shell">
      <EntgraSider
        width={260}
        collapsed={collapsed}
        className="sidebar"
        breakpoint="lg"
        onCollapse={setCollapsed}
        minHeight="100vh"
        logo={branding.logo}
        logoIcon={branding.logoIcon}
        appName="store"
        classNameLogo="brand"
        theme="dark"
        currentRoute={section}
        defaultOpenKeys={['store']}
        items={[
          {
            key: 'store',
            icon: <AppstoreOutlined />,
            label: t('App Store'),
            children: destinations.map((item) => ({
              key: item.value,
              icon:
                item.value === 'applications' ? (
                  <AppstoreOutlined />
                ) : (
                  <HeartOutlined />
                ),
              label: <span className={`tour-${item.value}`}>{item.label}</span>,
            })),
          },
          ...(!can(scopes.hideEndpoint)
            ? [
                {
                  key: 'endpoint',
                  icon: <ApiOutlined />,
                  disabled: !config.navigation?.endpoint,
                  label: (
                    <span className="tour-endpoint">
                      {t('Endpoint Manager')}
                    </span>
                  ),
                },
              ]
            : []),
          ...(!can(scopes.hidePublisher)
            ? [
                {
                  key: 'publisher',
                  icon: <ApiOutlined />,
                  disabled: !config.navigation?.publisher,
                  label: (
                    <span className="tour-publisher">{t('App Publisher')}</span>
                  ),
                },
              ]
            : []),
        ]}
        sliderClick={({ key }) =>
          destinations.some((item) => item.value === key)
            ? navigate(`/store/${platform}/${key}`)
            : external(key)
        }
      />
      <Layout className="workspace">
        <EntgraHeader
          className="header"
          headerItems={[]}
          showAimOutlined={true}
        >
          <div ref={header} className="header-inner">
            <Select
              className="navigator"
              showSearch
              variant="borderless"
              suffixIcon={null}
              optionFilterProp="label"
              value={null}
              placeholder={t('Navigate me to…')}
              options={can(scopes.view) ? destinations : []}
              optionRender={({ label }) => (
                <div className="navigator-option">
                  <div>{label}</div>
                  <div className="navigator-breadcrumb">
                    {t('Home')} &gt; {label}
                  </div>
                </div>
              )}
              onChange={(key) => navigate(`/store/${platform}/${key}`)}
            />
            <Space>
              <Select
                className="language-select"
                popupClassName="language-menu"
                variant="borderless"
                aria-label={t('Language')}
                value={i18n.language}
                options={['en', 'ja', 'fr', 'es'].map((value, index) => ({
                  value,
                  label: (
                    <Twemoji
                      tag="span"
                      options={{
                        base: '/store/images/twemoji/',
                        folder: 'svg',
                        ext: '.svg',
                      }}
                    >
                      <span className="language-label">
                        {
                          [
                            '🇺🇸 English',
                            '🇯🇵 Japanese',
                            '🇫🇷 French',
                            '🇪🇸 Spanish',
                          ][index]
                        }
                      </span>
                    </Twemoji>
                  ),
                }))}
                onChange={(language) => {
                  i18n.changeLanguage(language);
                  localStorage.setItem('store-language', language);
                }}
              />
              <Dropdown
                menu={{
                  items: [
                    { key: 'username', label: user.username, disabled: true },
                    { key: 'tour', label: t('Start UI Tour') },
                    {
                      key: 'logout',
                      label: t('Logout'),
                      icon: <LogoutOutlined />,
                    },
                  ],
                  onClick: ({ key }) =>
                    key === 'tour'
                      ? setTour(true)
                      : key === 'logout' && logout(),
                }}
              >
                <Button
                  type="text"
                  className="tour-profile"
                  aria-label={user.username}
                >
                  <Avatar
                    className="avatar"
                    size={32}
                    shape="circle"
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#4288BA', color: '#fff' }}
                  />
                </Button>
              </Dropdown>
            </Space>
          </div>
        </EntgraHeader>
        <nav className="platform-strip" aria-label={t('Applications')}>
          {types.map((type) => (
            <Link
              className={platform === type.name ? 'active' : ''}
              key={type.name}
              to={`/store/${type.name}/${section}`}
            >
              <span
                style={{
                  color:
                    config.defaultPlatformIcons[type.name]?.color || '#535c68',
                }}
              >
                {icons[type.name] || <GlobalOutlined />}
              </span>
              {t(
                {
                  android: 'Android',
                  ios: 'iOS',
                  windows: 'Windows',
                  'web-clip': 'Web Apps',
                }[type.name] || type.name,
              )}
            </Link>
          ))}
        </nav>
        <Layout.Content className="main">
          <Outlet />
        </Layout.Content>
        <EntgraFooter footerText={branding.footerText || productFooter} />
      </Layout>
      <Joyride
        run={tour}
        continuous
        showSkipButton
        steps={[
          { target: '.tour-profile', content: t('Your User Profile') },
          { target: '.tour-applications', content: t('Applications') },
          { target: '.tour-favourite-apps', content: t('Favourites') },
          ...(!can(scopes.hideEndpoint)
            ? [{ target: '.tour-endpoint', content: t('Endpoint Manager') }]
            : []),
          ...(!can(scopes.hidePublisher)
            ? [{ target: '.tour-publisher', content: t('App Publisher') }]
            : []),
        ]}
        callback={({ status }) => {
          if (status === 'finished' || status === 'skipped') setTour(false);
        }}
        locale={{
          back: t('Back'),
          close: t('Close'),
          last: t('End'),
          next: t('Next'),
          skip: t('Skip'),
        }}
        styles={{ options: { primaryColor: '#4288BA' } }}
      />
    </Layout>
  );
}
