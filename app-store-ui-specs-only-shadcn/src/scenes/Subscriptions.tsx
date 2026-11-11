import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { EntgraTable, type Column } from '@/shared/EntgraTable';
import { EntgraSearchFilter } from '@/shared/EntgraSearchFilter';
import { Confirm, Empty } from '@/shared/common';
import { api, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type DeviceSubscription } from '@/services/types';
interface Count {
  subscriptionType: string;
  subscriptionCount: number;
  unsubscriptionCount: number;
}
interface Identity {
  id: number;
  name: string;
  owner?: string;
  subscribedBy?: string;
  subscribedTimestamp?: number;
}
export function Subscriptions({
  uuid,
  firmware = false,
}: {
  uuid: string;
  firmware?: boolean;
}) {
  const session = useSession();
  const { t } = useTranslation();
  const generation = useRef(0);
  const [counts, setCounts] = useState<Count[]>([]);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('subscribed');
  const [lane, setLane] = useState('COMPLETED');
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [identifier, setIdentifier] = useState('');
  const [rows, setRows] = useState<DeviceSubscription[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState<DeviceSubscription[]>();
  const [edit, setEdit] = useState<DeviceSubscription>();
  const loadCounts = () =>
    api<Count[]>(
      'store',
      'GET',
      `/admin/subscription/${uuid}/subscriptions/count`,
    )
      .then(setCounts)
      .catch((e) =>
        notifyError(
          e,
          'Error occurred while trying to load subscription types.',
        ),
      );
  useEffect(() => {
    if (session.has(scopes.subView)) loadCounts();
  }, [uuid]);
  const load = async () => {
    if (!kind) return;
    const id = ++generation.current;
    setLoading(true);
    try {
      if (kind !== 'device' && !identifier) {
        const result = await api<{ data: Identity[]; count: number }>(
          'store',
          'GET',
          `/admin/subscription/${uuid}/subscriptions/${kind}`,
          undefined,
          {
            subscriptionStatus: status,
            searchName: search,
            offset: (page - 1) * 10,
            limit: 10,
          },
        );
        if (id !== generation.current) return;
        setIdentities(result.data || []);
        setTotal(result.count);
      } else {
        const result = await api<{ data: DeviceSubscription[]; count: number }>(
          'store',
          'GET',
          `/admin/subscription/${uuid}/subscriptions/${kind}/devices/${lane}`,
          undefined,
          {
            subscriptionStatus: status,
            identifier: identifier || undefined,
            offset: (page - 1) * 10,
            limit: 10,
            ...filters,
          },
        );
        if (id !== generation.current) return;
        setRows(result.data || []);
        setTotal(result.count);
      }
    } catch (e) {
      notifyError(e);
    } finally {
      if (id === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    if (session.has(scopes.subView)) load();
  }, [uuid, kind, status, lane, identifier, page, filters, search]);
  if (!session.has(scopes.subView))
    return (
      <div className="alert">
        {t("You don't have permission to view subscription details")}
      </div>
    );
  const columns: Column<DeviceSubscription>[] = [
    {
      title: 'Device',
      render: (r) => (
        <a
          href={`/endpoint-mgt/devices/${r.device?.type || r.type}/${r.device?.id || r.deviceId}/info`}
          target="_blank"
          rel="noreferrer"
        >
          {r.device?.name || r.deviceName}
        </a>
      ),
    },
    {
      title: 'Owner',
      render: (r) => r.device?.enrolmentInfo?.owner || r.deviceOwner,
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
        <span className={`status-tag ${r.status?.toLowerCase()}`}>
          {r.status}
        </span>
      ),
    },
    { title: 'Device status', field: 'deviceStatus' },
  ];
  const newColumns: Column<DeviceSubscription>[] = [
    {
      title: 'Device',
      render: (r) => (
        <a
          href={`/endpoint-mgt/devices/${r.device?.type || r.type}/${r.device?.id || r.deviceId}/info`}
          target="_blank"
          rel="noreferrer"
        >
          {r.device?.name || r.deviceName}
        </a>
      ),
    },
    { title: 'Type', render: (r) => r.device?.type || r.type },
    {
      title: 'Owner',
      render: (r) => r.device?.enrolmentInfo?.owner || r.deviceOwner,
    },
    {
      title: 'Ownership',
      render: (r) => r.device?.enrolmentInfo?.ownership || '—',
    },
    {
      title: 'Device status',
      render: (r) => r.device?.enrolmentInfo?.status || r.deviceStatus,
    },
  ];
  return (
    <section className="subscriptions">
      <p>
        {t(
          'Subscription details and installation status of the application for each respective device, group, role, or user.',
        )}
      </p>
      <div className="subscription-layout">
        <aside className="subscription-sidebar">
          {(firmware
            ? ['Device', 'Group']
            : ['Device', 'User', 'Role', 'Group']
          ).map((type) => {
            const count = counts.find(
              (c) => c.subscriptionType.toLowerCase() === type.toLowerCase(),
            );
            return (
              <div className="identity" key={type}>
                <h3>{t(type)}</h3>
                {[
                  ['subscribed', 'Installed', count?.subscriptionCount || 0],
                  [
                    'unsubscribed',
                    'Uninstalled',
                    count?.unsubscriptionCount || 0,
                  ],
                ].map(([wire, label, count]) => (
                  <button
                    key={wire}
                    className={
                      kind === type.toLowerCase() && status === wire
                        ? 'selected'
                        : ''
                    }
                    disabled={!count}
                    title={
                      !count
                        ? type === 'Device' && wire === 'unsubscribed'
                          ? 'Currently, you have not unsubscribed any devices from this application.'
                          : 'You cannot select this option.'
                        : undefined
                    }
                    onClick={() => {
                      setKind(type.toLowerCase());
                      setStatus(String(wire));
                      setIdentifier('');
                      setSelected([]);
                      setPage(1);
                      setRows([]);
                      setIdentities([]);
                    }}
                  >
                    {t(String(label))}: {count}
                  </button>
                ))}
              </div>
            );
          })}
        </aside>
        <div className="subscription-main">
          {!kind ? (
            <Empty
              title="Select to view details."
              description="Please select a device, group, role, or user to view installation/uninstallation details."
            />
          ) : kind !== 'device' && !identifier ? (
            <>
              <input
                className="identity-search"
                placeholder={`Search ${kind}s...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <EntgraTable
                rows={identities}
                rowKey={(r) => String(r.id)}
                columns={[
                  {
                    title: 'Name',
                    render: (r) =>
                      kind === 'group' ? (
                        r.name
                      ) : (
                        <button
                          className="text-primary"
                          onClick={() => {
                            setIdentifier(r.name || r.owner || '');
                            setPage(1);
                            setRows([]);
                          }}
                        >
                          {r.name || r.owner}
                        </button>
                      ),
                  },
                  { title: 'Triggered by', field: 'subscribedBy' },
                  {
                    title: 'Action triggered at',
                    render: (r) =>
                      r.subscribedTimestamp
                        ? new Date(r.subscribedTimestamp).toLocaleString()
                        : '—',
                  },
                ]}
                total={total}
                page={page}
                onPage={setPage}
                loading={loading}
              />
            </>
          ) : (
            <>
              <h2>
                {status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}{' '}
                {kind[0].toUpperCase() + kind.slice(1)} Subscriptions{' '}
                {identifier}
              </h2>
              {identifier && (
                <Button variant="link" onClick={() => setIdentifier('')}>
                  {t('Back')}
                </Button>
              )}
              <div className="tabs">
                {(firmware
                  ? ['COMPLETED', 'PENDING', 'ERROR']
                  : ['COMPLETED', 'PENDING', 'ERROR', 'NEW']
                ).map((v) => (
                  <button
                    key={v}
                    title={`${v[0] + v.slice(1).toLowerCase()} Devices`}
                    className={lane === v ? 'active' : ''}
                    onClick={() => {
                      setLane(v);
                      setPage(1);
                      setSelected([]);
                      setFilters({});
                    }}
                  >
                    {t(v[0] + v.slice(1).toLowerCase())}
                  </button>
                ))}
              </div>
              <EntgraSearchFilter
                key={lane}
                title="Search Devices"
                variant="subscription"
                criteria={[
                  { key: 'deviceName', label: 'Device' },
                  { key: 'owner', label: 'Owner' },
                  { key: 'triggeredBy', label: 'Triggered by' },
                  {
                    key: 'actionStatus',
                    label: 'Action status',
                    options: [
                      'COMPLETED',
                      'PENDING',
                      'IN_PROGRESS',
                      'REPEATED',
                      'ERROR',
                      'INVALID',
                      'UNAUTHORIZED',
                    ],
                  },
                ]}
                onSearch={(v) => {
                  setFilters(v);
                  setPage(1);
                }}
              />
              {lane === 'ERROR' && session.has(scopes.install) && (
                <Button
                  className="mb-4"
                  disabled={!selected.length}
                  title={
                    !selected.length
                      ? 'Please select a device to retry'
                      : undefined
                  }
                  onClick={() =>
                    setRetry(
                      rows.filter((r) => selected.includes(String(r.subId))),
                    )
                  }
                >
                  {t('Retry Installation')}
                </Button>
              )}
              <EntgraTable
                rows={rows}
                rowKey={(r) => String(r.subId)}
                columns={lane === 'NEW' ? newColumns : columns}
                selected={selected}
                onSelection={lane === 'ERROR' ? setSelected : undefined}
                total={total}
                page={page}
                onPage={setPage}
                loading={loading}
                has={session.has}
                actions={[
                  ...(lane === 'ERROR'
                    ? [
                        {
                          label: 'Retry',
                          permissions: [scopes.install],
                          onClick: (r: DeviceSubscription) => setRetry([r]),
                        },
                      ]
                    : []),
                  ...(lane === 'PENDING'
                    ? [
                        {
                          label: 'Error',
                          permissions: [scopes.subModify],
                          onClick: (r: DeviceSubscription) => setEdit(r),
                        },
                      ]
                    : []),
                ]}
                expand={(r) => (
                  <OperationDetails deviceId={r.deviceId} uuid={uuid} />
                )}
              />
            </>
          )}
        </div>
      </div>
      {retry && (
        <Confirm
          message="Are you sure to retry this installation?"
          onClose={() => setRetry(undefined)}
          onConfirm={async () => {
            try {
              await api(
                'store',
                'POST',
                `/subscription/${uuid}/devices/${status === 'subscribed' ? 'install' : 'uninstall'}`,
                retry.map((r) => ({
                  id: r.device?.deviceIdentifier || r.deviceIdentifier,
                  type: r.device?.type || r.type,
                })),
              );
              toast.success(t('Done!'), {
                description: t('Installation retry successful!'),
              });
              setSelected([]);
              await load();
            } catch (e) {
              notifyError(e);
            }
          }}
        />
      )}
      {edit && (
        <Confirm
          message={`Are you sure change this status from ${edit.status} to ERROR?`}
          onClose={() => setEdit(undefined)}
          onConfirm={async () => {
            try {
              await api(
                'store',
                'PUT',
                `/admin/subscription/device/${edit.deviceId}/status`,
                {
                  subId: edit.subId,
                  status: 'ERROR',
                  deviceIdentifier: edit.deviceIdentifier,
                },
              );
              toast.success(t('Operation updated successfully'));
              await load();
            } catch (e) {
              notifyError(e);
            }
          }}
        />
      )}
    </section>
  );
}

interface DeviceOperation {
  operationId: number;
  operationCode: string;
  status: string;
  actionTriggeredAt: number;
  actionTriggeredFrom: string;
}
function OperationDetails({
  deviceId,
  uuid,
}: {
  deviceId: number;
  uuid: string;
}) {
  const [rows, setRows] = useState<DeviceOperation[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api<{ DevicesOperations: DeviceOperation[] }>(
      'store',
      'GET',
      `/admin/subscription/devices/${deviceId}/operations/${uuid}`,
    )
      .then((data) => setRows(data.DevicesOperations || []))
      .catch((e) => notifyError(e))
      .finally(() => setLoading(false));
  }, [deviceId, uuid]);
  if (!loading && !rows.length) return <p>No Details</p>;
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
        { title: 'Triggered by', field: 'actionTriggeredFrom' },
      ]}
      loading={loading}
    />
  );
}
