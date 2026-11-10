import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { store, showError } from '../../services/api';
import { scopes, devicePayload, toLocalTime } from '../../services/contracts';
import EntgraTable from '../../shared/EntgraTable';
import { FilterPanel as EntgraSearchFilter } from '../../shared/EntgraSearchFilter';
const titles = { device: 'Device', user: 'User', role: 'Role', group: 'Group' };
export default function Subscriptions({
  uuid,
  firmware = false,
  initialCounts,
}) {
  const { t } = useTranslation();
  const { has } = useStore();
  const [counts, setCounts] = useState(initialCounts || []);
  const [countsLoading, setCountsLoading] = useState(!initialCounts);
  const [selection, setSelection] = useState(null);
  const [identifier, setIdentifier] = useState(null);
  const [identities, setIdentities] = useState([]);
  const [identitySearch, setIdentitySearch] = useState('');
  const [rows, setRows] = useState([]);
  const [lane, setLane] = useState('COMPLETED');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [checked, setChecked] = useState([]);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState({});
  const [operations, setOperations] = useState({});
  const loadCounts = useCallback(async () => {
    if (!has(scopes.subView)) return;
    setCountsLoading(true);
    try {
      setCounts(
        await store('GET', `/admin/subscription/${uuid}/subscriptions/count`),
      );
    } catch (error) {
      showError(
        error,
        'Error occurred while trying to load subscription types.',
      );
    } finally {
      setCountsLoading(false);
    }
  }, [uuid]);
  useEffect(() => {
    setSelection(null);
    setIdentifier(null);
    setRows([]);
    if (initialCounts) {
      setCounts(initialCounts);
      setCountsLoading(false);
    } else loadCounts();
  }, [loadCounts, initialCounts]);
  const fetchRows = useCallback(async () => {
    if (!selection || !has(scopes.subView)) return;
    setBusy(true);
    try {
      const { type, status } = selection;
      const params = {
        ...filter,
        subscriptionStatus: status,
        offset: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (type !== 'device' && !identifier) {
        const result = await store(
          'GET',
          `/admin/subscription/${uuid}/subscriptions/${type}`,
          undefined,
          { ...params, searchName: identitySearch },
        );
        setIdentities(result.data || []);
        setTotal(result.count || 0);
      } else {
        const result = await store(
          'GET',
          `/admin/subscription/${uuid}/subscriptions/${type}/devices/${lane}`,
          undefined,
          { ...params, ...(identifier ? { identifier } : {}) },
        );
        setRows(result.data || []);
        setTotal(result.count || 0);
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }, [
    uuid,
    selection,
    identifier,
    lane,
    page,
    pageSize,
    JSON.stringify(filter),
    identitySearch,
  ]);
  useEffect(() => {
    fetchRows();
  }, [fetchRows]);
  useEffect(() => {
    setChecked([]);
  }, [selection, identifier, lane, page]);
  async function retry(records) {
    try {
      await store(
        'POST',
        `/subscription/${uuid}/devices/${selection.status === 'unsubscribed' ? 'uninstall' : 'install'}`,
        devicePayload(records),
      );
      message.success(`${t('Done!')} ${t('Installation retry successful!')}`);
      await fetchRows();
      await loadCounts();
    } catch (error) {
      showError(error);
    }
  }
  async function editStatus(row) {
    try {
      await store(
        'PUT',
        `/admin/subscription/device/${row.deviceId || row.device?.id}/status`,
        {
          subId: row.subId,
          status: 'ERROR',
          deviceIdentifier:
            row.deviceIdentifier || row.device?.deviceIdentifier,
        },
      );
      message.success(t('Operation updated successfully'));
      await fetchRows();
    } catch (error) {
      showError(error);
    }
  }
  async function expand(expanded, row) {
    if (!expanded) return;
    try {
      const result = await store(
        'GET',
        `/admin/subscription/devices/${row.deviceId || row.device?.id}/operations/${uuid}`,
      );
      setOperations((prev) => ({
        ...prev,
        [row.subId || row.deviceId]: result.DevicesOperations || [],
      }));
    } catch (error) {
      showError(error);
    }
  }
  const columns = useMemo(
    () => [
      {
        title: t('Device'),
        render: (_, row) => {
          const d = row.device || row;
          return (
            <a
              href={`/endpoint-mgt/devices/${encodeURIComponent(d.type)}/${encodeURIComponent(d.deviceIdentifier)}/info`}
              target="_blank"
              rel="noreferrer"
            >
              {d.name || row.deviceName}
              <LinkOutlined />
            </a>
          );
        },
      },
      {
        title: t('Owner'),
        render: (_, r) => r.deviceOwner || r.device?.enrolmentInfo?.owner,
      },
      ...(lane === 'NEW'
        ? [
            {
              title: t('Ownership'),
              render: (_, r) => r.device?.enrolmentInfo?.ownership,
            },
          ]
        : [
            { title: t('Action type'), dataIndex: 'actionType' },
            { title: t('Triggered by'), dataIndex: 'actionTriggeredBy' },
            {
              title: t('Action triggered at'),
              dataIndex: 'actionTriggeredTimestamp',
              render: toLocalTime,
            },
            {
              title: t('Action status'),
              render: (_, row) => (
                <Space wrap>
                  <Tag
                    color={
                      row.status === 'ERROR'
                        ? 'red'
                        : row.status === 'COMPLETED'
                          ? 'green'
                          : 'orange'
                    }
                  >
                    {row.status}
                  </Tag>
                  {lane === 'ERROR' && has(scopes.install) && (
                    <Popconfirm
                      title={t('Are you sure to retry this installation?')}
                      okText={t('Yes')}
                      cancelText={t('No')}
                      onConfirm={() => retry([row])}
                    >
                      <Button type="link">{t('Retry')}</Button>
                    </Popconfirm>
                  )}
                  {['PENDING', 'IN_PROGRESS'].includes(row.status) &&
                    has(scopes.subModify) && (
                      <Popconfirm
                        title={t(
                          'Are you sure change this status from {{status}} to {{selectedStatus}}?',
                          { status: row.status, selectedStatus: 'ERROR' },
                        )}
                        onConfirm={() => editStatus(row)}
                      >
                        <Button type="link" danger>
                          {t('Error')}
                        </Button>
                      </Popconfirm>
                    )}
                </Space>
              ),
            },
          ]),
      {
        title: t('Device status'),
        render: (_, r) => r.deviceStatus || r.device?.enrolmentInfo?.status,
      },
    ],
    [t, lane, selection, uuid],
  );
  if (!has(scopes.subView))
    return (
      <Alert
        type="warning"
        showIcon
        message={t("You don't have permission to view subscription details")}
      />
    );
  const selectionIsDevices =
    selection && (selection.type === 'device' || identifier);
  return (
    <Spin spinning={countsLoading}>
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
          ).map((type) => {
            const item = counts.find(
              (x) => x.subscriptionType.toLowerCase() === type,
            );
            return (
              <Card size="small" title={t(titles[type])} key={type}>
                {[
                  ['subscribed', 'Installed', item?.subscriptionCount || 0],
                  [
                    'unsubscribed',
                    'Uninstalled',
                    item?.unsubscriptionCount || 0,
                  ],
                ].map(([status, label, count]) => (
                  <Tooltip
                    key={status}
                    title={
                      !count && status === 'unsubscribed' && type === 'device'
                        ? t(
                            'Currently, you have not unsubscribed any devices from this application.',
                          )
                        : !count && type !== 'device'
                          ? t('You cannot select this option.')
                          : undefined
                    }
                  >
                    <span>
                      <Button
                        className="subscription-count"
                        type={
                          selection?.type === type &&
                          selection?.status === status
                            ? 'primary'
                            : 'text'
                        }
                        disabled={!count}
                        onClick={() => {
                          setSelection({ type, status });
                          setIdentifier(null);
                          setIdentities([]);
                          setRows([]);
                          setPage(1);
                          setLane('COMPLETED');
                          setFilter({});
                          setIdentitySearch('');
                        }}
                      >
                        {t(label)}: {count}
                      </Button>
                    </span>
                  </Tooltip>
                ))}
              </Card>
            );
          })}
        </aside>
        <div className="subscription-main">
          {!selection ? (
            <div className="subscription-guidance">
              <Empty
                description={
                  <>
                    <Typography.Title level={4}>
                      {t('Select to view details.')}
                    </Typography.Title>
                    <p>
                      {t(
                        'Please select a device, group, role, or user to view installation/uninstallation details.',
                      )}
                    </p>
                  </>
                }
              />
            </div>
          ) : !selectionIsDevices ? (
            <>
              <Input.Search
                placeholder={`Search ${selection.type}s...`}
                onSearch={(value) => {
                  setIdentitySearch(value);
                  setPage(1);
                }}
              />
              <List
                loading={busy}
                dataSource={identities}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: setPage,
                }}
                renderItem={(row) => (
                  <List.Item>
                    <Button
                      type="link"
                      disabled={selection.type === 'group'}
                      onClick={() => {
                        setIdentifier(row.name || row.owner);
                        setPage(1);
                      }}
                    >
                      {row.name || row.owner}
                    </Button>
                  </List.Item>
                )}
              />
            </>
          ) : (
            <>
              <Typography.Title
                level={4}
              >{`${selection.status === 'subscribed' ? 'Subscribed' : 'Unsubscribed'} ${titles[selection.type]} Subscriptions`}</Typography.Title>
              {identifier && (
                <Button type="link" onClick={() => setIdentifier(null)}>
                  {t('Back')}
                </Button>
              )}
              <Tabs
                activeKey={lane}
                onChange={(value) => {
                  setLane(value);
                  setPage(1);
                  setFilter({});
                }}
                items={(firmware
                  ? ['COMPLETED', 'PENDING', 'ERROR']
                  : ['COMPLETED', 'PENDING', 'ERROR', 'NEW']
                ).map((key) => ({
                  key,
                  label: t(
                    {
                      COMPLETED: 'Completed',
                      PENDING: 'Pending',
                      ERROR: 'Error',
                      NEW: 'New',
                    }[key],
                  ),
                }))}
              />
              <EntgraSearchFilter
                variant="common"
                title="Search Devices"
                tabId={lane}
                onResult={(value) => {
                  setFilter(value);
                  setPage(1);
                }}
                criteria={[
                  { key: 'status', label: 'Status', type: 'text' },
                  { key: 'actionStatus', label: 'Action status', type: 'text' },
                ]}
              />
              {lane === 'ERROR' && has(scopes.install) && (
                <Tooltip
                  title={
                    !checked.length
                      ? t('Please select a device to retry')
                      : undefined
                  }
                >
                  <span>
                    <Popconfirm
                      disabled={!checked.length}
                      title={t('Are you sure to retry this installation?')}
                      okText={t('Yes')}
                      cancelText={t('No')}
                      onConfirm={() => retry(checked)}
                    >
                      <Button disabled={!checked.length}>
                        {t('Retry Installation')}
                      </Button>
                    </Popconfirm>
                  </span>
                </Tooltip>
              )}
              <div className="table-overflow">
                <EntgraTable
                  columns={columns}
                  records={rows}
                  rowKey={(r) => r.subId || r.deviceId || r.device?.id}
                  loading={busy}
                  rowSelection={
                    lane === 'ERROR'
                      ? {
                          onChange: (_, records) => setChecked(records),
                          selectedRowKeys: checked.map(
                            (r) => r.subId || r.deviceId || r.device?.id,
                          ),
                        }
                      : undefined
                  }
                  expandable={{
                    onExpand: expand,
                    expandedRowRender: (row) => {
                      const details = operations[row.subId || row.deviceId];
                      return !details?.length ? (
                        t('No Details')
                      ) : (
                        <EntgraTable
                          columns={[
                            { title: t('Status'), dataIndex: 'status' },
                            {
                              title: t('Action triggered at'),
                              dataIndex: 'actionTriggeredAt',
                              render: toLocalTime,
                            },
                          ]}
                          records={details}
                          rowKey="operationId"
                        />
                      );
                    },
                  }}
                  pagination={{
                    current: page,
                    pageSize,
                    total,
                    onChange: (p, size) => {
                      setPage(p);
                      setPageSize(size);
                    },
                    showTotal: (n, range) =>
                      t('showing {{range1}}-{{range2}} of {{total}} devices', {
                        range1: range[0],
                        range2: range[1],
                        total: n,
                      }),
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </Spin>
  );
}
