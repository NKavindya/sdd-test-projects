import { mergeCataloguePage } from '../../../../../common/catalogue';
import { useEffect, useRef, useState } from 'react';
import { Breadcrumb, Button, Card, Empty, Pagination } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useResource } from '../../../../../services/useResource';
import {
  ErrorState,
  Loading,
  Permission,
} from '../../../../../components/States';
import { appTypes, scopes } from '../../../../../common/contracts';
import AppCard from './AppCard';
import Search from './Search';

export default function Catalogue({ favourite = false, firmware = false }) {
  const { deviceType } = useParams();
  const { api, can } = useStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [{ cards, hasMore }, setCatalogue] = useState({
    cards: [],
    hasMore: false,
  });
  const requestedPage = useRef(0);
  const bottom = useRef(null);
  const kind = firmware ? 'firmwares' : favourite ? 'favourite' : 'apps';
  const resource = useResource(
    async (signal) => ({
      page,
      response: await api.list(
        kind,
        {
          ...filters,
          deviceType,
          appTypes: firmware ? ['CUSTOM'] : appTypes(deviceType),
          limit: firmware ? 14 : 30,
          offset: (page - 1) * (firmware ? 12 : 30),
        },
        signal,
      ),
    }),
    [deviceType, kind, filters, page],
    can(scopes.view),
  );
  useEffect(() => {
    setFilters({});
    setPage(1);
    setCatalogue({ cards: [], hasMore: false });
    requestedPage.current = 0;
  }, [deviceType, kind]);
  const response = resource.data?.response;
  const count = response?.pagination.count || 0;
  useEffect(() => {
    if (!resource.data || resource.data.page !== page) return;
    setCatalogue((previous) =>
      mergeCataloguePage(
        previous.cards,
        resource.data.response.applications,
        resource.data.page,
        resource.data.response.pagination.count,
        firmware,
      ),
    );
  }, [resource.data, page, firmware]);
  useEffect(() => {
    if (
      firmware ||
      !hasMore ||
      resource.loading ||
      resource.error ||
      resource.data?.page !== page
    )
      return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && requestedPage.current !== page + 1) {
        requestedPage.current = page + 1;
        setPage(page + 1);
      }
    });
    if (bottom.current) observer.observe(bottom.current);
    return () => observer.disconnect();
  }, [
    hasMore,
    page,
    resource.data,
    resource.loading,
    resource.error,
    firmware,
  ]);
  const reload = () => {
    setPage(1);
    setCatalogue({ cards: [], hasMore: false });
    requestedPage.current = 0;
    resource.reload();
  };
  if (!can(scopes.view)) return <Permission />;
  if (resource.error) return <ErrorState error={resource.error} />;
  return (
    <>
      {favourite && (
        <Breadcrumb
          items={[
            {
              title: (
                <Link to={`/store/${deviceType}/applications`}>
                  {t('Home')}
                </Link>
              ),
            },
            { title: t('Favourites') },
            {
              title: t(
                {
                  android: 'Android',
                  ios: 'iOS',
                  windows: 'Windows',
                  'web-clip': 'Web Apps',
                }[deviceType] || deviceType,
              ),
            },
          ]}
        />
      )}
      {(cards.length > 0 || Object.keys(filters).length > 0) && (
        <Search
          key={`${deviceType}-${kind}`}
          firmware={firmware}
          apply={(values) => {
            setFilters(values);
            setPage(1);
            setCatalogue({ cards: [], hasMore: false });
            requestedPage.current = 0;
          }}
        />
      )}
      {resource.loading && page === 1 ? (
        <Loading />
      ) : cards.length === 0 ? (
        <Empty
          className="catalogue-empty"
          description={
            <>
              <h2>{t(firmware ? 'No firmware uploaded' : 'No apps, yet.')}</h2>
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
      ) : (
        <div className="app-grid">
          {(firmware ? cards.slice(0, 12) : cards).map((app) =>
            firmware ? (
              <Card
                key={app.id}
                hoverable
                className="firmware-card"
                onClick={() =>
                  navigate(`/store/${deviceType}/firmware/${app.id}`, {
                    state: { firmware: app, deviceType },
                  })
                }
              >
                <h3>{app.name}</h3>
                <p>{app.description}</p>
                <p>{app.categories?.join(', ')}</p>
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  aria-label={app.name}
                />
              </Card>
            ) : (
              <AppCard
                key={app.id}
                app={app}
                deviceType={deviceType}
                reload={reload}
              />
            ),
          )}
        </div>
      )}
      {firmware ? (
        <div className="firmware-pagination">
          <Pagination
            current={page}
            pageSize={12}
            total={count}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      ) : (
        <div ref={bottom} className="scroll-sentinel">
          {resource.loading && page > 1 && <Loading />}
        </div>
      )}
    </>
  );
}
