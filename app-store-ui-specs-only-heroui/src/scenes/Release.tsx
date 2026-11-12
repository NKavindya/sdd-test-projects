import { Button } from '../shared/Button';
import { useEffect, useState } from 'react';
import { Card, Dropdown } from '@heroui/react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, Package } from 'lucide-react';
import type { Application, Release } from '../services/model';
import { scope } from '../services/model';
import { api, config } from '../services/client';
import { installable, playSynced } from '../services/contracts';
import { createHandoff } from '../services/handoff';
import { useSession } from '../services/session';
import {
  Crumbs,
  Empty,
  Forbidden,
  Loading,
  Stars,
  TabBar,
  problem,
  Dialog,
} from '../shared/ui';
import { Favourite } from './Catalogue';
import Reviews from './Reviews';
import Subscriptions from './Subscriptions';
export function ReleaseReminder({
  app,
  small = false,
}: {
  app: Application;
  small?: boolean;
}) {
  const r = app.applicationReleases[0];
  return (
    <div className={'release-reminder ' + (small ? 'small' : '')}>
      {r.iconPath ? (
        <img src={r.iconPath} alt={app.name} />
      ) : (
        <div className="icon-placeholder">
          <Package size={80} />
        </div>
      )}
      <div>
        <h1>{app.name}</h1>
        <p>Version : {r.version}</p>
      </div>
    </div>
  );
}
export default function ReleasePage() {
  const { uuid = '', deviceType = '' } = useParams();
  const [query] = useSearchParams();
  const loc = useLocation();
  const navigate = useNavigate();
  const { has } = useSession();
  const { t } = useTranslation();
  const appType = query.get('appType') || loc.state?.appType;
  const [app, setApp] = useState<Application>();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('app');
  const [revision, setRevision] = useState(0);
  const [versions, setVersions] = useState<(Release & { state?: string })[]>(
    [],
  );
  const [preview, setPreview] = useState<string>();
  const [warning, setWarning] = useState(true);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!has(scope.view)) {
      setLoading(false);
      return;
    }
    if (!appType) {
      problem(null, 'Error occurred while trying to load releases.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setApp(undefined);
    void api<Application>(
      `/applications/${encodeURIComponent(appType)}/${encodeURIComponent(uuid)}`,
    )
      .then((a) => {
        if (!active) return;
        const release =
          a.applicationReleases.find((r) => r.uuid === uuid) ||
          a.applicationReleases[0];
        if (!release) return;
        const selected = { ...a, applicationReleases: [release] };
        setApp(selected);
        if (revision === 0)
          setTab(installable(selected) ? 'app' : 'subscriptions');
      })
      .catch((e) => problem(e, 'Error occurred while trying to load releases.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [uuid, appType, revision]);
  useEffect(() => {
    if (has(scope.versions))
      void api<(Release & { state?: string })[]>(
        `/admin/release-versions/${uuid}`,
      )
        .then(setVersions)
        .catch(problem);
  }, [uuid]);
  if (!has(scope.view)) return <Forbidden />;
  if (loading) return <Loading />;
  if (!app) return <Empty title="No Releases Found" />;
  const release = app.applicationReleases[0];
  const published = installable(app);
  const synced = playSynced(app);
  const maySubscribe = has(scope.install) || has(scope.uninstall);
  function wizard(action: string) {
    navigate(`/${deviceType}/apps/${uuid}/${action}`, {
      state: { handoff: createHandoff(app!) },
    });
  }
  let metadata: Record<string, unknown> = {};
  try {
    const raw = JSON.parse(release.metaData || '{}');
    metadata = Array.isArray(raw)
      ? Object.fromEntries(
          raw.filter((x) => x.key).map((x) => [x.key, x.value]),
        )
      : raw;
  } catch {
    /* opaque metadata remains unexpanded */
  }
  if (release.packageName || app.packageName)
    metadata['Package Name'] = release.packageName || app.packageName;
  return (
    <>
      <Crumbs items={[{ label: app.name }]} />
      <Card className="release-card">
        <ReleaseReminder app={app} />
        <div className="release-actions">
          <Stars rating={app.rating} />
          <p>{release.packageName || app.packageName}</p>
          {!maySubscribe && warning && (
            <div role="alert" className="warning">
              Some permissions are not given to manage subscriptions for a
              release{' '}
              <Button variant="ghost" onPress={() => setWarning(false)}>
                ×
              </Button>
            </div>
          )}
          {synced ? (
            <div className="warning">
              <span>GooglePlaySyncedApp</span>{' '}
              {config.links?.addPolicy && (
                <a
                  href={config.links.addPolicy}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Endpoint Manager
                </a>
              )}
              <Button isDisabled>{t('Subscribe')}</Button>
            </div>
          ) : (
            <Dropdown>
              <Button
                isDisabled={!published || !maySubscribe}
                title={
                  !published
                    ? "Can't perform the action. This release isn't in an installable state."
                    : undefined
                }
              >
                {t('Subscribe')}
              </Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Subscribe"
                  onAction={(key) => wizard(String(key))}
                >
                  {has(scope.install) && (
                    <Dropdown.Item id="install">{t('Install')}</Dropdown.Item>
                  )}
                  {has(scope.uninstall) && (
                    <Dropdown.Item id="uninstall">
                      {t('Uninstall')}
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
          {has(scope.modify) && (
            <Favourite
              app={app}
              disabled={!published}
              onRefresh={() => setRevision((n) => n + 1)}
            />
          )}
          {app.type === 'ENTERPRISE' && (
            <Button
              variant="ghost"
              onPress={async () => {
                if (!release.installerPath) return;
                try {
                  const response = await fetch(release.installerPath, {
                    credentials: 'same-origin',
                  });
                  if (!response.ok) throw new Error(response.statusText);
                  const url = URL.createObjectURL(await response.blob());
                  const a = document.createElement('a');
                  a.href = url;
                  a.download =
                    release.installerPath.split('/').pop() || app.name;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                } catch (e) {
                  problem(e);
                }
              }}
            >
              <Download size={16} />
              {t('Download')}
            </Button>
          )}
          {has(scope.versions) && versions.length > 0 && (
            <Dropdown>
              <Button variant="ghost">Other versions</Button>
              <Dropdown.Popover>
                <Dropdown.Menu
                  aria-label="Other versions"
                  onAction={(key) =>
                    window.open(
                      `/store/android/apps/${key}?appType=${app.type}`,
                      '_blank',
                      'noopener,noreferrer',
                    )
                  }
                >
                  {versions.map((v) => (
                    <Dropdown.Item
                      id={v.uuid}
                      key={v.uuid}
                      textValue={v.version}
                    >
                      {v.version} · {v.state || v.currentStatus}
                      <Stars rating={v.rating} />
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
        <TabBar
          items={[
            { id: 'app', label: 'App' },
            { id: 'subscriptions', label: 'Subscription Details' },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'app' ? (
          <div className="overview">
            <div className="chips">
              {!!app.categories?.length && <strong>{t('CATEGORIES')}</strong>}
              {app.categories?.map((v) => (
                <span key={v}>{v}</span>
              ))}
              {!!app.tags?.length && <strong>{t('TAGS')}</strong>}
              {app.tags?.map((v) => (
                <span className="dark" key={v}>
                  {v}
                </span>
              ))}
            </div>
            {!!release.screenshots?.length && (
              <div className="screenshots">
                {release.screenshots.map((url) => (
                  <Button
                    variant="ghost"
                    key={url}
                    onPress={() => setPreview(url)}
                  >
                    <img src={url} alt={app.name} />
                  </Button>
                ))}
              </div>
            )}
            <section>
              <h2>{t('DESCRIPTION')}</h2>
              <p className={expanded ? '' : 'description-clamp'}>
                {release.description || app.description}
              </p>
              {(release.description || app.description || '').length > 300 && (
                <Button variant="ghost" onPress={() => setExpanded(!expanded)}>
                  see more
                </Button>
              )}
            </section>
            {has(scope.reviews) && (
              <Reviews uuid={uuid} published={published} />
            )}
            <section>
              <h2>{t('META DATA')}</h2>
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
        ) : (
          <Subscriptions uuid={uuid} />
        )}
      </Card>
      <Dialog
        open={!!preview}
        onClose={() => setPreview(undefined)}
        title={app.name}
        wide
      >
        <div className="lightbox">
          {preview && <img src={preview} alt={app.name} />}
          <div>
            {release.screenshots?.map((url) => (
              <Button variant="ghost" key={url} onPress={() => setPreview(url)}>
                <img src={url} alt={app.name} />
              </Button>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  );
}
