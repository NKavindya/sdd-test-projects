import { toast } from '@heroui/react';
import { Button } from '../shared/Button';
import { useEffect, useState } from 'react';
import { Input } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../services/session';
import { api } from '../services/client';
import {
  scope,
  type Filter,
  type Identity,
  type ListResult,
  type SubscriptionCount,
  type SubscriptionRow,
} from '../services/model';
import { Check, Confirm, Empty, TabBar, problem } from '../shared/ui';
import { EntgraTable, type Column } from '../shared/EntgraTable';
import { EntgraSearchFilter } from '../shared/EntgraSearchFilter';
export default function Subscriptions({
  uuid,
  firmware = false,
  initialCounts,
}: {
  uuid: string;
  firmware?: boolean;
  initialCounts?: SubscriptionCount[];
}) {
  const { has } = useSession();
  const { t } = useTranslation();
  const [counts, setCounts] = useState<SubscriptionCount[]>(
    initialCounts || [],
  );
  const [identity, setIdentity] = useState<Identity>();
  const [status, setStatus] = useState('subscribed');
  const [lane, setLane] = useState('COMPLETED');
  const [identifier, setIdentifier] = useState('');
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>({});
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!has(scope.subscriptions) || (initialCounts && revision === 0)) return;
    void api<SubscriptionCount[]>(
      `/admin/subscription/${uuid}/subscriptions/count`,
    )
      .then(setCounts)
      .catch((e) =>
        problem(e, 'Error occurred while trying to load subscription types.'),
      );
  }, [uuid, revision]);
  const deviceView = identity === 'device' || !!identifier;
  useEffect(() => {
    if (!identity || !has(scope.subscriptions)) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      const path = `/admin/subscription/${uuid}/subscriptions/${identity}${deviceView ? '/devices/' + lane : ''}`;
      void api<ListResult<SubscriptionRow>>(path, 'GET', undefined, {
        subscriptionStatus: status,
        identifier: identifier || undefined,
        offset: (page - 1) * 10,
        limit: 10,
        ...filter,
        ...(!deviceView ? { searchName: search } : {}),
      })
        .then((r) => {
          if (active) {
            setRows(r.data);
            setCount(r.count ?? r.recordsTotal ?? 0);
          }
        })
        .catch(problem)
        .finally(() => active && setLoading(false));
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    uuid,
    identity,
    status,
    lane,
    identifier,
    page,
    filter,
    search,
    revision,
  ]);
  function pick(kind: Identity, value: string) {
    setIdentity(kind);
    setStatus(value);
    setIdentifier('');
    setLane('COMPLETED');
    setPage(1);
    setRows([]);
    setSelected(new Set());
    setFilter({});
  }
  const rowKey = (r: SubscriptionRow) =>
    String(r.subId ?? r.deviceId ?? r.device?.id ?? r.id ?? r.name);
  async function retry(targets: SubscriptionRow[]) {
    try {
      await api(
        `/subscription/${uuid}/devices/${status === 'subscribed' ? 'install' : 'uninstall'}`,
        'POST',
        targets.map((r) => ({
          id: r.device?.deviceIdentifier || r.deviceIdentifier,
          type: r.device?.type || r.type,
        })),
      );
      toast.success(t('Done!'), {
        description: t('Installation retry successful!'),
      });
      setRevision((v) => v + 1);
    } catch (e) {
      problem(e);
    }
  }
  const columns: Column<SubscriptionRow>[] =
    deviceView && lane === 'NEW'
      ? [
          {
            title: 'Device',
            render: (r) => (
              <a
                href={`/endpoint-mgt/devices/${r.device?.type || r.type}/${r.device?.deviceIdentifier || r.deviceIdentifier}/info`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.device?.name || r.deviceName}
              </a>
            ),
          },
          {
            title: 'Owner',
            render: (r) => r.device?.enrolmentInfo?.owner || r.deviceOwner,
          },
          {
            title: 'Ownership',
            render: (r) => r.device?.enrolmentInfo?.ownership || '—',
          },
          { title: 'Device status', field: 'deviceStatus' },
        ]
      : deviceView
        ? [
            {
              title: 'Device',
              render: (r) => (
                <a
                  href={`/endpoint-mgt/devices/${r.device?.type || r.type}/${r.device?.deviceIdentifier || r.deviceIdentifier}/info`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {r.device?.name || r.deviceName}
                </a>
              ),
            },
            {
              title: 'Owner',
              render: (r) =>
                r.device?.enrolmentInfo?.owner || r.deviceOwner || '—',
            },
            { title: 'Action type', field: 'actionType' },
            { title: 'Triggered by', field: 'actionTriggeredBy' },
            {
              title: 'Action triggered at',
              render: (r) =>
                r.actionTriggeredTimestamp
                  ? new Date(r.actionTriggeredTimestamp).toLocaleString()
                  : '—',
            },
            {
              title: 'Action status',
              render: (r) => (
                <span className={'status ' + (r.status || lane).toLowerCase()}>
                  {r.status || lane}
                  {lane === 'ERROR' && has(scope.install) && (
                    <Confirm
                      title="Are you sure to retry this installation?"
                      label="Yes"
                      onConfirm={() => retry([r])}
                    >
                      {t('Retry')}
                    </Confirm>
                  )}
                  {has(scope.status) &&
                    ['PENDING', 'IN_PROGRESS'].includes(r.status || lane) && (
                      <Confirm
                        title={`Are you sure change this status from ${r.status || lane} to ERROR?`}
                        label="Yes"
                        onConfirm={async () => {
                          try {
                            await api(
                              `/admin/subscription/device/${r.deviceId || r.device?.id}/status`,
                              'PUT',
                              {
                                subId: r.subId,
                                status: 'ERROR',
                                deviceIdentifier:
                                  r.deviceIdentifier ||
                                  r.device?.deviceIdentifier,
                              },
                            );
                            toast.success(t('Operation updated successfully'));
                            setRevision((v) => v + 1);
                          } catch (e) {
                            problem(e);
                          }
                        }}
                      >
                        Error
                      </Confirm>
                    )}
                </span>
              ),
            },
            { title: 'Device status', field: 'deviceStatus' },
          ]
        : [
            {
              title: identity
                ? identity[0].toUpperCase() + identity.slice(1)
                : 'Name',
              render: (r) => (
                <Button
                  variant="ghost"
                  isDisabled={identity === 'group'}
                  onPress={() => {
                    setIdentifier(r.name || '');
                    setPage(1);
                  }}
                >
                  {r.name}
                </Button>
              ),
            },
            { title: 'Owner', field: 'owner' },
            { title: 'Device', field: 'deviceCount' },
          ];
  if (!has(scope.subscriptions))
    return (
      <p role="alert" className="warning">
        You don't have permission to view subscription details
      </p>
    );
  return (
    <div className="subscriptions">
      <p>
        {t(
          'Subscription details and installation status of the application for each respective device, group, role, or user.',
        )}
      </p>
      <div className="subscription-layout">
        <aside className="subscription-sidebar">
          {(firmware
            ? ['device', 'group']
            : ['device', 'user', 'role', 'group']
          ).map((kind) => {
            const c = counts.find(
              (c) => c.subscriptionType.toLowerCase() === kind,
            );
            const title = kind[0].toUpperCase() + kind.slice(1);
            return (
              <div key={kind} className={identity === kind ? 'active' : ''}>
                <h3>{t(title)}</h3>
                {['subscribed', 'unsubscribed'].map((value) => {
                  const n =
                    value === 'subscribed'
                      ? c?.subscriptionCount || 0
                      : c?.unsubscriptionCount || 0;
                  return (
                    <Button
                      key={value}
                      variant="ghost"
                      isDisabled={!n}
                      title={
                        !n
                          ? value === 'unsubscribed' && kind === 'device'
                            ? 'Currently, you have not unsubscribed any devices from this application.'
                            : 'You cannot select this option.'
                          : undefined
                      }
                      onPress={() => pick(kind as Identity, value)}
                    >
                      {t(value === 'subscribed' ? 'Installed' : 'Uninstalled')}:{' '}
                      {n}
                    </Button>
                  );
                })}
              </div>
            );
          })}
        </aside>
        <div className="subscription-main">
          {!identity ? (
            <Empty
              title="Select to view details."
              description="Please select a device, group, role, or user to view installation/uninstallation details."
            />
          ) : (
            <>
              <h2>
                {status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}{' '}
                {identity[0].toUpperCase() + identity.slice(1)} Subscriptions
              </h2>
              {deviceView ? (
                <>
                  <TabBar
                    items={(firmware
                      ? ['COMPLETED', 'PENDING', 'ERROR']
                      : ['COMPLETED', 'PENDING', 'ERROR', 'NEW']
                    ).map((s) => ({
                      id: s,
                      label: s[0] + s.slice(1).toLowerCase() + ' Devices',
                    }))}
                    value={lane}
                    onChange={(v) => {
                      setLane(v);
                      setPage(1);
                      setSelected(new Set());
                      setFilter({});
                    }}
                  />
                  <EntgraSearchFilter
                    key={lane}
                    title="Search Devices"
                    variant="common"
                    criteria={[
                      { label: 'Device', key: 'deviceName' },
                      { label: 'Owner', key: 'owner' },
                      { label: 'Triggered by', key: 'triggeredBy' },
                      { label: 'Action status', key: 'actionStatus' },
                    ]}
                    onSearch={(f) => {
                      setFilter(f);
                      setPage(1);
                    }}
                  />
                  {lane === 'ERROR' && has(scope.install) && (
                    <div className="retry-toolbar">
                      <Check
                        value={
                          rows.length > 0 &&
                          rows.every((r) => selected.has(rowKey(r)))
                        }
                        onChange={(v) =>
                          setSelected(new Set(v ? rows.map(rowKey) : []))
                        }
                      >
                        Select all error devices for this subscription
                      </Check>
                      <Confirm
                        title="Are you sure to retry this installation?"
                        label="Yes"
                        disabled={!rows.some((r) => selected.has(rowKey(r)))}
                        onConfirm={() =>
                          retry(rows.filter((r) => selected.has(rowKey(r))))
                        }
                      >
                        {t('Retry Installation')}
                      </Confirm>
                    </div>
                  )}
                </>
              ) : (
                <Input
                  aria-label={`Search ${identity}s...`}
                  placeholder={`Search ${identity}s...`}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              )}
              <EntgraTable
                rows={rows}
                columns={columns}
                rowKey={rowKey}
                selected={deviceView ? selected : undefined}
                onSelect={deviceView ? setSelected : undefined}
                page={page}
                onPage={(p) => {
                  setPage(p);
                  setSelected(new Set());
                }}
                total={count}
                loading={loading}
                expand={
                  deviceView
                    ? (r) => (
                        <OperationDetails
                          uuid={uuid}
                          deviceId={r.deviceId || r.device?.id}
                        />
                      )
                    : undefined
                }
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function OperationDetails({
  uuid,
  deviceId,
}: {
  uuid: string;
  deviceId?: number;
}) {
  const [rows, setRows] = useState<
    {
      operationId: number;
      operationCode: string;
      status: string;
      actionTriggeredAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return;
    }
    void api<{ DevicesOperations: typeof rows }>(
      `/admin/subscription/devices/${deviceId}/operations/${uuid}`,
    )
      .then((r) => setRows(r.DevicesOperations || []))
      .catch(problem)
      .finally(() => setLoading(false));
  }, [uuid, deviceId]);
  return (
    <EntgraTable
      rows={rows}
      rowKey={(r) => String(r.operationId)}
      columns={[
        { title: 'Action type', field: 'operationCode' },
        { title: 'Action status', field: 'status' },
        {
          title: 'Action triggered at',
          render: (r) =>
            r.actionTriggeredAt
              ? new Date(r.actionTriggeredAt).toLocaleString()
              : '—',
        },
      ]}
      loading={loading}
    />
  );
}
