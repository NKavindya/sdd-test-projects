import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from './Catalogue';
import { EntgraTable } from '@/shared/EntgraTable';
import { EntgraSearchFilter } from '@/shared/EntgraSearchFilter';
import { Forbidden } from '@/shared/common';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type Application, type Release } from '@/services/types';
import { Operation } from './Wizard';
import { Subscriptions } from './Subscriptions';
export function Firmware() {
  const { id = '', deviceType = 'android' } = useParams();
  const location = useLocation();
  const app = location.state?.firmware as Application | undefined;
  const session = useSession();
  const { t } = useTranslation();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [groupSubview, setGroupSubview] = useState(false);
  const [modal, setModal] = useState<{ kind: string; release: Release }>();
  useEffect(() => {
    if (!session.has(scopes.view)) return;
    setLoading(true);
    api<{ releases: Release[]; pagination: { count: number } }>(
      'store',
      'POST',
      `/applications/${id}/releases/CUSTOM`,
      {
        applicationId: Number(id),
        offset: (page - 1) * 10,
        limit: 10,
        ...filters,
      },
    )
      .then((v) => {
        setReleases(v.releases);
        setTotal(v.pagination.count);
      })
      .catch((e) =>
        notifyError(e, 'Error occurred while trying to load firmware release.'),
      )
      .finally(() => setLoading(false));
  }, [id, page, filters]);
  if (!session.has(scopes.view)) return <Forbidden />;
  return (
    <>
      <Breadcrumbs>
        <span>/</span>
        <span>{t('Apps')}</span>
        <span>/</span>
        <Link
          to={`/store/${deviceType}/applications`}
          state={{ selected: 'firmware' }}
        >
          {t('Firmware')}
        </Link>
        <span>/</span>
        <span>{app?.name}</span>
      </Breadcrumbs>
      {app && !!app.firmwareModels?.length && (
        <div className="firmware-summary">
          <h2>
            {t('Firmware Name')}: {app.name}
          </h2>
          <p>
            {t('Description')}: {app.description}
          </p>
          <h3>{t('Associated Models')}</h3>
          {app.firmwareModels.map((m) => (
            <span className="tag" key={m}>
              {m}
            </span>
          ))}
        </div>
      )}
      <EntgraSearchFilter
        title="Search Firmware Releases"
        variant="common"
        criteria={[
          { key: 'packageName', label: 'Firmware Package Name' },
          { key: 'version', label: 'Version' },
          {
            key: 'releaseType',
            label: 'Release Channels',
            options: ['PRODUCTION', 'TEST'],
          },
        ]}
        onSearch={(v) => {
          setFilters(v);
          setPage(1);
        }}
      />
      <EntgraTable
        rows={releases}
        rowKey={(r) => r.uuid}
        columns={[
          { title: 'Firmware Package Name', field: 'packageName' },
          { title: 'Version', field: 'version' },
          { title: 'Release Channels', field: 'releaseType' },
        ]}
        actions={[
          {
            label: 'Install',
            tooltip: 'Install this firmware',
            permissions: [scopes.view],
            onClick: (r) => setModal({ kind: 'Install', release: r }),
          },
          {
            label: 'Subscription Details',
            tooltip: 'View subscription details',
            permissions: [scopes.view],
            onClick: (r) =>
              setModal({ kind: 'Subscription Details', release: r }),
          },
        ]}
        has={session.has}
        page={page}
        total={total}
        onPage={setPage}
        loading={loading}
        expand={(r) => (
          <dl className="metadata">
            {[
              ['Version', r.version],
              ['Firmware channel', r.releaseType],
              ['Status', r.currentStatus],
              ['Firmware Package Name', r.packageName],
              ['Supported OS', r.supportedOsVersions],
              ['Description', r.description],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      />
      {modal && (
        <Modal
          wide
          open
          title={t(modal.kind)}
          onOpenChange={() => {
            setModal(undefined);
            setGroupSubview(false);
          }}
        >
          {modal.kind === 'Install' ? (
            <Operation
              key={modal.release.uuid}
              app={
                app || {
                  id: Number(id),
                  name: modal.release.packageName || '',
                  type: 'CUSTOM',
                  deviceType: 'android',
                  applicationReleases: [],
                  categories: [],
                  tags: [],
                  rating: 0,
                  isFavourite: false,
                }
              }
              release={modal.release}
              action="install"
              deviceType="android"
              firmware
              onGroupSubview={setGroupSubview}
            />
          ) : (
            <>
              <h2>{modal.release.packageName}</h2>
              <p>
                {modal.release.version} · {modal.release.releaseType}
              </p>
              <Subscriptions uuid={modal.release.uuid} firmware />
            </>
          )}
          {!groupSubview && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={() => {
                  setModal(undefined);
                  setGroupSubview(false);
                }}
              >
                {t('Done')}
              </Button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
