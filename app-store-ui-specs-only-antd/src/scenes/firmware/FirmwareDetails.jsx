import { DeploymentUnitOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
export default function FirmwareDetails({ release }) {
  const { t } = useTranslation();
  return (
    <div className="firmware-release-header">
      {release.iconPath ? (
        <img src={release.iconPath} alt={release.packageName} />
      ) : (
        <DeploymentUnitOutlined className="firmware-mark" />
      )}
      <div>
        <Typography.Title level={4}>{release.packageName}</Typography.Title>
        <Tag>
          {t('Version')} : {release.version}
        </Tag>
        <Tag>{release.releaseType}</Tag>
      </div>
    </div>
  );
}
