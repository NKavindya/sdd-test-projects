import { catalogueTypes } from '@/services/rules';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import { Eye, Heart, Home, LayoutGrid, Network } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Confirm, Empty, Forbidden, Loading, Stars } from '@/shared/common';
import { EntgraSearchFilter } from '@/shared/EntgraSearchFilter';
import { api, artifact, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type Application } from '@/services/types';
import { platform } from './Shell';
export function Breadcrumbs({ children }: { children?: React.ReactNode }) {
  const { deviceType = 'android' } = useParams();
  const { t } = useTranslation();
  return (
    <div className="breadcrumbs">
      <Link to={`/store/${deviceType}/applications`}>
        <Home size={14} />
        {t('Home')}
      </Link>
      {children}
    </div>
  );
}
export function Catalogue({ favourites = false }: { favourites?: boolean }) {
  const { deviceType = 'android' } = useParams();
  const { t } = useTranslation();
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [firmware, setFirmware] = useState(
    location.state?.selected === 'firmware' && !favourites,
  );
  const [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    if (firmware)
      api<{ categoryName: string }[]>(
        'publisher',
        'GET',
        '/applications/categories',
      )
        .then((v) => setCategories(v.map((c) => c.categoryName)))
        .catch((e) =>
          notifyError(e, 'Error occurred while trying to load categories.'),
        );
  }, [firmware]);
  const [apps, setApps] = useState<Application[]>([]);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [favourite, setFavourite] = useState<Application>();
  const { ref, inView } = useInView();
  const generation = useRef(0);
  const load = useCallback(
    async (offset = 0, append = false) => {
      if (!session.has(scopes.view)) {
        setLoading(false);
        return;
      }
      const id = ++generation.current;
      setLoading(true);
      setFailed(false);
      try {
        const result = await api<{
          applications: Application[];
          pagination: { count: number };
        }>(
          'store',
          'POST',
          `/applications/${firmware ? 'firmwares' : favourites ? 'favourite' : 'apps'}`,
          {
            deviceType: deviceType === 'web-clip' ? undefined : deviceType,
            appTypes: catalogueTypes(deviceType, firmware),
            limit: firmware ? 14 : 30,
            offset,
            ...filters,
          },
        );
        if (id !== generation.current) return;
        setApps((old) =>
          append ? [...old, ...result.applications] : result.applications,
        );
        setTotal(result.pagination.count);
      } catch (e) {
        if (id === generation.current) {
          setFailed(true);
          notifyError(e);
        }
      } finally {
        if (id === generation.current) setLoading(false);
      }
    },
    [deviceType, filters, firmware, favourites, session.permissions.join(',')],
  );
  useEffect(() => {
    setApps([]);
    setPage(1);
    load();
  }, [load]);
  useEffect(() => {
    if (
      inView &&
      !loading &&
      !failed &&
      !firmware &&
      apps.length > 0 &&
      apps.length < total
    )
      load(apps.length, true);
  }, [inView, loading, apps.length, total, failed, firmware, load]);
  if (!session.has(scopes.view)) return <Forbidden />;
  const open = (app: Application) =>
    firmware
      ? navigate(`/store/${deviceType}/firmware/${app.id}`, {
          state: { firmware: app, deviceType },
        })
      : navigate(
          `/store/${deviceType}/apps/${app.applicationReleases[0]?.uuid}?appType=${app.type}`,
          { state: { appType: app.type } },
        );
  return (
    <>
      <div className="page-top">
        <Breadcrumbs>
          <span>/</span>
          <span>{t(favourites ? 'Favourites' : 'Apps')}</span>
          <span>/</span>
          <span>{t(platform(deviceType))}</span>
        </Breadcrumbs>
        {!favourites && (
          <div className="segment">
            <button
              className={!firmware ? 'active' : ''}
              onClick={() => {
                setFirmware(false);
                setFilters({});
              }}
            >
              <LayoutGrid size={15} />
              {t('Apps')}
            </button>
            <button
              className={firmware ? 'active' : ''}
              onClick={() => {
                setFirmware(true);
                setFilters({});
              }}
            >
              <Network size={15} />
              {t('Firmware')}
            </button>
          </div>
        )}
      </div>
      {(apps.length > 0 || Object.keys(filters).length > 0) && (
        <EntgraSearchFilter
          key={`${deviceType}-${firmware}`}
          context={deviceType}
          title={firmware ? 'Search Firmware' : 'Search Apps'}
          variant={firmware ? 'common' : 'store'}
          criteria={[
            { key: 'appName', label: 'Name' },
            {
              key: 'categories',
              label: 'Category',
              type: 'multiple',
              options: categories,
            },
          ]}
          onSearch={setFilters}
        />
      )}
      {loading && !apps.length ? (
        <Loading />
      ) : failed ? (
        <div className="alert">{t('There was a problem')}</div>
      ) : !apps.length ? (
        <Empty firmware={firmware} />
      ) : (
        <>
          <div className={`catalogue-grid ${firmware ? 'firmware-grid' : ''}`}>
            {(firmware ? apps.slice(0, 12) : apps).map((app) => (
              <Card
                key={app.id}
                className="app-card"
                role="link"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') open(app);
                }}
                onClick={() => open(app)}
              >
                {firmware ? (
                  <>
                    <div className="firmware-card-icon">
                      <Network size={30} />
                    </div>
                    <h3 title={app.name}>{app.name}</h3>
                    <p>{app.description}</p>
                    <div>
                      {app.categories?.map((c) => (
                        <span className="tag" key={c}>
                          {c}
                        </span>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="View firmware"
                    >
                      <Eye size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="app-art">
                      {app.applicationReleases[0]?.iconPath ? (
                        <img
                          src={artifact(app.applicationReleases[0].iconPath)}
                          alt=""
                        />
                      ) : (
                        <LayoutGrid size={60} />
                      )}
                    </div>
                    <div className="app-info">
                      <h3 title={app.name}>{app.name}</h3>
                      <div className="app-card-bottom">
                        <span>{app.type.toLowerCase()}</span>
                        <button
                          className="heart"
                          title={t(
                            app.isFavourite
                              ? 'Remove from favourite'
                              : 'Add to favourite',
                          )}
                          aria-label={t(
                            app.isFavourite
                              ? 'Remove from favourite'
                              : 'Add to favourite',
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavourite(app);
                          }}
                        >
                          <Heart
                            size={18}
                            fill={app.isFavourite ? '#ffa940' : 'none'}
                          />
                        </button>
                      </div>
                      <Stars value={app.rating} />
                      {app.type === 'WEB_CLIP' && (
                        <button
                          className="web-eye"
                          title="Open Web app"
                          aria-label="Open Web app"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(
                              app.applicationReleases[0]?.installerPath,
                              '_blank',
                              'noopener,noreferrer',
                            );
                          }}
                        >
                          <Eye size={17} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
          {firmware ? (
            <div className="pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => {
                  setPage(page - 1);
                  load((page - 2) * 12);
                }}
              >
                ‹
              </Button>
              <span>{page}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * 12 >= total}
                onClick={() => {
                  setPage(page + 1);
                  load(page * 12);
                }}
              >
                ›
              </Button>
            </div>
          ) : (
            <div ref={ref}>{loading && <Loading />}</div>
          )}
        </>
      )}
      {favourite && (
        <Confirm
          message={`Are you sure you need to ${favourite.isFavourite ? 'remove' : 'add'} ${favourite.name} app ${favourite.isFavourite ? 'from' : 'to'} favourites ?`}
          onClose={() => setFavourite(undefined)}
          onConfirm={async () => {
            try {
              await api(
                'store',
                favourite.isFavourite ? 'DELETE' : 'POST',
                `/applications/favourite/${favourite.id}`,
              );
              await load();
            } catch (e) {
              notifyError(
                e,
                `Error occurred while ${favourite.isFavourite ? 'removing' : 'adding'} app to favourite`,
              );
            }
          }}
        />
      )}
    </>
  );
}
