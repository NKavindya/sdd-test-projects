import { useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Image,
  Rate,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DownloadOutlined, DownOutlined } from '@ant-design/icons';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../services/StoreContext';
import { useResource } from '../../../../services/useResource';
import {
  imageUrl,
  isInstallable,
  isPlaySynced,
  scopes,
} from '../../../../common/contracts';
import {
  ErrorState,
  Permission,
  useFeedback,
} from '../../../../components/States';
import { FavouriteButton } from '../Applications/components/AppCard';
import Reviews from './components/Reviews';
import Subscriptions from './components/Subscriptions';

export default function Release() {
  const { uuid, deviceType } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { api, config, can, setHandoff } = useStore();
  const { t } = useTranslation();
  const feedback = useFeedback();
  const [downloading, setDownloading] = useState(false);
  const appType =
    new URLSearchParams(location.search).get('appType') ||
    location.state?.appType;
  const resource = useResource(
    (signal) =>
      appType
        ? api.release(appType, uuid, signal)
        : Promise.reject(new Error('appType')),
    [uuid, appType],
    can(scopes.view),
  );
  const versions = useResource(
    (signal) => api.versions(uuid, signal),
    [uuid],
    can(scopes.versions) && !!resource.data,
  );
  const app = resource.data;
  const release =
    app?.applicationReleases?.find((item) => item.uuid === uuid) ||
    app?.applicationReleases?.[0];
  const installable = isInstallable(release, config);
  if (!can(scopes.view)) return <Permission />;
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await api.download(release.installerPath);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = app.installerName || '';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      feedback.error(error);
    } finally {
      setDownloading(false);
    }
  };
  let metadata = {};
  try {
    metadata = JSON.parse(release?.metaData || '{}') || {};
  } catch {
    /* Invalid opaque metadata is not rendered as HTML. */
  }
  const actions = ['install', 'uninstall']
    .filter((action) => can(scopes[action]))
    .map((action) => ({
      key: action,
      label: t(action === 'install' ? 'Install' : 'Uninstall'),
    }));
  return (
    <>
      <Breadcrumb
        className="spaced"
        items={[
          {
            title: (
              <Link to={`/store/${deviceType}/applications`}>{t('Home')}</Link>
            ),
          },
          { title: app?.name || 'loading...' },
        ]}
      />
      <Card className="release-card">
        {resource.loading ? (
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        ) : resource.error ? (
          <>
            <ErrorState
              error={resource.error}
              description="Error occurred while trying to load releases."
            />
            <h2>{t('No Releases Found')}</h2>
          </>
        ) : !release ? (
          <h2>{t('No Releases Found')}</h2>
        ) : (
          <>
            <div className="release-header">
              <div className="release-identity">
                {release.iconPath && (
                  <img
                    className="release-icon"
                    src={imageUrl(release.iconPath)}
                    alt=""
                  />
                )}
                <div>
                  <h1>{app.name}</h1>
                  <Rate disabled value={app.rating || 0} allowHalf />
                  <div className="release-meta">
                    <span>
                      {t('Version')}
                      <strong>{release.version}</strong>
                    </span>
                    {release.packageName && (
                      <span>
                        {t('Package Name')}
                        <strong>{release.packageName}</strong>
                      </span>
                    )}
                  </div>
                  {can(scopes.versions) && versions.data && (
                    <Dropdown
                      menu={{
                        items: versions.data.map((version) => ({
                          key: version.uuid,
                          label: (
                            <Space>
                              {version.version}
                              <Tag>{version.state}</Tag>
                              <Rate disabled value={version.rating || 0} />
                            </Space>
                          ),
                        })),
                        onClick: ({ key }) =>
                          window.open(
                            `/store/android/apps/${key}?appType=${encodeURIComponent(appType)}`,
                            '_blank',
                            'noopener,noreferrer',
                          ),
                      }}
                    >
                      <Button type="link">
                        {t('Available versions')} <DownOutlined />
                      </Button>
                    </Dropdown>
                  )}
                </div>
              </div>
              <div className="release-actions">
                {!actions.length && (
                  <Alert
                    closable
                    type="warning"
                    message={t(
                      'Some permissions are not given to manage subscriptions for a release',
                    )}
                  />
                )}
                {isPlaySynced(app) ? (
                  <Tooltip
                    title={
                      <a
                        href={config.navigation?.addPolicy}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t('Endpoint Manager')}
                      </a>
                    }
                  >
                    <span>
                      <Button disabled type="primary">
                        {t('Subscribe')}
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip
                    title={
                      !installable
                        ? t(
                            "Can't perform the action. This release isn't in an installable state.",
                          )
                        : undefined
                    }
                  >
                    <Dropdown
                      disabled={!installable || !actions.length}
                      menu={{
                        items: actions,
                        onClick: ({ key }) => {
                          setHandoff({ uuid, action: key });
                          navigate(`/store/${deviceType}/apps/${uuid}/${key}`, {
                            state: { app, release, appType },
                          });
                        },
                      }}
                    >
                      <Button
                        type="primary"
                        disabled={!installable || !actions.length}
                      >
                        {t('Subscribe')} <DownOutlined />
                      </Button>
                    </Dropdown>
                  </Tooltip>
                )}
                {can(scopes.favourite) && (
                  <FavouriteButton
                    labelled
                    app={app}
                    disabled={!installable}
                    reload={resource.reload}
                  />
                )}
                {app.type === 'ENTERPRISE' && (
                  <Button
                    type="text"
                    icon={<DownloadOutlined />}
                    loading={downloading}
                    onClick={download}
                  >
                    {t('Download')}
                  </Button>
                )}
              </div>
            </div>
            <Tabs
              key={uuid}
              defaultActiveKey={installable ? 'app' : 'subscriptions'}
              items={[
                {
                  key: 'app',
                  label: t('App'),
                  children: (
                    <>
                      <div className="chips-row">
                        {app.categories?.length > 0 && (
                          <div>
                            <h3>{t('CATEGORIES')}</h3>
                            {app.categories.map((category) => (
                              <Tag key={category} color="#65a2c7">
                                {category}
                              </Tag>
                            ))}
                          </div>
                        )}
                        {app.tags?.length > 0 && (
                          <div>
                            <h3>{t('TAGS')}</h3>
                            {app.tags.map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </div>
                        )}
                      </div>
                      {release.screenshots?.length > 0 && (
                        <div className="screenshots">
                          <Image.PreviewGroup>
                            {release.screenshots.map((url) => (
                              <Image
                                src={imageUrl(url)}
                                key={url}
                                alt={app.name}
                              />
                            ))}
                          </Image.PreviewGroup>
                        </div>
                      )}
                      <section className="overview-section">
                        <h3>{t('DESCRIPTION')}</h3>
                        <Typography.Paragraph
                          ellipsis={{
                            rows: 4,
                            expandable: true,
                            symbol: t('see more'),
                          }}
                        >
                          {app.description || release.description}
                        </Typography.Paragraph>
                      </section>
                      <Reviews uuid={uuid} installable={installable} />
                      <section className="overview-section">
                        <h3>{t('META DATA')}</h3>
                        {Object.keys(metadata).length ? (
                          <Descriptions
                            items={Object.entries(metadata).map(
                              ([key, value]) => ({
                                key,
                                label: key,
                                children:
                                  typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value),
                              }),
                            )}
                          />
                        ) : (
                          <Typography.Text type="secondary">
                            {t('No meta data available.')}
                          </Typography.Text>
                        )}
                      </section>
                    </>
                  ),
                },
                {
                  key: 'subscriptions',
                  label: t('Subscription Details'),
                  children: <Subscriptions uuid={uuid} />,
                },
              ]}
            />
          </>
        )}
      </Card>
    </>
  );
}
