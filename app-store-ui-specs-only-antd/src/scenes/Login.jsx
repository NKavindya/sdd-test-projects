import { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { login } from '../services/api';
import { safeReturn } from '../services/contracts';
import { useStore } from '../services/context';
export default function Login() {
  const { t } = useTranslation();
  const { theme } = useStore();
  const [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState(false);
  async function submit(values) {
    setBusy(true);
    setInvalid(false);
    try {
      await login(values);
      window.location.assign(
        safeReturn(new URLSearchParams(location.search).get('redirect')),
      );
    } catch {
      setInvalid(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-brand">
        <img alt="Logo" src={theme?.logo || '/store/images/logo-white.png'} />
        <Typography.Title level={2}>App Store</Typography.Title>
      </div>
      <Card className="login-card">
        <Form layout="vertical" onFinish={submit}>
          {invalid && (
            <Alert type="error" showIcon message={t('Invalid Login Details')} />
          )}
          <Form.Item
            name="username"
            label={t('Username')}
            rules={[{ required: true, message: t('required') }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('Password')}
            rules={[{ required: true, message: t('required') }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={busy} block>
            {t('Login')}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
