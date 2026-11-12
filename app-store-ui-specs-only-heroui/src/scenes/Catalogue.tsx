import { Button } from '../shared/Button';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Card } from '@heroui/react';
import { Eye, Heart, Package } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useInView } from 'react-intersection-observer';
import type { Application, AppList, Filter } from '../services/model';
import { scope } from '../services/model';
import { api } from '../services/client';
import { catalogueFilter } from '../services/contracts';
import { useSession } from '../services/session';
import {
  Crumbs,
  Empty,
  Forbidden,
  Loading,
  Stars,
  Confirm,
  problem,
  TabBar,
} from '../shared/ui';
import { EntgraSearchFilter } from '../shared/EntgraSearchFilter';
import { Pager } from '../shared/EntgraTable';
export function Favourite({
  app,
  onRefresh,
  disabled = false,
}: {
  app: Application;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const remove = app.isFavourite;
  const title = `Are you sure you need to ${remove ? 'remove' : 'add'} ${app.name} app ${remove ? 'from' : 'to'} favourites ?`;
  return (
    <Confirm
      title={title}
      disabled={disabled}
      onConfirm={async () => {
        try {
          await api(
            `/applications/favourite/${app.id}`,
            remove ? 'DELETE' : 'POST',
          );
          onRefresh();
        } catch (e) {
          problem(
            e,
            `Error occurred while ${remove ? 'removing' : 'adding'} app to favourite`,
          );
          throw e;
        }
      }}
    >
      <Heart size={18} color="#ffa940" fill={remove ? '#ffa940' : 'none'} />
      <span className="favourite-label">
        {t(remove ? 'Remove from favourite' : 'Add to favourite')}
      </span>
    </Confirm>
  );
}
export default function Catalogue({
  favourites = false,
}: {
  favourites?: boolean;
}) {
  const { deviceType = 'web-clip' } = useParams();
  const location = useLocation();
  const { has } = useSession();
  const [segment, setSegment] = useState(
    location.state?.selected === 'firmware' ? 'firmware' : 'apps',
  );
  const [filter, setFilter] = useState<Filter>({});
  const [apps, setApps] = useState<Application[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const firmware = segment === 'firmware' && !favourites;
  const { ref, inView } = useInView({ rootMargin: '200px' });
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!has(scope.view)) {
      setLoading(false);
      return;
    }
    const requestId = ++generation.current;
    setLoading(true);
    setFailed(false);
    try {
      const result = await api<AppList>(
        `/applications/${favourites ? 'favourite' : firmware ? 'firmwares' : 'apps'}`,
        'POST',
        catalogueFilter(deviceType, firmware, offset, filter),
      );
      if (requestId !== generation.current) return;
      setApps((old) =>
        offset && !firmware
          ? [...old, ...result.applications]
          : result.applications,
      );
      setCount(result.pagination.count);
    } catch (e) {
      if (requestId !== generation.current) return;
      setFailed(true);
      problem(e);
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, [deviceType, firmware, offset, filter, revision]);
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  useEffect(() => {
    if (inView && !loading && !failed && !firmware && apps.length < count)
      setOffset(apps.length);
  }, [inView, loading, apps.length, count, failed, firmware]);
  function refresh() {
    setOffset(0);
    setRevision((n) => n + 1);
  }
  function search(f: Filter) {
    setFilter(f);
    setOffset(0);
    setPage(1);
  }
  if (!has(scope.view)) return <Forbidden />;
  return (
    <>
      <div className="scene-heading">
        <Crumbs
          items={[
            { label: favourites ? 'Favourites' : 'Apps' },
            {
              label:
                deviceType === 'web-clip'
                  ? 'Web Apps'
                  : deviceType === 'ios'
                    ? 'iOS'
                    : deviceType[0].toUpperCase() + deviceType.slice(1),
            },
          ]}
        />
        {!favourites && (
          <TabBar
            items={[
              { id: 'apps', label: 'Apps' },
              { id: 'firmware', label: 'Firmware' },
            ]}
            value={segment}
            onChange={(v) => {
              setSegment(v);
              setApps([]);
              setFilter({});
              setOffset(0);
              setPage(1);
            }}
          />
        )}
      </div>
      {(apps.length > 0 || Object.keys(filter).length > 0) && (
        <EntgraSearchFilter
          key={segment}
          title={firmware ? 'Search Firmware' : 'Search Apps'}
          variant={firmware ? 'firmware' : 'store'}
          onSearch={search}
        />
      )}
      <div className="catalogue-grid">
        {apps.slice(0, firmware ? 12 : undefined).map((app) => {
          const release = app.applicationReleases[0];
          return (
            <Card
              key={app.id}
              className={firmware ? 'firmware-card' : 'app-card'}
            >
              <Link
                to={
                  firmware
                    ? `/${deviceType}/firmware/${app.id}`
                    : `/${deviceType}/apps/${release?.uuid}?appType=${app.type}`
                }
                state={firmware ? { firmware: app, deviceType } : undefined}
                className="card-body"
              >
                {firmware ? (
                  <Package size={36} />
                ) : release?.iconPath ? (
                  <img
                    className="app-icon"
                    src={release.iconPath}
                    alt={app.name}
                  />
                ) : (
                  <div className="icon-placeholder">
                    <Package size={48} />
                  </div>
                )}
                <Card.Title title={app.name}>{app.name}</Card.Title>
                {firmware ? (
                  <>
                    <Card.Description>{app.description}</Card.Description>
                    <div className="chips">
                      {app.categories?.map((c) => (
                        <span key={c}>{c}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <Card.Description>
                      {app.type.toLowerCase()}
                    </Card.Description>
                    <Stars rating={app.rating} />
                  </>
                )}
              </Link>
              {!firmware && (
                <div className="card-actions">
                  {app.type === 'WEB_CLIP' && release?.installerPath && (
                    <Button
                      variant="ghost"
                      isIconOnly
                      title="Open Web app"
                      aria-label="Open Web app"
                      onPress={() =>
                        window.open(
                          release.installerPath,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                    >
                      <Eye size={17} />
                    </Button>
                  )}
                  <Favourite
                    app={{ ...app, isFavourite: favourites || app.isFavourite }}
                    onRefresh={refresh}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
      {loading && <Loading />}
      {failed && <Empty title="There was a problem" />}
      {!loading && !failed && !apps.length && (
        <Empty
          title={firmware ? 'No firmware uploaded' : 'No apps, yet.'}
          description={
            firmware
              ? 'Once the administrator uploads firmware, it will appear here.'
              : 'No apps available, yet! When the administration uploads, apps will show up here.'
          }
        />
      )}
      <div ref={ref} />
      {firmware && (
        <Pager
          page={page}
          total={count}
          size={12}
          onChange={(p) => {
            setPage(p);
            setOffset((p - 1) * 12);
          }}
        />
      )}
    </>
  );
}
