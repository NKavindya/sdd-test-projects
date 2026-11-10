import EntgraTable from '@entgra-ui/antd/entgra_ui/components/EntgraTable';
import DeviceSearch from '../../../../../components/DeviceSearch';
import { useEffect, useRef, useState } from 'react';
import {
  App,
  Button,
  Checkbox,
  DatePicker,
  Modal,
  Select,
  Space,
  Tabs,
  TreeSelect,
  Typography,
  Spin,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useResource } from '../../../../../services/useResource';
import { readPath, scopes } from '../../../../../common/contracts';
import {
  ErrorState,
  Permission,
  Warning,
  useFeedback,
} from '../../../../../components/States';
import { SpecificationGap } from '../../../../../services/api';

function Selector({
  kind,
  uuid,
  action,
  firmware,
  groupId,
  deviceType,
  selected,
  setSelected,
  matchType,
}) {
  const { api, config, user, can } = useStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState({});
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const allowed =
    kind === 'Group'
      ? can(scopes.groups) || can(scopes.adminGroups)
      : can(scopes[{ Device: 'devices', User: 'users', Role: 'roles' }[kind]]);
  const currentUserFallback = kind === 'User' && !allowed;
  const resource = useResource(
    async (signal) => {
      if (firmware && kind === 'Device')
        return api.firmwareDevices(
          uuid,
          groupId,
          { matchType, offset: (page - 1) * 10, limit: 10 },
          signal,
        );
      if (action === 'uninstall')
        return api.candidates(
          uuid,
          kind,
          { searchName: search.name, offset: (page - 1) * 10, limit: 10 },
          signal,
        );
      return api.reference(
        {
          Device: 'devices',
          User: 'users',
          Role: 'roles',
          Group: can(scopes.adminGroups) ? 'adminGroups' : 'groups',
        }[kind],
        {
          ...(kind === 'Role' ? { filter: search.filter } : {}),
          ...(kind === 'Device'
            ? {
                ...search,
                type: deviceType,
                requireDeviceInfo: true,
                offset: (page - 1) * 10,
                limit: 10,
              }
            : {}),
          ...(kind === 'Group' ? { depth: 99 } : {}),
          ...(kind === 'User' ? { username: search.username } : {}),
        },
        signal,
      );
    },
    [kind, uuid, action, search, page, matchType, groupId, deviceType],
    allowed || (firmware && kind === 'Device' && can(scopes.firmware)),
  );
  const { notification } = App.useApp();
  const reportedError = useRef(null);
  useEffect(() => {
    if (
      resource.error &&
      resource.error !== reportedError.current &&
      kind === 'Device'
    ) {
      reportedError.current = resource.error;
      setSelected([]);
      notification.error({ message: t('There was a problem') });
    }
  }, [resource.error, notification, t, kind, setSelected]);
  useEffect(() => {
    if (!resource.data) return;
    const data = resource.data.rows || resource.data.data || [];
    if (kind === 'Device') {
      const mapping = config.contracts?.deviceFields;
      if (!mapping && !firmware && action === 'install') return;
      setRows(
        data.map((row) =>
          mapping
            ? Object.fromEntries(
                Object.entries(mapping).map(([field, path]) => [
                  field,
                  readPath(row, path),
                ]),
              )
            : row,
        ),
      );
    } else {
      const binding =
        resource.data.binding ||
        config.contracts?.[`${kind.toLowerCase()}Candidates`];
      const mapOption = (row) => {
        if (typeof row === 'string')
          return { value: row, title: row, label: row };
        if (!binding?.value || !binding?.label) return null;
        const value = readPath(row, binding.value);
        return {
          value,
          title: readPath(row, binding.label),
          label: readPath(row, binding.label),
          children:
            binding.children &&
            readPath(row, binding.children)?.map(mapOption).filter(Boolean),
        };
      };
      setOptions(data.map(mapOption).filter(Boolean));
    }
  }, [resource.data, kind, config, firmware, action]);
  if (currentUserFallback)
    return (
      <>
        <Typography.Paragraph>{user.username}</Typography.Paragraph>
        {action === 'uninstall' && <Warning>R</Warning>}
        <Select
          mode="multiple"
          className="wide"
          disabled
          value={action === 'install' ? [user.username] : []}
        />
      </>
    );
  if (!allowed && !(firmware && can(scopes.firmware)))
    return (
      <Permission>{`You don't have permission to view ${kind === 'Device' ? 'devices' : kind === 'Group' ? 'groups' : kind === 'Role' ? 'roles' : 'users'}.`}</Permission>
    );
  if (resource.error && kind !== 'Device')
    return <ErrorState error={resource.error} />;
  if (kind === 'Device')
    return (
      <>
        <DeviceSearch
          apply={(values) => {
            setSearch(values);
            setPage(1);
            setSelected([]);
          }}
        />
        <Spin spinning={resource.loading}>
          <div className="device-table">
            <EntgraTable
              rowKey="id"
              rowSelection={
                matchType !== 'NON_APPLICABLE'
                  ? {
                      selectedRowKeys: selected.map((row) => row.id),
                      onChange: (_, devices) => setSelected(devices),
                      preserveSelectedRowKeys: false,
                    }
                  : undefined
              }
              data={resource.error ? [] : rows}
              columns={[
                { title: t('Device'), name: 'name' },
                {
                  title: t('Model'),
                  name: 'model',
                  render: (value) => value || t('unknown'),
                },
                { title: t('Owner'), name: 'owner' },
                {
                  title: t('Serial Number'),
                  name: 'serialNumber',
                  render: (value) => value || t('unknown'),
                },
                {
                  title: t('Last Updated'),
                  name: 'lastUpdated',
                  render: (value) =>
                    value ? new Date(value).toLocaleString() : '',
                },
                { title: t('Status'), name: 'status' },
                { title: t('Ownership'), name: 'ownership' },
                {
                  title: t('OS Version'),
                  name: 'osVersion',
                  render: (value) => value || t('unknown'),
                },
                {
                  title: t('IMEI'),
                  name: 'imei',
                  render: (value) => value || t('not-found'),
                },
              ]}
              pagination={{
                current: page,
                pageSize: 10,
                total: resource.data?.count || resource.data?.recordsTotal || 0,
                showSizeChanger: false,
                showTotal: (total, range) =>
                  t('showing {{start}}–{{end}} of {{total}} devices', {
                    start: range[0],
                    end: range[1],
                    total,
                  }),
                onChange: (value) => {
                  setPage(value);
                  setSelected([]);
                },
              }}
            />
          </div>
        </Spin>
      </>
    );
  return kind === 'Group' ? (
    <TreeSelect
      className="wide"
      treeCheckable
      treeData={options}
      value={selected}
      loading={resource.loading}
      onChange={setSelected}
    />
  ) : (
    <Select
      className="wide"
      mode="multiple"
      showSearch
      options={options}
      value={selected}
      loading={resource.loading}
      onSearch={(value) =>
        setSearch(kind === 'Role' ? { filter: value } : { username: value })
      }
      onChange={setSelected}
      placeholder={t(kind === 'User' ? 'Enter the username' : 'Search roles')}
    />
  );
}

export default function OperationForm({
  app,
  release,
  action = 'install',
  firmware = false,
  groupId,
}) {
  const { api, can, user, config } = useStore();
  const { t } = useTranslation();
  const feedback = useFeedback();
  const [kind, setKind] = useState('Device');
  const [selected, setSelected] = useState([]);
  const [schedule, setSchedule] = useState(false);
  const [date, setDate] = useState(null);
  const [block, setBlock] = useState(false);
  const [reexecute, setReexecute] = useState(false);
  const [matchType, setMatchType] = useState('APPLICABLE');
  const [busy, setBusy] = useState(false);
  const webClip = app.type === 'WEB_CLIP';
  const kinds = firmware
    ? ['Device', 'Group']
    : ['Device', 'User', 'Role', 'Group'].filter(
        (item) =>
          !can(scopes.hideFunctions) ||
          (item === 'Group'
            ? can(scopes.groups) || can(scopes.adminGroups)
            : can(
                scopes[
                  { Device: 'devices', User: 'users', Role: 'roles' }[item]
                ],
              )),
      );
  const active = kinds.includes(kind) ? kind : kinds[0];
  const identities =
    active === 'User' && !can(scopes.users) && action === 'install'
      ? [user.username]
      : selected;
  const changeKind = (value) => {
    setKind(value);
    setSelected([]);
    setReexecute(false);
  };
  const submit = async () => {
    setBusy(true);
    try {
      if (schedule && !config.contracts?.scheduleTimestampUnit)
        throw new SpecificationGap(
          'Scheduled timestamp units require confirmation.',
        );
      const timestamp = schedule
        ? config.contracts.scheduleTimestampUnit === 'milliseconds'
          ? date.valueOf()
          : config.contracts.scheduleTimestampUnit === 'seconds'
            ? date.unix()
            : null
        : undefined;
      if (schedule && timestamp == null)
        throw new SpecificationGap('Unsupported scheduled timestamp unit.');
      const enterprise = !firmware && app.isAndroidEnterpriseApp;
      if (enterprise && config.contracts?.requiresUpdatingExternal == null)
        throw new SpecificationGap(
          'AE external-update flag requires confirmation.',
        );
      if (active === 'Device' && identities.some((row) => !row.identifier))
        throw new SpecificationGap('Missing mapped device identifier.');
      await api.operation({
        uuid: release.uuid,
        kind: active,
        action,
        identities:
          active === 'Device'
            ? identities.map((row) => ({
                id: row.identifier,
                type: firmware ? 'android' : app.deviceType,
              }))
            : identities,
        enterprise,
        requiresUpdatingExternal: enterprise
          ? config.contracts.requiresUpdatingExternal
          : undefined,
        timestamp,
        blockUninstall: webClip ? undefined : block,
        disableReexecute: reexecute,
      });
      feedback.success();
    } catch (error) {
      feedback.error(error);
    } finally {
      setBusy(false);
    }
  };
  const confirm = () => {
    if (webClip || matchType === 'UNMANAGED')
      Modal.confirm({
        title: t(
          matchType === 'UNMANAGED'
            ? 'Are you sure you want to install this firmware on unmanaged devices?'
            : 'Are you sure you want to install?',
        ),
        okText: t('Done'),
        cancelText: t('Cancel'),
        onOk: submit,
      });
    else submit();
  };
  if (!active) return <Permission />;
  return (
    <>
      <Tabs
        activeKey={active}
        onChange={changeKind}
        items={kinds.map((value) => ({ key: value, label: t(value) }))}
      />
      {webClip && action === 'uninstall' && (
        <Warning>
          Web clips cannot be uninstalled on the latest versions of Android OS.
        </Warning>
      )}
      {firmware && active === 'Device' && (
        <Tabs
          activeKey={matchType}
          onChange={(value) => {
            setMatchType(value);
            setSelected([]);
          }}
          items={[
            { key: 'APPLICABLE', label: t('Applicable Device') },
            { key: 'NON_APPLICABLE', label: t('Inapplicable Devices') },
            { key: 'UNMANAGED', label: t('Unmanaged Devices') },
          ]}
        />
      )}
      {active === 'Device' && (
        <Typography.Paragraph className="wizard-intro">
          {t(
            action === 'install'
              ? 'Start installing the application for devices by selecting the corresponding devices. Select install to automatically start downloading the application for the respective devices.'
              : 'Start uninstalling the application for devices by selecting the corresponding devices. Select uninstall to automatically start uninstalling the application for the respective devices.',
          )}
        </Typography.Paragraph>
      )}
      <div className="operation-footer">
        <Space wrap>
          {action === 'install' && active !== 'Device' && (
            <Checkbox
              checked={reexecute}
              onChange={(event) => setReexecute(event.target.checked)}
            >
              {t('Disable operation re-executing')}
            </Checkbox>
          )}
          {action === 'install' && !webClip && (
            <Checkbox
              checked={block}
              onChange={(event) => setBlock(event.target.checked)}
            >
              {t('Block uninstall')}
            </Checkbox>
          )}
          <Checkbox
            checked={schedule}
            onChange={(event) => setSchedule(event.target.checked)}
          >
            {t(
              action === 'install' ? 'Schedule install' : 'Schedule uninstall',
            )}
          </Checkbox>
          {schedule && <DatePicker showTime value={date} onChange={setDate} />}
          <Button
            type="primary"
            loading={busy}
            disabled={
              identities.length === 0 ||
              (schedule && !date) ||
              (firmware && matchType === 'NON_APPLICABLE')
            }
            onClick={confirm}
          >
            {t(action === 'install' ? 'Install' : 'Uninstall')}
          </Button>
        </Space>
      </div>
      <Selector
        key={`${active}-${matchType}`}
        kind={active}
        uuid={release.uuid}
        action={action}
        firmware={firmware}
        groupId={groupId}
        deviceType={firmware ? 'android' : app.deviceType}
        selected={selected}
        setSelected={setSelected}
        matchType={matchType}
      />
    </>
  );
}
