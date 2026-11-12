import { Button } from '../shared/Button';
import { useEffect, useState } from 'react';
import { Card } from '@heroui/react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../services/client';
import { useSession } from '../services/session';
import {
  scope,
  type Application,
  type Filter,
  type Release,
  type ReleaseList,
  type SubscriptionCount,
} from '../services/model';
import { Crumbs, Dialog, Forbidden, problem } from '../shared/ui';
import { EntgraTable } from '../shared/EntgraTable';
import { EntgraSearchFilter } from '../shared/EntgraSearchFilter';
import { TargetPicker } from './Wizard';
import Subscriptions from './Subscriptions';
import { ReleaseReminder } from './Release';
export default function Firmware() {
  const { id = '', deviceType = '' } = useParams();
  const loc = useLocation();
  const { has } = useSession();
  const { t } = useTranslation();
  const firmware = loc.state?.firmware as Application | undefined;
  const [subscriptionCounts, setSubscriptionCounts] = useState<
    SubscriptionCount[]
  >([]);
  const [groupSubview, setGroupSubview] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [filter, setFilter] = useState<Filter>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Release>();
  const [modal, setModal] = useState<'install' | 'subscriptions'>();
  useEffect(() => {
    if (!has(scope.view)) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void api<ReleaseList>(`/applications/${id}/releases/CUSTOM`, 'POST', {
      applicationId: Number(id),
      limit: 10,
      offset: (page - 1) * 10,
      ...filter,
    })
      .then((r) => {
        if (active) {
          setReleases(r.releases);
          setCount(r.pagination.count);
        }
      })
      .catch((e) =>
        problem(e, 'Error occurred while trying to load firmware release.'),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, page, filter]);
  if (!has(scope.view)) return <Forbidden />;
  const app: Application = firmware || {
    id: Number(id),
    name: selected?.packageName || '',
    type: 'CUSTOM',
    deviceType: 'android',
    applicationReleases: [],
  };
  return (
    <>
      <Crumbs
        items={[
          { label: 'Apps', to: '/' },
          {
            label:
              deviceType === 'ios'
                ? 'iOS'
                : deviceType[0]?.toUpperCase() + deviceType.slice(1),
          },
          {
            label: 'Firmware',
            to: `/${deviceType}/applications`,
            state: { selected: 'firmware' },
          },
          ...(firmware ? [{ label: firmware.name }] : []),
        ]}
      />
      {!!firmware?.firmwareModels?.length && (
        <Card className="firmware-summary">
          <h2>Firmware Name: {firmware.name}</h2>
          <p>Description: {firmware.description}</p>
          <h3>Associated Models</h3>
          <div className="chips">
            {firmware.firmwareModels.map((model) => (
              <span key={model}>{model}</span>
            ))}
          </div>
        </Card>
      )}
      <EntgraSearchFilter
        title="Search Firmware Releases"
        variant="common"
        criteria={[
          { label: 'Firmware Package Name', key: 'packageName' },
          { label: 'Version', key: 'version' },
          {
            label: 'Release Channels',
            key: 'releaseType',
            options: ['PRODUCTION', 'TEST'],
          },
        ]}
        onSearch={(f) => {
          setFilter(f);
          setPage(1);
        }}
      />
      <EntgraTable
        rows={releases}
        columns={[
          { title: 'Firmware Package Name', field: 'packageName' },
          { title: 'Version', field: 'version' },
          { title: 'Release Channels', field: 'releaseType' },
        ]}
        rowKey={(r) => r.uuid}
        page={page}
        onPage={setPage}
        total={count}
        loading={loading}
        actions={[
          {
            label: 'Install',
            tooltip: 'Install this firmware',
            allowed: has(scope.view),
            run: (r) => {
              setSelected(r);
              setGroupSubview(false);
              setModal('install');
            },
          },
          {
            label: 'Subscription Details',
            tooltip: 'View subscription details',
            allowed: has(scope.view),
            run: async (r) => {
              if (has(scope.subscriptions)) {
                try {
                  const counts = await api<SubscriptionCount[]>(
                    `/admin/subscription/${r.uuid}/subscriptions/count`,
                  );
                  setSubscriptionCounts(
                    counts.filter(
                      (c) =>
                        !['user', 'role'].includes(
                          c.subscriptionType.toLowerCase(),
                        ),
                    ),
                  );
                } catch (e) {
                  problem(
                    e,
                    'Error occurred while trying to load subscription types.',
                  );
                  return;
                }
              }
              setSelected(r);
              setModal('subscriptions');
            },
          },
        ]}
        expand={(r) => (
          <dl className="metadata">
            {[
              ['Version', r.version],
              ['Firmware channel', r.releaseType],
              ['Status', r.currentStatus],
              ['Name', r.packageName],
              ['Supported OS', r.supportedOsVersions],
              ['Description', r.description],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      />
      <Dialog
        open={!!modal}
        onClose={() => {
          setModal(undefined);
          setSelected(undefined);
        }}
        title={t(modal === 'install' ? 'Install' : 'Subscription Details')}
        wide
        footer={
          !groupSubview && (
            <>
              <Button variant="secondary" onPress={() => setModal(undefined)}>
                {t('Cancel')}
              </Button>
              <Button onPress={() => setModal(undefined)}>{t('OK')}</Button>
            </>
          )
        }
      >
        {selected && (
          <>
            <ReleaseReminder
              small
              app={{ ...app, applicationReleases: [selected] }}
            />
            {modal === 'install' ? (
              <TargetPicker
                firmware
                onSubviewChange={setGroupSubview}
                app={{
                  ...app,
                  type: 'CUSTOM',
                  applicationReleases: [selected],
                }}
                deviceType="android"
              />
            ) : (
              <Subscriptions
                uuid={selected.uuid}
                firmware
                initialCounts={subscriptionCounts}
              />
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
