import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Dropdown,
  Image,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { DownOutlined, DownloadOutlined } from '@ant-design/icons';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { store, showError, download } from '../../services/api';
import {
  releaseOf,
  scopes,
  isInstallable,
  isPlaySynced,
  cannotPerform,
} from '../../services/contracts';
import Breadcrumbs from '../../shared/Breadcrumbs';
import Favourite from '../../shared/Favourite';
import Stars from '../../shared/Stars';
import { Permission } from '../../shared/Feedback';
import Reviews from './Reviews';
import Subscriptions from './Subscriptions';
export default function Release() {
  const { t } = useTranslation();
  const { uuid, deviceType } = useParams();
  const location = useLocation();
  const history = useHistory();
  const { has, setHandoff, config } = useStore();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [versions, setVersions] = useState([]);
  const [tab, setTab] = useState('app');
  const params = new URLSearchParams(location.search);
  const appType = params.get('appType') || location.state?.appType;
  const load = useCallback(
    async (resetTab = false) => {
      if (!has(scopes.view)) return;
      setLoading(true);
      if (!appType) {
        showError(null, 'Error occurred while trying to load releases.');
        setApp(null);
        setLoading(false);
        return;
      }
      try {
        const result = await store(
          'GET',
          `/applications/${encodeURIComponent(appType)}/${encodeURIComponent(uuid)}`,
        );
        setApp(result);
        setForbidden(false);
        if (resetTab)
          setTab(
            isInstallable(releaseOf(result, uuid)) ? 'app' : 'subscriptions',
          );
      } catch (error) {
        setApp(null);
        setForbidden(error.response?.status === 403);
        showError(error, 'Error occurred while trying to load releases.');
      } finally {
        setLoading(false);
      }
    },
    [uuid, appType],
  );
  useEffect(() => {
    load(true);
  }, [load]);
  useEffect(() => {
    if (has(scopes.versions) && appType)
      store('GET', `/admin/release-versions/${uuid}`)
        .then(setVersions)
        .catch((e) => showError(e));
  }, [uuid, appType]);
  if (!has(scopes.view) || forbidden) return <Permission />;
  const release = releaseOf(app, params.get('uuid') || uuid);
  const installable = isInstallable(release);
  const managed = has(scopes.install) || has(scopes.uninstall);
  function openWizard(action) {
    setHandoff({ app, release, action });
    history.push(`/${deviceType}/apps/${release.uuid}/${action}`);
  }
  let meta = {};
  try {
    meta =
      typeof release?.metaData === 'string'
        ? JSON.parse(release.metaData)
        : release?.metaData || {};
  } catch {
    /* opaque metadata is not an invented schema */
  }
  const items = Object.entries(meta).map(([key, value]) => ({
    key,
    label: key,
    children: typeof value === 'object' ? JSON.stringify(value) : String(value),
  }));
  if (release?.packageName)
    items.push({
      key: 'packageName',
      label: t('Package Name'),
      children: release.packageName,
    });
  return (
    <>
      <Breadcrumbs
        items={[loading ? 'loading...' : app?.name || 'No Releases Found']}
      />
      <Card className="release-card">
        {loading ? (
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        ) : !release ? (
          <Typography.Title level={3}>
            {t('No Releases Found')}
          </Typography.Title>
        ) : (
          <>
            <div className="release-header">
              {release.iconPath && (
                <img
                  className="release-icon"
                  src={release.iconPath}
                  alt={app.name}
                />
              )}
              <div className="release-identity">
                <Typography.Title level={2}>{app.name}</Typography.Title>
                <Stars rating={app.rating || release.rating} size="20px" />
                <p>
                  {t('Version')} : {release.version}
                </p>
                {(release.packageName || app.packageName) && (
                  <p>
                    {t('Package Name')} :{' '}
                    {release.packageName || app.packageName}
                  </p>
                )}
                {!managed && (
                  <Alert
                    closable
                    showIcon
                    type="warning"
                    message={t(
                      'Some permissions are not given to manage subscriptions for a release',
                    )}
                  />
                )}
                <Space wrap>
                  {isPlaySynced(app) ? (
                    <Tooltip title={t('Endpoint Manager')}>
                      <Button
                        type="primary"
                        disabled={!config.deploymentLinks?.addPolicy}
                        onClick={() =>
                          window.open(
                            config.deploymentLinks.addPolicy,
                            '_blank',
                            'noopener,noreferrer',
                          )
                        }
                      >
                        {t('Subscribe')}
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={!installable ? t(cannotPerform) : undefined}
                    >
                      <Dropdown
                        trigger={['click']}
                        disabled={!managed || !installable}
                        menu={{
                          items: [
                            ...(has(scopes.install)
                              ? [
                                  {
                                    key: 'install',
                                    label: t('Install'),
                                    onClick: () => openWizard('install'),
                                  },
                                ]
                              : []),
                            ...(has(scopes.uninstall)
                              ? [
                                  {
                                    key: 'uninstall',
                                    label: t('Uninstall'),
                                    onClick: () => openWizard('uninstall'),
                                  },
                                ]
                              : []),
                          ],
                        }}
                      >
                        <Button
                          type="primary"
                          aria-label={t('Subscribe')}
                          disabled={!managed || !installable}
                        >
                          {t('Subscribe')} <DownOutlined />
                        </Button>
                      </Dropdown>
                    </Tooltip>
                  )}
                  {has(scopes.modify) && (
                    <Tooltip
                      title={!installable ? t(cannotPerform) : undefined}
                    >
                      <span>
                        <Favourite
                          app={app}
                          disabled={!installable}
                          onChange={load}
                          withLabel
                        />
                      </span>
                    </Tooltip>
                  )}
                  {app.type === 'ENTERPRISE' && (
                    <Button
                      aria-label={t('Download')}
                      icon={<DownloadOutlined />}
                      onClick={() => download(release)}
                    >
                      {t('Download')}
                    </Button>
                  )}
                </Space>
                {has(scopes.versions) && (
                  <Select
                    className="other-versions"
                    placeholder={t('Other versions')}
                    onChange={(value) =>
                      window.open(
                        `/store/android/apps/${encodeURIComponent(value)}?appType=${encodeURIComponent(app.type)}`,
                        '_blank',
                        'noopener,noreferrer',
                      )
                    }
                    options={(Array.isArray(versions) ? versions : []).map(
                      (v) => ({
                        value: v.uuid,
                        label: (
                          <>
                            {v.version} <Tag>{v.state}</Tag>
                            <Stars rating={v.rating} />
                          </>
                        ),
                      }),
                    )}
                  />
                )}
              </div>
            </div>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: 'app',
                  label: t('App'),
                  children: (
                    <div className="app-overview">
                      {!!app.categories?.length && (
                        <section>
                          <h5>{t('CATEGORIES')}</h5>
                          {app.categories.map((c) => (
                            <Tag color="blue" key={c}>
                              {c}
                            </Tag>
                          ))}
                        </section>
                      )}
                      {!!app.tags?.length && (
                        <section>
                          <h5>{t('TAGS')}</h5>
                          {app.tags.map((tag) => (
                            <Tag color="#535c68" key={tag}>
                              {tag}
                            </Tag>
                          ))}
                        </section>
                      )}
                      {!!release.screenshots?.length && (
                        <Image.PreviewGroup>
                          <div className="screenshot-strip">
                            {release.screenshots.map((src, index) => (
                              <Image key={index} src={src} height={240} />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      )}
                      <section>
                        <h5>{t('DESCRIPTION')}</h5>
                        <Typography.Paragraph
                          ellipsis={{
                            rows: 4,
                            expandable: true,
                            symbol: t('see more'),
                          }}
                        >
                          {release.description || app.description}
                        </Typography.Paragraph>
                      </section>
                      <Reviews uuid={release.uuid} installable={installable} />
                      <section>
                        <h5>{t('META DATA')}</h5>
                        {items.length ? (
                          <Descriptions column={2} items={items} />
                        ) : (
                          <p>{t('No meta data available.')}</p>
                        )}
                      </section>
                    </div>
                  ),
                },
                {
                  key: 'subscriptions',
                  label: t('Subscription Details'),
                  children: <Subscriptions uuid={release.uuid} />,
                },
              ]}
            />
          </>
        )}
      </Card>
    </>
  );
}
