import { Result, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
export function Permission({
  message = "You don't have permission to view apps.",
}) {
  const { t } = useTranslation();
  return (
    <Result
      status="403"
      title="403"
      subTitle={t(message)}
      extra={t(
        'We are sorry, You do not have access to this page or resources for some reason.',
      )}
    />
  );
}
export function Loading() {
  return (
    <div className="loading">
      <Spin size="large" />
    </div>
  );
}
