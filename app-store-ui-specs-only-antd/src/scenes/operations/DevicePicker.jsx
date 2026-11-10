import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { devices, store, showError } from '../../services/api';
import { deviceValue, toLocalTime, scopes } from '../../services/contracts';
import { useStore } from '../../services/context';
import EntgraTable from '../../shared/EntgraTable';
import { FilterPanel as EntgraSearchFilter } from '../../shared/EntgraSearchFilter';
import { Permission } from '../../shared/Feedback';
export function deviceColumns(t) {
  return [
    { title: t('Device'), dataIndex: 'name' },
    {
      title: t('Model'),
      render: (_, d) =>
        [deviceValue(d, 'vendor'), deviceValue(d, 'deviceModel')]
          .filter(Boolean)
          .join(' ') || 'unknown',
    },
    {
      title: t('Owner'),
      render: (_, d) => d.enrolmentInfo?.owner || 'unknown',
    },
    {
      title: t('Serial Number'),
      render: (_, d) =>
        deviceValue(d, 'serial') || deviceValue(d, 'serialNumber') || 'unknown',
    },
    {
      title: t('Last Updated'),
      render: (_, d) => toLocalTime(d.lastUpdatedTimeStamp),
    },
    {
      title: t('Status'),
      render: (_, d) => d.enrolmentInfo?.status || 'unknown',
    },
    {
      title: t('Ownership'),
      render: (_, d) => d.enrolmentInfo?.ownership || 'unknown',
    },
    {
      title: t('OS Version'),
      render: (_, d) => deviceValue(d, 'osVersion') || 'not-found',
    },
    {
      title: t('IMEI'),
      render: (_, d) => deviceValue(d, 'imei') || 'not-found',
    },
  ];
}
export default function DevicePicker({
  uuid,
  deviceType,
  action = 'install',
  selected,
  onSelection,
  firmware = false,
  matchType = 'APPLICABLE',
  groupId,
}) {
  const { t } = useTranslation();
  const { has } = useStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [options, setOptions] = useState({});
  const generation = useRef(0);
  const allowed = firmware ? has(scopes.firmware) : has(scopes.device);
  useEffect(() => {
    if (!allowed) return;
    devices('/devices/filters')
      .then(setOptions)
      .catch((e) =>
        showError(e, 'Error occurred while trying to retrieve device filters.'),
      );
  }, [allowed]);
  const load = useCallback(async () => {
    if (!allowed) return;
    const id = ++generation.current;
    setLoading(true);
    try {
      const params = {
        ...filter,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      };
      let response;
      if (firmware) {
        response = await store(
          'GET',
          groupId
            ? `/firmware/${uuid}/groups/${groupId}/devices`
            : `/firmware/${uuid}/devices`,
          undefined,
          { ...params, matchType },
        );
      } else if (action === 'uninstall')
        response = await store(
          'GET',
          `/subscription/${uuid}/devices`,
          undefined,
          params,
        );
      else
        response = await devices('/devices', {
          ...params,
          type: deviceType === 'web-clip' ? undefined : deviceType,
          requireDeviceInfo: true,
        });
      if (id !== generation.current) return;
      setRows(response.devices || response.data || []);
      setTotal(
        response.count ??
          response.recordsFiltered ??
          response.recordsTotal ??
          0,
      );
      setForbidden(false);
    } catch (error) {
      if (id === generation.current) {
        setForbidden(error.response?.status === 403);
        showError(error);
      }
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, [
    allowed,
    uuid,
    deviceType,
    action,
    JSON.stringify(filter),
    page,
    pageSize,
    firmware,
    matchType,
    groupId,
  ]);
  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [load]);
  if (!allowed || forbidden)
    return <Permission message="You don't have permission to view devices." />;
  const criteria = [
    ...(action === 'install' && !firmware
      ? [{ key: 'name', label: 'Device Name', type: 'text' }]
      : []),
    { key: 'user', label: 'Owner', type: 'text' },
    {
      key: 'status',
      label: 'Status',
      type: 'multiple',
      options: options.statuses || [],
    },
    {
      key: 'ownership',
      label: 'Ownership',
      type: 'choice',
      options: options.ownerships || [],
    },
    { key: 'serialNumber', label: 'Serial Number', type: 'text' },
  ];
  return (
    <>
      <EntgraSearchFilter
        title="Search Devices"
        variant="common"
        criteria={criteria}
        contextId={`${uuid}-${action}-${matchType}-${groupId || ''}`}
        onResult={(value) => {
          setFilter(value);
          setPage(1);
        }}
      />
      <div className="table-overflow">
        <EntgraTable
          columns={deviceColumns(t)}
          records={rows}
          rowKey="deviceIdentifier"
          loading={loading}
          rowSelection={
            matchType === 'NON_APPLICABLE'
              ? undefined
              : {
                  selectedRowKeys: selected.map((d) => d.deviceIdentifier),
                  preserveSelectedRowKeys: true,
                  onChange: (_, records) =>
                    onSelection(records.filter(Boolean)),
                }
          }
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, size) => {
              setPage(p);
              setPageSize(size);
            },
            showTotal: (count, range) =>
              t('showing {{range1}}-{{range2}} of {{total}} devices', {
                range1: range[0],
                range2: range[1],
                total: count,
              }),
          }}
        />
      </div>
    </>
  );
}
