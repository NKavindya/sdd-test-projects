import { useEffect } from 'react';
import { Alert, App, Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { SpecificationGap } from '../services/api';

export function Loading({ fullscreen = false }) {
  return (
    <div className={fullscreen ? 'startup-loading' : 'loading'}>
      <Spin size="large" />
    </div>
  );
}

export function Permission({
  children = "You don't have permission to view apps.",
}) {
  const { t } = useTranslation();
  return <Result status="403" title="403" subTitle={t(children)} />;
}

export function ErrorState({ error, description }) {
  const { notification } = App.useApp();
  const { t } = useTranslation();
  useEffect(() => {
    if (error)
      notification.error({
        message: t('There was a problem'),
        description: description ? t(description) : undefined,
      });
  }, [error, notification, description, t]);
  return (
    <Result
      status="error"
      title={t('There was a problem')}
      subTitle={description ? t(description) : undefined}
    />
  );
}

export function useFeedback() {
  const { notification } = App.useApp();
  const { t } = useTranslation();
  return {
    success: (description = 'Operation triggered!') =>
      notification.success({
        message: t('Done!'),
        description: t(description),
      }),
    error: (error, description) => {
      // Unknown response fields and stack traces never become product copy.
      notification.error({
        message: t('There was a problem'),
        description: description ? t(description) : undefined,
      });
      return error instanceof SpecificationGap;
    },
  };
}

export function Warning({ children }) {
  const { t } = useTranslation();
  return <Alert type="warning" showIcon message={t(children)} />;
}
