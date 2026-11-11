import { DropdownMenu } from 'radix-ui';
import { Joyride } from 'react-joyride';
import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command } from 'cmdk';
import TwemojiModule from 'react-twemoji';
const Twemoji =
  typeof TwemojiModule === 'function'
    ? TwemojiModule
    : (TwemojiModule as unknown as { default: typeof TwemojiModule }).default;
import {
  LayoutGrid,
  Heart,
  Unplug,
  UserRound,
  ChevronDown,
  Globe,
  Smartphone,
  Monitor,
  Apple,
} from 'lucide-react';
import { EntgraSider } from '@/shared/EntgraSider';
import { EntgraHeader } from '@/shared/EntgraHeader';
import { EntgraFooter } from '@/shared/EntgraFooter';
import { Confirm } from '@/shared/common';
import { useSession } from '@/services/session';
const languages = [
  ['en', '🇺🇸', 'English'],
  ['ja', '🇯🇵', 'Japanese'],
  ['fr', '🇫🇷', 'French'],
  ['es', '🇪🇸', 'Spanish'],
];
export const platform = (v: string) =>
  ({
    android: 'Android',
    ios: 'iOS',
    windows: 'Windows',
    'web-clip': 'Web Apps',
  })[v] || v;
export function Shell() {
  const session = useSession();
  const { t, i18n } = useTranslation();
  const { deviceType = 'android' } = useParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState(false);
  const [lang, setLang] = useState(false);
  const [jump, setJump] = useState(false);
  const [logout, setLogout] = useState(false);
  const [tour, setTour] = useState(-1);
  const favourite = loc.pathname.includes('favourite-apps');
  const current = ['ios', 'android', 'windows', 'web-clip'].includes(deviceType)
    ? deviceType
    : 'android';
  useEffect(() => {
    if (session.username && !localStorage.getItem('ui-tour-store')) {
      localStorage.setItem('ui-tour-store', '1');
      setTour(0);
    }
  }, [session.username]);
  if (!session.username)
    return (
      <Navigate
        to={
          '/store/login?redirect=' +
          encodeURIComponent(loc.pathname + loc.search)
        }
        replace
      />
    );
  const go = (section: string) => {
    navigate(`/store/${current}/${section}`);
    setJump(false);
  };
  const tourSteps = [
    'Start UI Tour',
    'Applications',
    'Favourites',
    'Endpoint Manager',
    'App Publisher',
  ];
  return (
    <div className="app-shell">
      <EntgraSider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        logo={session.config.theme.logo}
        logoIcon={session.config.theme.logoIcon}
      >
        <button className="nav-row" onClick={() => setOpen(!open)}>
          <LayoutGrid size={17} />
          <span>{t('App Store')}</span>
          <ChevronDown size={15} />
        </button>
        {open && (
          <div className="nav-children">
            <Link
              id="tour-applications"
              aria-label={t('Applications')}
              className={!favourite ? 'selected' : ''}
              to={`/store/${current}/applications`}
            >
              <LayoutGrid size={17} />
              <span>{t('Applications')}</span>
            </Link>
            <Link
              id="tour-favourites"
              aria-label={t('Favourites')}
              className={favourite ? 'selected' : ''}
              to={`/store/${current}/favourite-apps`}
            >
              <Heart size={17} />
              <span>{t('Favourites')}</span>
            </Link>
          </div>
        )}
        {!session.has('dm:hide:endpoint:mgt') && (
          <a
            id="tour-endpoint"
            aria-label={t('Endpoint Manager')}
            className="nav-row"
            href="/endpoint-mgt/"
            target="_blank"
            rel="noreferrer"
          >
            <Unplug size={17} />
            <span>{t('Endpoint Manager')}</span>
          </a>
        )}
        {!session.has('dm:hide:app:publisher') && (
          <a
            id="tour-publisher"
            aria-label={t('App Publisher')}
            className="nav-row"
            href="/publisher/"
            target="_blank"
            rel="noreferrer"
          >
            <Unplug size={17} />
            <span>{t('App Publisher')}</span>
          </a>
        )}
      </EntgraSider>
      <div className="shell-right">
        <EntgraHeader>
          <div className="jump">
            <button className="jump-control" onClick={() => setJump(!jump)}>
              {t('Navigate me to…')}
            </button>
            {jump && (
              <Command className="popup">
                <Command.Input placeholder={t('Search')} autoFocus />
                <Command.List>
                  {[
                    ['Applications', 'applications'],
                    ['Favourites', 'favourite-apps'],
                  ].map(([title, path]) => (
                    <Command.Item key={path} onSelect={() => go(path)}>
                      <strong>{t(title)}</strong>
                      <small>
                        {t('Home')} / {t(title)}
                      </small>
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>
            )}
          </div>
          <div className="header-spacer" />
          <div className="language">
            <button onClick={() => setLang(!lang)} className="language-control">
              <Twemoji key={i18n.language} options={{ className: 'twemoji' }}>
                {languages.find((l) => l[0] === i18n.language)?.[1]}{' '}
                {languages.find((l) => l[0] === i18n.language)?.[2] ||
                  'English'}
              </Twemoji>
              <ChevronDown size={15} />
            </button>
            {lang && (
              <Command className="popup">
                <Command.Input placeholder={t('Search')} />
                <Command.List>
                  {languages.map(([code, flag, label]) => (
                    <Command.Item
                      key={code}
                      onSelect={() => {
                        i18n.changeLanguage(code);
                        setLang(false);
                      }}
                    >
                      <Twemoji
                        key={i18n.language}
                        options={{ className: 'twemoji' }}
                      >
                        {flag} {label}
                      </Twemoji>
                    </Command.Item>
                  ))}
                </Command.List>
              </Command>
            )}
          </div>
          <DropdownMenu.Root open={menu} onOpenChange={setMenu}>
            <DropdownMenu.Trigger asChild>
              <button id="tour-profile" aria-label="Profile" className="avatar">
                <UserRound size={20} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="profile-dropdown"
                align="end"
                sideOffset={10}
              >
                <DropdownMenu.Label>{session.username}</DropdownMenu.Label>
                <DropdownMenu.Item
                  onSelect={() => {
                    setTour(0);
                    setMenu(false);
                  }}
                >
                  {t('Start UI Tour')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => {
                    setLogout(true);
                    setMenu(false);
                  }}
                >
                  {t('Logout')}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </EntgraHeader>
        <div className="content-surface">
          <div className="device-strip">
            {[...session.types, 'web-clip'].map((type) => (
              <Link
                className={current === type ? 'active' : ''}
                key={type}
                to={`/store/${type}/${favourite ? 'favourite-apps' : 'applications'}`}
              >
                {type === 'web-clip' ? (
                  <Globe size={17} />
                ) : type === 'ios' ? (
                  <Apple size={17} />
                ) : type === 'windows' ? (
                  <Monitor color="#008cc4" size={17} />
                ) : (
                  <Smartphone size={17} color="#7db343" />
                )}
                {t(platform(type))}
              </Link>
            ))}
          </div>
          <main>
            <Outlet />
          </main>
        </div>
        <EntgraFooter
          text={
            session.config.theme.footerText ?? t('Unified Endpoint Manager')
          }
        />
      </div>
      {logout && (
        <Confirm
          message="Logout"
          onClose={() => setLogout(false)}
          onConfirm={session.logout}
        />
      )}
      {tour >= 0 && (
        <Joyride
          key={tour}
          run
          continuous
          options={{
            skipBeacon: true,
            showProgress: true,
            primaryColor: '#4288BA',
            buttons: ['skip', 'back', 'close', 'primary'],
            closeButtonAction: 'skip',
            blockTargetInteraction: true,
          }}
          locale={{
            back: t('Back'),
            next: t('Next'),
            last: t('End'),
            skip: t('Skip'),
          }}
          steps={[
            '#tour-profile',
            '#tour-applications',
            '#tour-favourites',
            '#tour-endpoint',
            '#tour-publisher',
          ].map((target, i) => ({ target, content: t(tourSteps[i]) }))}
          onEvent={(event) => {
            if (event.status === 'finished' || event.status === 'skipped')
              setTour(-1);
          }}
        />
      )}
    </div>
  );
}
export function Landing() {
  const { types } = useSession();
  return (
    <Navigate to={`/store/${types[0] || 'web-clip'}/applications`} replace />
  );
}
