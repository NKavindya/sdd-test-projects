import { MultiChoice } from '../shared/MultiChoice';
import { Button } from '../shared/Button';
import { useEffect, useState } from 'react';
import { Card, Input, Avatar } from '@heroui/react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  Application,
  Device,
  Filter,
  Group,
  Identity,
  ListResult,
} from '../services/model';
import { scope } from '../services/model';
import { getHandoff } from '../services/handoff';
import { subscriptionPath } from '../services/contracts';
import { api, dm } from '../services/client';
import { useSession } from '../services/session';
import {
  Check,
  Crumbs,
  Dialog,
  Forbidden,
  TabBar,
  problem,
  done,
} from '../shared/ui';
import { EntgraTable, Pager, type Column } from '../shared/EntgraTable';
import {
  deviceCriteria,
  EntgraSearchFilter,
} from '../shared/EntgraSearchFilter';
import { ReleaseReminder } from './Release';
export const deviceColumns: Column<Device>[] = [
  { title: 'Device', field: 'name' },
  {
    title: 'Model',
    render: (d) =>
      [d.deviceInfo?.vendor, d.deviceInfo?.deviceModel]
        .filter(Boolean)
        .join(' ') || 'unknown',
  },
  { title: 'Owner', render: (d) => d.enrolmentInfo?.owner || 'unknown' },
  {
    title: 'Serial Number',
    render: (d) =>
      d.deviceInfo?.serial ||
      d.deviceInfo?.serialNumber ||
      d.properties?.find((p) => p.name === 'serial')?.value ||
      'unknown',
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
  {
    title: 'OS Version',
    render: (d) => d.deviceInfo?.osVersion || 'not-found',
  },
  { title: 'IMEI', render: (d) => d.deviceInfo?.imei || 'not-found' },
];
export default function Wizard({ uninstall = false }: { uninstall?: boolean }) {
  const loc = useLocation();
  const { deviceType = '' } = useParams();
  const app = getHandoff(loc.state?.handoff);
  if (!app) return <Navigate to="/" replace />;
  return (
    <>
      <Crumbs
        items={[
          {
            label: app.name,
            to: `/${deviceType}/apps/${app.applicationReleases[0].uuid}?appType=${app.type}`,
          },
          { label: uninstall ? 'Uninstall' : 'Install' },
        ]}
      />
      <Card className="wizard-card">
        <ReleaseReminder app={app} />
        <TargetPicker
          key={loc.pathname}
          app={app}
          deviceType={deviceType}
          uninstall={uninstall}
        />
      </Card>
    </>
  );
}
export function TargetPicker({
  app,
  deviceType,
  uninstall = false,
  firmware = false,
  onSubviewChange,
}: {
  app: Application;
  deviceType: string;
  uninstall?: boolean;
  firmware?: boolean;
  onSubviewChange?: (value: boolean) => void;
}) {
  const { has, username } = useSession();
  const { t } = useTranslation();
  const action = uninstall ? 'uninstall' : 'install';
  const uuid = app.applicationReleases[0].uuid;
  const permissions: Record<Identity, boolean> = {
    device: has(scope.devices),
    user: true,
    role: has(scope.roles),
    group: has(scope.groups) || has(scope.adminGroups),
  };
  const identities: Identity[] = firmware
    ? ['device', 'group']
    : ['device', 'user', 'role', 'group'];
  const visible = identities.filter(
    (x) => firmware || !has(scope.hide) || permissions[x],
  );
  const [tab, setTab] = useState<Identity>(visible[0] || 'user');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [devices, setDevices] = useState<Device[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>({});
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceOptions, setDeviceOptions] = useState<{
    ownerships: string[];
    statuses: string[];
  }>();
  const [scheduled, setScheduled] = useState(false);
  const [datetime, setDatetime] = useState('');
  const [block, setBlock] = useState(false);
  const [disableRepeat, setDisableRepeat] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [match, setMatch] = useState('APPLICABLE');
  const [groupDevices, setGroupDevices] = useState<Group>();
  useEffect(() => {
    if (has(scope.devices))
      void dm<{ ownerships: string[]; statuses: string[] }>('/devices/filters')
        .then(setDeviceOptions)
        .catch((e) =>
          problem(e, 'Error occurred while trying to retrieve device filters.'),
        );
  }, []);
  useEffect(() => {
    onSubviewChange?.(!!groupDevices);
  }, [groupDevices, onSubviewChange]);
  useEffect(() => {
    setSelected(new Set());
    setPage(1);
    setFilter({});
    setSearch('');
    setGroupDevices(undefined);
  }, [tab]);
  useEffect(() => {
    if (tab === 'user' && !has(scope.users)) {
      setOptions([username]);
      setSelected(new Set(uninstall ? [] : [username]));
      return;
    }
    if (!permissions[tab]) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      async function load() {
        try {
          if (tab === 'device' || groupDevices) {
            if (firmware) {
              const path = groupDevices
                ? `/firmware/${uuid}/groups/${groupDevices.id}/devices`
                : `/firmware/${uuid}/devices`;
              const result = await api<ListResult<Device>>(
                path,
                'GET',
                undefined,
                { matchType: match, offset: (page - 1) * 10, limit: 10 },
              );
              if (active) {
                setDevices(result.data);
                setCount(result.recordsFiltered ?? result.recordsTotal ?? 0);
              }
            } else if (uninstall) {
              const result = await api<ListResult<Device>>(
                `/subscription/${uuid}/devices`,
                'GET',
                undefined,
                { ...filter, offset: (page - 1) * 10, limit: 10 },
              );
              if (active) {
                setDevices(result.data);
                setCount(result.recordsFiltered ?? result.recordsTotal ?? 0);
              }
            } else {
              const result = await dm<{ devices: Device[]; count: number }>(
                '/devices',
                {
                  ...filter,
                  type: deviceType === 'web-clip' ? undefined : deviceType,
                  requireDeviceInfo: true,
                  offset: (page - 1) * 10,
                  limit: 10,
                },
              );
              if (active) {
                setDevices(result.devices);
                setCount(result.count);
              }
            }
          } else if (tab === 'user') {
            if (uninstall) {
              const result = await api<ListResult<string>>(
                `/subscription/${uuid}/USER`,
                'GET',
                undefined,
                { searchName: search, offset: 0, limit: 50 },
              );
              if (active) setOptions(result.data);
            } else {
              const result = await dm<{ users: { username: string }[] }>(
                '/users/search',
                { username: search, offset: 0, limit: 50 },
              );
              if (active) setOptions(result.users.map((u) => u.username));
            }
          } else if (tab === 'role') {
            if (uninstall) {
              const result = await api<ListResult<string>>(
                `/subscription/${uuid}/ROLE`,
                'GET',
                undefined,
                { searchName: search, offset: 0, limit: 50 },
              );
              if (active) setOptions(result.data);
            } else {
              const result = await dm<{ roles: string[] }>('/roles', {
                filter: search,
                offset: 0,
                limit: 50,
              });
              if (active) setOptions(result.roles);
            }
          } else {
            const result = await dm<{ deviceGroups: Group[] }>(
              (has(scope.adminGroups) ? '/admin' : '') + '/groups/hierarchy',
              { depth: 99, limit: 100, offset: 0 },
            );
            if (active) setGroups(result.deviceGroups);
          }
        } catch (e) {
          if (active) {
            problem(e);
            setDevices([]);
            setCount(0);
            setSelected(new Set());
          }
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [tab, page, search, filter, uuid, match, groupDevices]);
  const label = uninstall ? 'Uninstall' : 'Install';
  const forbidden = !permissions[tab];
  const canSubmit =
    has(scope.install) &&
    (tab === 'device' || groupDevices
      ? devices.some((d) => selected.has(String(d.id)))
      : selected.size > 0) &&
    (!scheduled || !!datetime) &&
    !forbidden &&
    match !== 'NON_APPLICABLE';
  async function submit() {
    setBusy(true);
    try {
      const groupMode = !!groupDevices;
      const identity = groupMode ? 'group' : tab;
      const payload = groupMode
        ? [groupDevices.name]
        : tab === 'device'
          ? devices
              .filter((d) => selected.has(String(d.id)))
              .map((d) => ({ id: d.deviceIdentifier, type: d.type }))
          : [...selected];
      await api(
        subscriptionPath(
          uuid,
          identity,
          action,
          !firmware && !!app.isAndroidEnterpriseApp,
        ),
        'POST',
        payload,
        {
          timestamp: scheduled ? new Date(datetime).getTime() : 0,
          ...(!uninstall && app.type !== 'WEB_CLIP'
            ? { 'block-uninstall': block }
            : {}),
          ...(identity !== 'device'
            ? { 'disable-operation-re-executing': disableRepeat }
            : {}),
          ...(!firmware && app.isAndroidEnterpriseApp
            ? { requiresUpdatingExternal: true }
            : {}),
        },
      );
      done();
      setConfirm(false);
    } catch (e) {
      problem(e);
    } finally {
      setBusy(false);
    }
  }
  function tree(nodes: Group[], depth = 0): React.ReactNode {
    return nodes
      .filter(
        (g) =>
          !search ||
          g.name.toLowerCase().includes(search.toLowerCase()) ||
          g.childrenGroups?.length,
      )
      .map((g) => (
        <div
          key={g.id}
          className="group-node"
          style={{ marginLeft: depth * 18 }}
        >
          <Check
            value={selected.has(g.name)}
            onChange={(v) => {
              const next = new Set(selected);
              v ? next.add(g.name) : next.delete(g.name);
              setSelected(next);
            }}
          >
            {g.name}
          </Check>
          {firmware && (
            <Button
              variant="ghost"
              onPress={() => {
                setGroupDevices(g);
                setSelected(new Set());
                setPage(1);
              }}
            >
              Device
            </Button>
          )}
          {g.childrenGroups && tree(g.childrenGroups, depth + 1)}
        </div>
      ));
  }
  const flatten = (nodes: Group[]): Group[] =>
    nodes.flatMap((g) => [g, ...flatten(g.childrenGroups || [])]);
  const visibleGroups = flatten(groups).filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="target-picker">
      <TabBar
        items={visible.map((id) => ({
          id,
          label: id[0].toUpperCase() + id.slice(1),
        }))}
        value={tab}
        onChange={(v) => setTab(v as Identity)}
      />
      {uninstall && app.type === 'WEB_CLIP' && (
        <p className="warning">
          {t(
            'Web clips cannot be uninstalled on the latest versions of Android OS.',
          )}
        </p>
      )}
      {tab === 'device' && (
        <p>
          {t(
            uninstall
              ? 'Start uninstalling the application for devices by selecting the corresponding devices. Select uninstall to automatically start uninstalling the application for the respective devices.'
              : 'Start installing the application for devices by selecting the corresponding devices. Select install to automatically start downloading the application for the respective devices.',
          )}
        </p>
      )}
      {tab === 'user' && (
        <p>
          {uninstall
            ? 'Start uninstalling the application for one or more users by selecting the corresponding user name.'
            : 'Start installing the application for one or more users by selecting the corresponding user name.'}
        </p>
      )}
      {tab === 'role' && (
        <p>
          Start {uninstall ? 'uninstalling' : 'installing'} the application for
          one or more roles by entering the corresponding role name.
        </p>
      )}
      {tab === 'group' && (
        <p>
          Start {uninstall ? 'uninstalling' : 'installing'} the application for
          one or more groups by entering the corresponding group name.
        </p>
      )}
      {forbidden ? (
        <Forbidden
          message={`You don't have permission to view ${tab === 'device' ? 'devices' : tab === 'role' ? 'roles' : 'groups'}.`}
        />
      ) : (
        <>
          {groupDevices && (
            <Button
              variant="ghost"
              onPress={() => {
                setGroupDevices(undefined);
                setSelected(new Set());
              }}
            >
              Back
            </Button>
          )}
          {(tab === 'device' || groupDevices) && (
            <>
              {firmware && (
                <TabBar
                  value={match}
                  onChange={(v) => {
                    setMatch(v);
                    setSelected(new Set());
                    setPage(1);
                  }}
                  items={[
                    { id: 'APPLICABLE', label: 'Applicable Device' },
                    { id: 'NON_APPLICABLE', label: 'Inapplicable Devices' },
                    { id: 'UNMANAGED', label: 'Unmanaged Devices' },
                  ]}
                />
              )}
              <EntgraSearchFilter
                title="Search Devices"
                variant="common"
                criteria={deviceCriteria.map((c) => ({
                  ...c,
                  options:
                    c.key === 'status'
                      ? deviceOptions?.statuses || c.options
                      : c.key === 'ownership'
                        ? deviceOptions?.ownerships || c.options
                        : c.options,
                }))}
                onSearch={(f) => {
                  setFilter(f);
                  setSelected(new Set());
                  setPage(1);
                }}
              />
              <EntgraTable
                rows={devices}
                columns={deviceColumns}
                rowKey={(d) => String(d.id)}
                selected={selected}
                onSelect={setSelected}
                page={page}
                onPage={(p) => {
                  setSelected(new Set());
                  setPage(p);
                }}
                total={count}
                loading={loading}
              />
            </>
          )}
          {tab !== 'device' && !groupDevices && (
            <div className="identity-picker">
              {tab === 'group' ? (
                <>
                  <Input
                    aria-label="Search"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {firmware ? (
                    <>
                      <div className="firmware-groups">
                        {visibleGroups
                          .slice((page - 1) * 6, page * 6)
                          .map((g) => (
                            <Card key={g.id}>
                              <Avatar>
                                <Avatar.Fallback>{g.name[0]}</Avatar.Fallback>
                              </Avatar>
                              <h3>{g.name}</h3>
                              <Button
                                variant="ghost"
                                onPress={() => {
                                  setGroupDevices(g);
                                  setSelected(new Set());
                                  setPage(1);
                                }}
                              >
                                {t('Device')}
                              </Button>
                            </Card>
                          ))}
                      </div>
                      <Pager
                        page={page}
                        total={visibleGroups.length}
                        size={6}
                        onChange={setPage}
                      />
                    </>
                  ) : (
                    tree(groups)
                  )}
                </>
              ) : (
                <MultiChoice
                  label={t(tab === 'role' ? 'Search roles' : 'Select users')}
                  options={options}
                  selected={selected}
                  onChange={setSelected}
                  onSearch={setSearch}
                  disabled={tab === 'user' && !has(scope.users)}
                />
              )}
              {uninstall && tab === 'user' && !has(scope.users) && (
                <p className="warning">R</p>
              )}
            </div>
          )}
        </>
      )}
      <div className="wizard-actions">
        {!uninstall && tab !== 'device' && (
          <Check value={disableRepeat} onChange={setDisableRepeat}>
            {t('Disable operation re-executing')}
          </Check>
        )}
        {!uninstall && app.type !== 'WEB_CLIP' && (
          <Check value={block} onChange={setBlock}>
            {t('Block Uninstall')}
          </Check>
        )}
        <Check value={scheduled} onChange={setScheduled}>
          {t(uninstall ? 'Schedule Uninstall' : 'Schedule Install')}
        </Check>
        {scheduled && (
          <Input
            aria-label={t(
              uninstall ? 'Schedule Uninstall' : 'Schedule Install',
            )}
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
        )}
        <Button
          isDisabled={!canSubmit}
          isPending={busy}
          onPress={() =>
            app.type === 'WEB_CLIP' || match === 'UNMANAGED'
              ? setConfirm(true)
              : submit()
          }
        >
          {t(label)}
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={
          match === 'UNMANAGED'
            ? 'Are you sure you want to install this firmware on unmanaged devices?'
            : `Are you sure you want to ${action}?`
        }
        footer={
          <>
            <Button variant="secondary" onPress={() => setConfirm(false)}>
              {t('No')}
            </Button>
            <Button isPending={busy} onPress={submit}>
              {t('Yes')}
            </Button>
          </>
        }
      >
        {uninstall && app.type === 'WEB_CLIP'
          ? 'Web clips cannot be uninstalled on the latest versions of Android OS.'
          : `Are you sure you want to ${action}?`}
      </Dialog>
    </div>
  );
}
