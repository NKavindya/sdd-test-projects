import { Skeleton } from '@/components/ui/skeleton';
import { downloadArtifact } from '@/services/download';
import { wizardContexts } from '@/services/handoff';
import { isInstallable } from '@/services/rules';
import { useEffect, useState } from 'react';
import {
  Link,
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Download, ChevronDown, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { Breadcrumbs } from './Catalogue';
import { Confirm, Forbidden, Loading, Stars } from '@/shared/common';
import { api, artifact, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import {
  scopes,
  type Application,
  type Release as ReleaseDTO,
} from '@/services/types';
import { Reviews } from './Reviews';
import { Subscriptions } from './Subscriptions';
export function Release() {
  const { uuid = '', deviceType = 'android' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const appType = params.get('appType') || location.state?.appType;
  const { t } = useTranslation();
  const session = useSession();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application>();
  const [release, setRelease] = useState<ReleaseDTO>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('App');
  const [subscribe, setSubscribe] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [warning, setWarning] = useState(true);
  const [versions, setVersions] = useState<ReleaseDTO[]>([]);
  const [photo, setPhoto] = useState<number>();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setApp(undefined);
    setRelease(undefined);
    setVersions([]);
    setSubscribe(false);
    if (!session.has(scopes.view)) {
      setLoading(false);
      return;
    }
    if (!appType) {
      notifyError(null, 'Error occurred while trying to load releases.');
      setLoading(false);
      return;
    }
    api<Application>(
      'store',
      'GET',
      `/applications/${encodeURIComponent(appType)}/${encodeURIComponent(uuid)}`,
    )
      .then((data) => {
        if (!active) return;
        setApp(data);
        const found =
          data.applicationReleases.find((r) => r.uuid === uuid) ||
          data.applicationReleases[0];
        setRelease(found);
        setTab(
          found?.currentStatus === 'PUBLISHED' ? 'App' : 'Subscription Details',
        );
      })
      .catch((e) =>
        notifyError(e, 'Error occurred while trying to load releases.'),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    if (session.has(scopes.versions))
      api<ReleaseDTO[]>('store', 'GET', `/admin/release-versions/${uuid}`)
        .then(setVersions)
        .catch((e) => notifyError(e));
    return () => {
      active = false;
    };
  }, [uuid, appType]);
  if (!session.has(scopes.view)) return <Forbidden />;
  const installable = !!release && isInstallable(release);
  const play = app?.categories?.includes('GooglePlaySyncedApp');
  const manage = session.has(scopes.install) || session.has(scopes.uninstall);
  const disabledTip =
    "Can't perform the action. This release isn't in an installable state.";
  const launch = (action: string) => {
    if (!app || !release) return;
    const handoff = crypto.randomUUID();
    wizardContexts.set(handoff, { app, release });
    navigate(`/store/${deviceType}/apps/${uuid}/${action}`, {
      state: { handoff },
    });
  };
  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(release?.metaData || '{}');
  } catch {
    /* Opaque metadata without a documented structure is omitted. */
  }
  return (
    <>
      <Breadcrumbs>
        <span>/</span>
        <span>{loading ? 'loading...' : app?.name}</span>
      </Breadcrumbs>
      <section className="release-card">
        {loading ? (
          <div className="flex gap-6 py-8" aria-label="Loading">
            <Skeleton className="size-36 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : !app || !release ? (
          <h2>{t('No Releases Found')}</h2>
        ) : (
          <>
            <div className="release-header">
              <div className="release-art">
                {release.iconPath ? (
                  <img src={artifact(release.iconPath)} alt="" />
                ) : (
                  <LayoutGrid size={80} />
                )}
              </div>
              <div className="release-identity">
                <h1>{app.name}</h1>
                <Stars value={app.rating || release.rating} />
                <p>
                  {t('Version')}:{' '}
                  <span className="version">{release.version}</span>
                </p>
                {(release.packageName || app.packageName) && (
                  <p>
                    {t('Package Name')}:{' '}
                    {release.packageName || app.packageName}
                  </p>
                )}
                {!manage && warning && (
                  <div className="alert">
                    Some permissions are not given to manage subscriptions for a
                    release <button onClick={() => setWarning(false)}>×</button>
                  </div>
                )}
                <div className="release-actions">
                  <div className="relative">
                    <Button
                      disabled={!installable || !manage}
                      title={!installable ? disabledTip : undefined}
                      onClick={() => setSubscribe(!subscribe)}
                    >
                      {t('Subscribe')}
                      <ChevronDown size={16} />
                    </Button>
                    {subscribe && (
                      <div className="popup subscribe-menu">
                        {play ? (
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href="/endpoint-mgt/policies/add"
                          >
                            {t('Endpoint Manager')}
                          </a>
                        ) : (
                          session.has(scopes.install) && (
                            <button onClick={() => launch('install')}>
                              {t('Install')}
                            </button>
                          )
                        )}
                        {session.has(scopes.uninstall) && (
                          <button onClick={() => launch('uninstall')}>
                            {t('Uninstall')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {session.has(scopes.modify) && (
                    <Button
                      variant="ghost"
                      className="favourite-action"
                      disabled={!installable}
                      title={!installable ? disabledTip : undefined}
                      onClick={() => setConfirm(true)}
                    >
                      <Heart
                        size={18}
                        fill={app.isFavourite ? '#ffa940' : 'none'}
                      />
                      {t(
                        app.isFavourite
                          ? 'Remove from favourite'
                          : 'Add to favourite',
                      )}
                    </Button>
                  )}
                  {app.type === 'ENTERPRISE' && (
                    <Button
                      variant="outline"
                      onClick={() => downloadArtifact(release.installerPath)}
                    >
                      <Download size={17} />
                      {t('Download')}
                    </Button>
                  )}
                </div>
              </div>
              {session.has(scopes.versions) && versions.length > 0 && (
                <div className="other-versions">
                  <label>
                    Other versions
                    <select
                      defaultValue=""
                      onChange={(e) =>
                        window.open(
                          `/store/android/apps/${e.target.value}?appType=${appType}`,
                          '_blank',
                          'noopener,noreferrer',
                        )
                      }
                    >
                      <option value="">{t('Version')}</option>
                      {versions.map((v) => (
                        <option value={v.uuid} key={v.uuid}>
                          {v.version} · {v.currentStatus} · {v.rating || 0} ★
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
            <div className="tabs">
              {['App', 'Subscription Details'].map((v) => (
                <button
                  key={v}
                  className={tab === v ? 'active' : ''}
                  onClick={() => setTab(v)}
                >
                  {t(v)}
                </button>
              ))}
            </div>
            {tab === 'Subscription Details' ? (
              <Subscriptions uuid={uuid} />
            ) : (
              <div className="overview">
                {app.categories?.length > 0 && (
                  <section>
                    <h3>{t('CATEGORIES')}</h3>
                    {app.categories.map((c) => (
                      <span key={c} className="tag">
                        {c}
                      </span>
                    ))}
                  </section>
                )}
                {app.tags?.length > 0 && (
                  <section>
                    <h3>{t('TAGS')}</h3>
                    {app.tags.map((tag) => (
                      <span key={tag} className="tag dark">
                        {tag}
                      </span>
                    ))}
                  </section>
                )}
                {!!release.screenshots?.length && (
                  <div className="screenshots">
                    {release.screenshots.map((src, i) => (
                      <button key={src} onClick={() => setPhoto(i)}>
                        <img src={artifact(src)} alt={`${app.name} ${i + 1}`} />
                      </button>
                    ))}
                  </div>
                )}
                <section>
                  <h3>{t('DESCRIPTION')}</h3>
                  <p className={expanded ? '' : 'description-clamp'}>
                    {release.description || app.description}
                  </p>
                  {(release.description || app.description || '').length >
                    300 && (
                    <Button
                      variant="link"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? 'see less' : 'see more'}
                    </Button>
                  )}
                </section>
                <Reviews uuid={uuid} installable={!!installable} />
                <section>
                  <h3>{t('META DATA')}</h3>
                  {Object.keys(metadata).length ? (
                    <dl className="metadata">
                      {Object.entries(metadata).map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p>{t('No meta data available.')}</p>
                  )}
                </section>
              </div>
            )}
            {confirm && (
              <Confirm
                message={`Are you sure you need to ${app.isFavourite ? 'remove' : 'add'} ${app.name} app ${app.isFavourite ? 'from' : 'to'} favourites ?`}
                onClose={() => setConfirm(false)}
                onConfirm={async () => {
                  try {
                    await api(
                      'store',
                      app.isFavourite ? 'DELETE' : 'POST',
                      `/applications/favourite/${app.id}`,
                    );
                    setApp({ ...app, isFavourite: !app.isFavourite });
                  } catch (e) {
                    notifyError(
                      e,
                      `Error occurred while ${app.isFavourite ? 'removing' : 'adding'} app to favourite`,
                    );
                  }
                }}
              />
            )}
            <Modal
              wide
              open={photo !== undefined}
              onOpenChange={() => setPhoto(undefined)}
              title={app.name}
            >
              {photo !== undefined && (
                <>
                  <img
                    className="lightbox-image"
                    src={artifact(release.screenshots?.[photo])}
                    alt={app.name}
                  />
                  <div className="flex justify-between">
                    <Button
                      disabled={photo === 0}
                      onClick={() => setPhoto(photo - 1)}
                    >
                      ‹
                    </Button>
                    <Button
                      disabled={
                        photo === (release.screenshots?.length || 0) - 1
                      }
                      onClick={() => setPhoto(photo + 1)}
                    >
                      ›
                    </Button>
                  </div>
                </>
              )}
            </Modal>
          </>
        )}
      </section>
    </>
  );
}
