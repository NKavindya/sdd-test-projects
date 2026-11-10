import EntgraTable from '@entgra-ui/antd/entgra_ui/components/EntgraTable';
import DeviceSearch from '../../../../../components/DeviceSearch';
import { useEffect, useState } from 'react';
import {
  Button,
  Collapse,
  App,
  Result,
  Spin,
  Input,
  List,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useResource } from '../../../../../services/useResource';
import { scopes } from '../../../../../common/contracts';
import {
  ErrorState,
  Loading,
  Warning,
  useFeedback,
} from '../../../../../components/States';

function OperationHistory({ uuid, deviceId }) {
  const { api } = useStore();
  const { t } = useTranslation();
  const resource = useResource(
    (signal) => api.operations(uuid, deviceId, signal),
    [uuid, deviceId],
  );
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorState error={resource.error} />;
  return (
    <Table
      rowKey="operationId"
      size="small"
      pagination={false}
      dataSource={resource.data?.DevicesOperations || []}
      locale={{ emptyText: t('No Details') }}
      columns={[
        { title: t('Action status'), dataIndex: 'status' },
        { title: t('Action type'), dataIndex: 'operationCode' },
        {
          title: t('Action triggered at'),
          dataIndex: 'actionTriggeredAt',
          render: (value) => (value ? new Date(value).toLocaleString() : ''),
        },
      ]}
    />
  );
}

function Devices({ uuid, selection, firmware, countsReload }) {
  const { api, can } = useStore();
  const { t } = useTranslation();
  const feedback = useFeedback();
  const [status, setStatus] = useState('COMPLETED');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState({});
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const resource = useResource(
    (signal) =>
      api.subscriptions(
        uuid,
        selection.kind,
        {
          identifier: selection.identifier,
          subscriptionStatus: selection.uninstalled
            ? 'unsubscribed'
            : 'subscribed',
          ...query,
          offset: (page - 1) * 10,
          limit: 10,
        },
        status,
        signal,
      ),
    [uuid, selection, status, query, page],
  );
  const rows = resource.data?.data || [];
  const refresh = () => {
    setSelected([]);
    resource.reload();
    countsReload();
  };
  const retry = async (devices) => {
    setBusy(true);
    try {
      await api.operation({
        uuid,
        kind: 'Device',
        action: selection.uninstalled ? 'uninstall' : 'install',
        identities: devices.map((row) => ({
          id: row.deviceIdentifier,
          type: row.type,
        })),
      });
      feedback.success('Installation retry successful!');
      refresh();
    } catch (error) {
      feedback.error(error);
    } finally {
      setBusy(false);
    }
  };
  const edit = async (row) => {
    try {
      await api.updateStatus(row.deviceId, {
        subId: row.subId,
        status: 'ERROR',
        deviceIdentifier: row.deviceIdentifier,
      });
      feedback.success('Operation updated successfully');
      refresh();
    } catch (error) {
      feedback.error(error);
    }
  };
  const { notification } = App.useApp();
  useEffect(() => {
    if (resource.error)
      notification.error({ message: t('There was a problem') });
  }, [resource.error, notification, t]);
  const columns = [
    {
      title: t('Device'),
      dataIndex: 'deviceName',
      render: (value, row) => (
        <a
          href={`/endpoint-mgt/devices/${encodeURIComponent(row.type)}/${encodeURIComponent(row.deviceIdentifier)}/info`}
          target="_blank"
          rel="noreferrer"
        >
          {value}
        </a>
      ),
    },
    { title: t('Owner'), dataIndex: 'deviceOwner' },
    { title: t('Action type'), dataIndex: 'actionType' },
    { title: t('Triggered by'), dataIndex: 'actionTriggeredBy' },
    {
      title: t('Action triggered at'),
      dataIndex: 'actionTriggeredTimestamp',
      render: (value) => (value ? new Date(value).toLocaleString() : ''),
    },
    {
      title: t('Action status'),
      dataIndex: 'status',
      render: (value, row) => (
        <Space>
          <Tag>{value}</Tag>
          {value === 'ERROR' && can(scopes.install) && (
            <Popconfirm
              title={t('Are you sure to retry this installation?')}
              okText={t('Done')}
              cancelText={t('Cancel')}
              onConfirm={() => retry([row])}
            >
              <Button type="link" loading={busy}>
                {t('Retry')}
              </Button>
            </Popconfirm>
          )}
          {['PENDING', 'IN_PROGRESS'].includes(value) &&
            can(scopes.subscriptionModify) && (
              <Popconfirm
                title={t(
                  'Are you sure change this status from {{status}} to {{selectedStatus}}?',
                  { status: value, selectedStatus: 'ERROR' },
                )}
                okText={t('Done')}
                cancelText={t('Cancel')}
                onConfirm={() => edit(row)}
              >
                <Button type="link">{t('Error')}</Button>
              </Popconfirm>
            )}
        </Space>
      ),
    },
    { title: t('Device status'), dataIndex: 'deviceStatus' },
  ];
  return (
    <>
      <h3>
        {t(
          selection.uninstalled
            ? 'Unsubscribed {{kind}} Subscriptions'
            : 'Subscribed {{kind}} Subscriptions',
          { kind: t(selection.kind) },
        )}
      </h3>
      <Tabs
        activeKey={status}
        onChange={(value) => {
          setStatus(value);
          setPage(1);
          setSelected([]);
        }}
        items={[
          'COMPLETED',
          'PENDING',
          'ERROR',
          ...(!firmware ? ['NEW'] : []),
        ].map((value, index) => ({
          key: value,
          label: t(['Completed', 'Pending', 'Error', 'New'][index]),
        }))}
      />
      <DeviceSearch
        subscription
        apply={(values) => {
          setQuery(values);
          setPage(1);
          setSelected([]);
        }}
      />
      {status === 'ERROR' && can(scopes.install) && (
        <Popconfirm
          disabled={!selected.length}
          title={t('Are you sure to retry this installation?')}
          okText={t('Done')}
          cancelText={t('Cancel')}
          onConfirm={() =>
            retry(rows.filter((row) => selected.includes(row.subId)))
          }
        >
          <Button
            className="spaced"
            disabled={!selected.length}
            loading={busy}
            title={
              !selected.length
                ? t('Please select a device to retry')
                : undefined
            }
          >
            {t('Retry Installation')}
          </Button>
        </Popconfirm>
      )}
      <Spin spinning={resource.loading}>
        <div className="device-table">
          <EntgraTable
            rowKey="subId"
            columns={columns.map(({ dataIndex, ...column }) => ({
              ...column,
              name: dataIndex,
            }))}
            data={resource.error ? [] : rows}
            rowSelection={
              status === 'ERROR' && can(scopes.install)
                ? { selectedRowKeys: selected, onChange: setSelected }
                : undefined
            }
            expandable={{
              expandedRowRender: (row) => (
                <OperationHistory uuid={uuid} deviceId={row.deviceId} />
              ),
            }}
            pagination={{
              current: page,
              pageSize: 10,
              total: resource.data?.count || 0,
              onChange: setPage,
              showTotal: (total, range) =>
                t('showing {{start}}–{{end}} of {{total}} devices', {
                  start: range[0],
                  end: range[1],
                  total,
                }),
              showSizeChanger: false,
            }}
          />
        </div>
      </Spin>
    </>
  );
}

function Identities({ uuid, selection, onSelect }) {
  const { api } = useStore();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const resource = useResource(
    (signal) =>
      api.subscriptions(
        uuid,
        selection.kind,
        {
          subscriptionStatus: selection.uninstalled
            ? 'unsubscribed'
            : 'subscribed',
          searchName: query,
          offset: (page - 1) * 10,
          limit: 10,
        },
        null,
        signal,
      ),
    [uuid, selection, query, page],
  );
  if (resource.error) return <ErrorState error={resource.error} />;
  return (
    <>
      <Input.Search
        placeholder={`Search ${selection.kind}s...`}
        allowClear
        onSearch={(value) => {
          setQuery(value);
          setPage(1);
        }}
      />
      <List
        loading={resource.loading}
        dataSource={resource.data?.data || []}
        pagination={{
          current: page,
          pageSize: 10,
          total: resource.data?.count || 0,
          onChange: setPage,
        }}
        renderItem={(row) => (
          <List.Item>
            <Button
              type="link"
              disabled={selection.kind === 'Group'}
              onClick={() =>
                onSelect({ ...selection, identifier: row.name || row.owner })
              }
            >
              {row.name || row.owner}
            </Button>
          </List.Item>
        )}
      />
    </>
  );
}

export default function Subscriptions({ uuid, firmware = false }) {
  const { api, can } = useStore();
  const { t } = useTranslation();
  const [selection, setSelection] = useState(null);
  const resource = useResource(
    (signal) => api.counts(uuid, signal),
    [uuid],
    can(scopes.subscriptionView),
  );
  if (!can(scopes.subscriptionView))
    return (
      <Warning>
        {"You don't have permission to view subscription details"}
      </Warning>
    );
  if (resource.loading) return <Loading />;
  if (resource.error)
    return (
      <ErrorState
        error={resource.error}
        description="Error occurred while trying to load subscription types."
      />
    );
  const kinds = firmware
    ? ['Device', 'Group']
    : ['Device', 'User', 'Role', 'Group'];
  return (
    <>
      <p>
        {t(
          'Subscription details and installation status of the application for each respective device, group, role, or user.',
        )}
      </p>
      <div className="subscriptions-layout">
        <aside>
          {kinds.map((kind) => {
            const count = resource.data?.find(
              (row) =>
                row.subscriptionType?.toLowerCase() === kind.toLowerCase(),
            );
            return (
              <section key={kind}>
                <h4>{t(kind)}</h4>
                {[false, true].map((uninstalled) => {
                  const value =
                    count?.[
                      uninstalled ? 'unsubscriptionCount' : 'subscriptionCount'
                    ] || 0;
                  const label = t(
                    uninstalled
                      ? 'Uninstalled: {{count}}'
                      : 'Installed: {{count}}',
                    { count: value },
                  );
                  if (kind !== 'Device')
                    return (
                      <Collapse
                        bordered={false}
                        key={String(uninstalled)}
                        items={[
                          {
                            key: String(uninstalled),
                            label,
                            collapsible: value === 0 ? 'disabled' : undefined,
                            children: (
                              <Identities
                                uuid={uuid}
                                selection={{ kind, uninstalled }}
                                onSelect={setSelection}
                              />
                            ),
                          },
                        ]}
                      />
                    );
                  return (
                    <Button
                      key={String(uninstalled)}
                      type="text"
                      block
                      disabled={value === 0}
                      title={
                        value === 0 && uninstalled
                          ? t(
                              'Currently, you have not unsubscribed any devices from this application.',
                            )
                          : undefined
                      }
                      onClick={() => setSelection({ kind, uninstalled })}
                    >
                      {label}
                    </Button>
                  );
                })}
              </section>
            );
          })}
        </aside>
        <div className="subscription-content">
          {!selection ? (
            <Result
              status="info"
              title={t('Select to view details.')}
              subTitle={t(
                'Please select a device, group, role, or user to view installation/uninstallation details.',
              )}
            />
          ) : selection.kind === 'Device' || selection.identifier ? (
            <Devices
              key={JSON.stringify(selection)}
              uuid={uuid}
              selection={selection}
              firmware={firmware}
              countsReload={resource.reload}
            />
          ) : (
            <Identities
              key={JSON.stringify(selection)}
              uuid={uuid}
              selection={selection}
              onSelect={setSelection}
            />
          )}
        </div>
      </div>
    </>
  );
}
