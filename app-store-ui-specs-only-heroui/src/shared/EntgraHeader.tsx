import { Button } from './Button';
import { useState } from 'react';
import { Avatar, Dropdown } from '@heroui/react';
import { Crosshair, UserRound } from 'lucide-react';
import TwemojiModule from 'react-twemoji';
const Twemoji =
  (TwemojiModule as unknown as { default?: typeof TwemojiModule }).default ||
  TwemojiModule;
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Choice, Dialog, problem } from './ui';
import { useSession } from '../services/session';
import { config, request } from '../services/client';
const languages = [
  { id: 'en', text: 'English', flag: '🇺🇸' },
  { id: 'ja', text: 'Japanese', flag: '🇯🇵' },
  { id: 'fr', text: 'French', flag: '🇫🇷' },
  { id: 'es', text: 'Spanish', flag: '🇪🇸' },
];
export function EntgraHeader({
  deviceType,
  onTour,
}: {
  deviceType: string;
  onTour: () => void;
}) {
  const { t, i18n } = useTranslation();
  const session = useSession();
  const navigate = useNavigate();
  const [logout, setLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const destinations = (
    config.search || [
      {
        title: 'Applications',
        path: `/store/${deviceType}/applications`,
        scopes: ['am:store:app:view'],
      },
      {
        title: 'Favourites',
        path: `/store/${deviceType}/favourite-apps`,
        scopes: ['am:store:app:view'],
      },
    ]
  ).filter((o) => o.scopes.every(session.has));
  return (
    <header className="entgra-header">
      <Crosshair size={17} />
      <div className="jump">
        <Choice
          label={t('Navigate me to…')}
          value=""
          options={destinations.map((o) => ({
            id: o.path,
            label: (
              <div>
                {t(o.title)}
                <small>
                  {' '}
                  {t('Home')} / {t(o.title)}
                </small>
              </div>
            ),
            text: t(o.title),
          }))}
          onChange={(v) => navigate(v.replace(/^\/store/, ''))}
        />
      </div>
      <div className="header-right">
        <div className="language">
          <Choice
            label="Language"
            value={i18n.language}
            onChange={(v) => void i18n.changeLanguage(v)}
            options={languages.map((l) => ({
              id: l.id,
              text: l.text,
              label: (
                <Twemoji
                  options={{
                    base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
                  }}
                >
                  {l.flag} {l.text}
                </Twemoji>
              ),
            }))}
          />
          <Twemoji
            className="selected-language"
            options={{
              base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
            }}
          >
            {languages.find((l) => l.id === i18n.language)?.flag}
          </Twemoji>
        </div>
        <Dropdown>
          <Button
            id="tour-profile"
            isIconOnly
            variant="ghost"
            aria-label={session.username}
          >
            <Avatar className="profile-avatar" size="sm">
              <Avatar.Fallback>
                <UserRound size={18} />
              </Avatar.Fallback>
            </Avatar>
          </Button>
          <Dropdown.Popover>
            <Dropdown.Menu
              aria-label="Profile"
              onAction={(key) =>
                key === 'tour'
                  ? onTour()
                  : key === 'logout'
                    ? setLogout(true)
                    : undefined
              }
            >
              <Dropdown.Item
                id="username"
                textValue={session.username}
                isDisabled
              >
                {session.username}
              </Dropdown.Item>
              <Dropdown.Item id="tour">{t('Start UI Tour')}</Dropdown.Item>
              <Dropdown.Item id="logout">{t('Logout')}</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
      <Dialog
        open={logout}
        onClose={() => setLogout(false)}
        title={t('Logout')}
        footer={
          <>
            <Button variant="secondary" onPress={() => setLogout(false)}>
              {t('Cancel')}
            </Button>
            <Button
              isPending={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  if (session.sso) {
                    window.location.assign(config.serverConfig.ssoLogoutUri);
                    return;
                  }
                  await request('POST', config.serverConfig.logoutUri);
                  setLogout(false);
                  await session.refresh();
                  navigate('/login');
                } catch (e) {
                  problem(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Logout')}
            </Button>
          </>
        }
      >
        {t('Logout')}
      </Dialog>
    </header>
  );
}
