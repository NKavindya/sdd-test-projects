import { Button } from '../shared/Button';
import { useState } from 'react';
import { Card, Input, Label, TextField } from '@heroui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { config, request } from '../services/client';
import { useSession } from '../services/session';
import { safeRedirect } from '../services/contracts';
export default function Login() {
  const { t } = useTranslation();
  const session = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <img src={session.theme.logo} alt="Entgra" />
        </div>
        <Card.Header>
          <Card.Title>Entgra App Store</Card.Title>
        </Card.Header>
        <Card.Content>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!username || !password) return;
              setBusy(true);
              setError('');
              try {
                await request(
                  'POST',
                  config.serverConfig.loginUri,
                  new URLSearchParams({
                    username,
                    password,
                    platform: 'store',
                  }),
                );
                await session.refresh();
                navigate(
                  safeRedirect(params.get('redirect')).replace(
                    /^\/store/,
                    '',
                  ) || '/',
                );
              } catch {
                setError('Invalid Login Details');
              } finally {
                setBusy(false);
              }
            }}
          >
            <TextField isRequired>
              <Label>{t('Username')}</Label>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </TextField>
            <TextField isRequired>
              <Label>{t('Password')}</Label>
              <Input
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </TextField>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" isPending={busy}>
              {t('Login')}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
