import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Card,
  Empty,
  Pagination,
  Segmented,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Button,
} from 'antd';
import {
  AppstoreOutlined,
  DeploymentUnitOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { catalogueFilter, releaseOf, scopes } from '../../services/contracts';
import { store, publisher, showError } from '../../services/api';
import { FilterPanel as EntgraSearchFilter } from '../../shared/EntgraSearchFilter';
import Breadcrumbs from '../../shared/Breadcrumbs';
import Favourite from '../../shared/Favourite';
import Stars from '../../shared/Stars';
import { Permission } from '../../shared/Feedback';
const categorySource = () =>
  publisher('/applications/categories').then((rows) =>
    rows.map((row) => ({ name: row.categoryName })),
  );
const tagSource = () =>
  publisher('/applications/tags').then((rows) =>
    rows.map((row) => ({ name: row.tagName })),
  );
export default function Catalogue({ favourites = false }) {
  const { t } = useTranslation();
  const { has } = useStore();
  const { deviceType } = useParams();
  const history = useHistory();
  const location = useLocation();
  const [segment, setSegment] = useState(
    location.state?.selected === 'firmware' ? 'firmware' : 'apps',
  );
  const firmware = segment === 'firmware' && !favourites;
  const [filter, setFilter] = useState({});
  const [firmwareCategories, setFirmwareCategories] = useState([]);
  useEffect(() => {
    if (firmware)
      categorySource()
        .then((data) => setFirmwareCategories(data.map((c) => c.name)))
        .catch((e) => showError(e));
  }, [firmware]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const sentinel = useRef();
  const requestId = useRef(0);
  const busy = useRef(false);
  const fetchPage = useCallback(
    async (offset = 0, append = false) => {
      if (!has(scopes.view)) return;
      const id = ++requestId.current;
      setLoading(true);
      busy.current = true;
      try {
        const result = await store(
          'POST',
          `/applications/${favourites ? 'favourite' : firmware ? 'firmwares' : 'apps'}`,
          catalogueFilter(deviceType, firmware, filter, offset),
        );
        if (id !== requestId.current) return;
        setData((previous) =>
          append ? [...previous, ...result.applications] : result.applications,
        );
        setCount(result.pagination.count);
        setError(false);
      } catch (e) {
        if (id === requestId.current) {
          setError(true);
          showError(e);
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          busy.current = false;
        }
      }
    },
    [deviceType, firmware, favourites, JSON.stringify(filter)],
  );
  useEffect(() => {
    setData([]);
    setCount(0);
    fetchPage(firmware ? (page - 1) * 14 : 0);
    return () => {
      requestId.current++;
    };
  }, [fetchPage, page]);
  useEffect(() => {
    if (firmware || !sentinel.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !busy.current &&
          data.length < count &&
          !error
        )
          fetchPage(data.length, true);
      },
      { rootMargin: '250px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [data, count, firmware, error, fetchPage]);
  function search(next) {
    setFilter(next);
    setPage(1);
  }
  const platform =
    {
      android: 'Android',
      ios: 'iOS',
      windows: 'Windows',
      'web-clip': 'Web Apps',
    }[deviceType] || deviceType;
  if (!has(scopes.view)) return <Permission />;
  const activeFilter = Object.values(filter).some((v) =>
    Array.isArray(v) ? v.length : v,
  );
  return (
    <>
      <div className="catalogue-toolbar">
        <Breadcrumbs items={[favourites ? 'Favourites' : 'Apps', platform]} />
        {!favourites && (
          <Segmented
            value={segment}
            onChange={(value) => {
              setSegment(value);
              setFilter({});
              setPage(1);
            }}
            options={[
              { value: 'apps', label: t('Apps'), icon: <AppstoreOutlined /> },
              {
                value: 'firmware',
                label: t('Firmware'),
                icon: <DeploymentUnitOutlined />,
              },
            ]}
          />
        )}
      </div>
      {(data.length > 0 || activeFilter) && (
        <EntgraSearchFilter
          title={firmware ? 'Search Firmware' : 'Search Apps'}
          variant={firmware ? 'common' : 'store'}
          contextId={`${deviceType}-${segment}`}
          onResult={search}
          categorySource={!firmware ? categorySource : undefined}
          tagSource={!firmware ? tagSource : undefined}
          criteria={[
            { key: 'appName', label: 'Name', type: 'text' },
            {
              key: 'categories',
              label: 'Category',
              type: 'multiple',
              options: firmwareCategories,
            },
          ]}
        />
      )}
      {error && (
        <Alert showIcon type="error" message={t('There was a problem')} />
      )}
      {!loading && !error && !data.length && (
        <div className="catalogue-empty">
          <Empty
            description={
              <>
                <Typography.Title level={4}>
                  {t(firmware ? 'No firmware uploaded' : 'No apps, yet.')}
                </Typography.Title>
                <p>
                  {t(
                    firmware
                      ? 'Once the administrator uploads firmware, it will appear here.'
                      : 'No apps available, yet! When the administration uploads, apps will show up here.',
                  )}
                </p>
              </>
            }
          />
        </div>
      )}
      <Spin spinning={loading}>
        <div className={firmware ? 'firmware-grid' : 'app-grid'}>
          {data.map((app) => {
            const release = releaseOf(app);
            const open = () =>
              firmware
                ? history.push(`/${deviceType}/firmware/${app.id}`, {
                    firmware: app,
                    deviceType,
                  })
                : release &&
                  history.push(
                    `/${deviceType}/apps/${release.uuid}?appType=${encodeURIComponent(app.type)}`,
                    { appType: app.type },
                  );
            return firmware ? (
              <Card
                hoverable
                key={app.id}
                className="firmware-card"
                onClick={open}
              >
                <DeploymentUnitOutlined className="firmware-mark" />
                <Typography.Title level={5}>{app.name}</Typography.Title>
                <Typography.Paragraph ellipsis={{ rows: 2 }}>
                  {app.description}
                </Typography.Paragraph>
                {app.categories?.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
              </Card>
            ) : (
              <Card
                hoverable
                key={app.id}
                className="app-card"
                onClick={open}
                cover={
                  release?.iconPath ? (
                    <img src={release.iconPath} alt={app.name} />
                  ) : (
                    <div className="app-art-placeholder">
                      <AppstoreOutlined />
                    </div>
                  )
                }
              >
                <Tooltip title={app.name} placement="topLeft">
                  <Typography.Paragraph className="app-name" ellipsis>
                    {app.name}
                  </Typography.Paragraph>
                </Tooltip>
                <div className="app-card-meta">
                  <Typography.Text type="secondary">
                    {app.type?.toLowerCase()}
                  </Typography.Text>
                  <Favourite app={app} onChange={() => fetchPage(0)} />
                </div>
                <Stars rating={app.rating} />
                {app.type === 'WEB_CLIP' && (
                  <Tooltip title={t('Open Web app')}>
                    <Button
                      className="web-eye"
                      type="text"
                      icon={<EyeOutlined />}
                      aria-label={t('Open Web app')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (release?.installerPath)
                          window.open(
                            release.installerPath,
                            '_blank',
                            'noopener,noreferrer',
                          );
                      }}
                    />
                  </Tooltip>
                )}
              </Card>
            );
          })}
        </div>
        <div ref={sentinel} className="scroll-sentinel" />
      </Spin>
      {firmware && count > 0 && (
        <Pagination
          className="catalogue-pagination"
          current={page}
          pageSize={12}
          total={count}
          showSizeChanger={false}
          onChange={setPage}
        />
      )}
    </>
  );
}
