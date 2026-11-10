import { useState } from 'react';
import { Alert, Button, Card, Form, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/StoreContext';

export default function Login() {
  const { api, branding, initialize } = useStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const submit = async ({ username, password }) => {
    setLoading(true);
    setFailed(false);
    try {
      await api.session.login(username, password);
      await initialize();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="login">
      <img className="login-logo" src={branding.logo} alt="Entgra" />
      <Card className="login-card">
        <Form layout="vertical" onFinish={submit}>
          <Form.Item
            name="username"
            label={t('Username')}
            rules={[{ required: true, message: t('Username') }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('Password')}
            rules={[{ required: true, message: t('Password') }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {failed && (
            <Alert
              className="spaced"
              type="error"
              showIcon
              message={t('Invalid Login Details')}
            />
          )}
          <Button type="primary" htmlType="submit" loading={loading} block>
            {t('Login')}
          </Button>
        </Form>
      </Card>
    </main>
  );
}
