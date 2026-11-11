import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSession } from '@/services/session';
import { request, safeReturn } from '@/services/client';
const schema = z.object({
  username: z.string().min(1, 'required'),
  password: z.string().min(1, 'required'),
});
export function Login() {
  const { t } = useTranslation();
  const session = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [invalid, setInvalid] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });
  if (session.username) return <Navigate to="/store/" replace />;
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={session.config.theme.logo} alt="Entgra" />
          <h1>{t('App Store')}</h1>
        </div>
        <form
          onSubmit={handleSubmit(async (values) => {
            setInvalid(false);
            try {
              await request(
                'POST',
                session.config.serverConfig.loginUri,
                new URLSearchParams({ ...values, platform: 'store' }),
              );
              await session.refresh();
              navigate(safeReturn(params.get('redirect')), { replace: true });
            } catch {
              setInvalid(true);
            }
          })}
        >
          <label>
            {t('Username')}
            <Input autoComplete="username" {...register('username')} />
          </label>
          {errors.username && (
            <small className="text-red-500">{t('required')}</small>
          )}
          <label>
            {t('Password')}
            <Input
              type="password"
              autoComplete="current-password"
              {...register('password')}
            />
          </label>
          {errors.password && (
            <small className="text-red-500">{t('required')}</small>
          )}
          {invalid && <div className="alert">{t('Invalid Login Details')}</div>}
          <Button className="w-full mt-6" disabled={isSubmitting}>
            {isSubmitting ? <span className="spinner" /> : t('Login')}
          </Button>
        </form>
      </div>
    </div>
  );
}
