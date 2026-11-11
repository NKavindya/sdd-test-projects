import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntgraTable, type Column } from '@/shared/EntgraTable';
import {
  EntgraSearchFilter,
  type Criterion,
} from '@/shared/EntgraSearchFilter';
import { Forbidden } from '@/shared/common';
import { Input } from '@/components/ui/input';
import { api, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type Device, type Group } from '@/services/types';
export const deviceColumns: Column<Device>[] = [
  { title: 'Device', field: 'name' },
  {
    title: 'Model',
    render: (d) =>
      String(d.deviceInfo?.vendor || 'unknown') +
      ' ' +
      String(d.deviceInfo?.deviceModel || ''),
  },
  { title: 'Owner', render: (d) => d.enrolmentInfo?.owner || 'unknown' },
  {
    title: 'Serial',
    render: (d) =>
      String(
        d.deviceInfo?.serial ||
          d.properties?.find((v) => v.name === 'serial')?.value ||
          'unknown',
      ),
  },
  {
    title: 'Last Updated',
    render: (d) =>
      d.lastUpdatedTimeStamp
        ? new Date(d.lastUpdatedTimeStamp).toLocaleString()
        : '—',
  },
  { title: 'Status', render: (d) => d.enrolmentInfo?.status || '—' },
  { title: 'Ownership', render: (d) => d.enrolmentInfo?.ownership || '—' },
  { title: 'OS', render: (d) => String(d.deviceInfo?.osVersion || 'unknown') },
  { title: 'IMEI', render: (d) => String(d.deviceInfo?.imei || 'not-found') },
];
export function TargetPicker({
  kind,
  deviceType,
  uuid,
  action,
  onChange,
  firmware = false,
  bucket = 'APPLICABLE',
  group,
}: {
  kind: string;
  deviceType: string;
  uuid: string;
  action: string;
  onChange: (value: unknown[]) => void;
  firmware?: boolean;
  bucket?: string;
  group?: Group;
}) {
  const session = useSession();
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Device[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [deviceFilters, setDeviceFilters] = useState<{
    statuses: string[];
    ownerships: string[];
  }>({ statuses: [], ownerships: [] });
  const canView =
    kind === 'Device'
      ? session.has(scopes.devices)
      : kind === 'User'
        ? session.has(scopes.users)
        : kind === 'Role'
          ? session.has(scopes.roles)
          : session.has(scopes.groups) || session.has(scopes.adminGroups);
  const criteria: Criterion[] = [
    { key: 'name', label: 'Device' },
    { key: 'user', label: 'User' },
    { key: 'status', label: 'Status', options: deviceFilters.statuses },
    { key: 'ownership', label: 'Ownership', options: deviceFilters.ownerships },
    { key: 'serialNumber', label: 'Serial' },
  ];
  useEffect(() => {
    setSelected([]);
    onChange([]);
    setPage(1);
    setFilters({});
  }, [kind, bucket, group?.id]);
  useEffect(() => {
    if (kind === 'Device' && canView)
      api<typeof deviceFilters>('deviceMgt', 'GET', '/devices/filters')
        .then(setDeviceFilters)
        .catch((e) =>
          notifyError(
            e,
            'Error occurred while trying to retrieve device filters.',
          ),
        );
  }, [kind, canView]);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!canView) {
        if (kind === 'User') {
          setOptions([session.username]);
          setSelected([session.username]);
          onChange([session.username]);
        }
        return;
      }
      setLoading(true);
      try {
        if (kind === 'Device' || group) {
          const params = { offset: (page - 1) * 10, limit: 10, ...filters };
          if (firmware) {
            const result = await api<{ data: Device[]; recordsTotal: number }>(
              'store',
              'GET',
              `/firmware/${uuid}${group ? '/groups/' + group.id : ''}/devices`,
              undefined,
              { ...params, matchType: bucket },
            );
            if (active) {
              setDevices(result.data || []);
              setTotal(result.recordsTotal);
            }
          } else if (action === 'uninstall') {
            const result = await api<{ data: Device[]; recordsTotal: number }>(
              'store',
              'GET',
              `/subscription/${uuid}/devices`,
              undefined,
              params,
            );
            if (active) {
              setDevices(result.data || []);
              setTotal(result.recordsTotal);
            }
          } else {
            const result = await api<{ devices: Device[]; count: number }>(
              'deviceMgt',
              'GET',
              '/devices',
              undefined,
              {
                ...params,
                type: deviceType === 'web-clip' ? undefined : deviceType,
                requireDeviceInfo: true,
              },
            );
            if (active) {
              setDevices(result.devices || []);
              setTotal(result.count);
            }
          }
        } else if (kind === 'Group') {
          const result = await api<{ deviceGroups: Group[] }>(
            'deviceMgt',
            'GET',
            `${session.has(scopes.adminGroups) ? '/admin' : ''}/groups/hierarchy`,
            undefined,
            { depth: 99 },
          );
          if (active) setGroups(result.deviceGroups || []);
        } else if (action === 'uninstall') {
          const result = await api<{
            data: (string | { name?: string; username?: string })[];
          }>(
            'store',
            'GET',
            `/subscription/${uuid}/${kind.toUpperCase()}`,
            undefined,
            { searchName: query, offset: 0, limit: 50 },
          );
          if (active)
            setOptions(
              (result.data || []).map((v) =>
                typeof v === 'string' ? v : v.username || v.name || '',
              ),
            );
        } else if (kind === 'User') {
          const result = await api<{ users: { username: string }[] }>(
            'deviceMgt',
            'GET',
            '/users/search',
            undefined,
            { username: query, offset: 0, limit: 50 },
          );
          if (active) setOptions(result.users.map((v) => v.username));
        } else {
          const result = await api<{ roles: string[] }>(
            'deviceMgt',
            'GET',
            '/roles',
            undefined,
            { filter: query, offset: 0, limit: 50 },
          );
          if (active) setOptions(result.roles);
        }
      } catch (e) {
        notifyError(e);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [kind, page, query, filters, uuid, action, bucket, group?.id, canView]);
  const choose = (ids: string[]) => {
    setSelected(ids);
    if (kind === 'Device' || group) {
      const selectedRows = devices.filter((d) => ids.includes(String(d.id)));
      onChange(
        selectedRows.map((d) => ({ id: d.deviceIdentifier, type: d.type })),
      );
    } else onChange(ids);
  };
  if (!canView && kind !== 'User')
    return (
      <Forbidden
        message={`You don't have permission to view ${kind === 'Device' ? 'devices' : kind === 'Role' ? 'roles' : 'groups'}.`}
      />
    );
  const tree = (items: Group[], depth = 0): React.ReactNode =>
    items.map((g) => (
      <div key={g.id} style={{ paddingLeft: depth * 20 }}>
        <label className="tree-node">
          <input
            type="checkbox"
            checked={selected.includes(g.name)}
            onChange={(e) =>
              choose(
                e.target.checked
                  ? [...selected, g.name]
                  : selected.filter((v) => v !== g.name),
              )
            }
          />
          {g.name}
        </label>
        {g.childrenGroups && tree(g.childrenGroups, depth + 1)}
      </div>
    ));
  return (
    <div className="target-picker">
      {kind === 'Device' || group ? (
        <>
          <EntgraSearchFilter
            title="Search Devices"
            variant="common"
            criteria={criteria}
            context={kind + bucket}
            onSearch={(v) => {
              setPage(1);
              setFilters(v);
              setSelected([]);
              onChange([]);
            }}
          />
          <EntgraTable
            rows={devices}
            columns={deviceColumns}
            rowKey={(d) => String(d.id)}
            selected={selected}
            onSelection={choose}
            page={page}
            total={total}
            onPage={(p) => {
              setPage(p);
              setSelected([]);
              onChange([]);
            }}
            loading={loading}
          />
        </>
      ) : kind === 'Group' ? (
        <>{tree(groups)}</>
      ) : (
        <>
          <label className="picker-label">
            {t(kind === 'User' ? 'Select users' : 'Search roles')}
          </label>
          <Input
            aria-label={t(
              kind === 'User' ? 'Enter the username' : 'Search roles',
            )}
            placeholder={t(
              kind === 'User' ? 'Enter the username' : 'Search roles',
            )}
            value={query}
            disabled={!canView}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="multi-select">
            {loading ? (
              <span className="spinner" />
            ) : (
              options.map((option) => (
                <label key={option}>
                  <input
                    type="checkbox"
                    disabled={!canView}
                    checked={selected.includes(option)}
                    onChange={(e) =>
                      choose(
                        e.target.checked
                          ? [...selected, option]
                          : selected.filter((v) => v !== option),
                      )
                    }
                  />
                  {option}
                </label>
              ))
            )}
          </div>
          {!canView && action === 'uninstall' && <div className="alert">R</div>}
        </>
      )}
    </div>
  );
}
