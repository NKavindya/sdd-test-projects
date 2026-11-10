import FirmwareDetails from './FirmwareDetails';
import { useEffect, useState } from 'react';
import { Avatar, Button, Card, Input, Pagination, Space, Tabs } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { devices, showError } from '../../services/api';
import { scopes } from '../../services/contracts';
import DevicePicker from '../operations/DevicePicker';
import OperationFooter from '../operations/OperationFooter';
import { Permission } from '../../shared/Feedback';
const flatten = (groups) =>
  groups.flatMap((g) => [g, ...flatten(g.childrenGroups || [])]);
export default function FirmwareInstall({
  release,
  onSuccess,
  onSubviewChange,
}) {
  const { t } = useTranslation();
  const { has } = useStore();
  const [tab, setTab] = useState('device');
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [bucket, setBucket] = useState('APPLICABLE');
  const [selected, setSelected] = useState([]);
  useEffect(() => {
    if (!has(scopes.group) && !has(scopes.adminGroup)) return;
    devices(
      has(scopes.adminGroup) ? '/admin/groups/hierarchy' : '/groups/hierarchy',
      { depth: 99, includeDeviceCount: true, offset: 0, limit: 100 },
    )
      .then((result) => setGroups(flatten(result.deviceGroups || [])))
      .catch((error) =>
        showError(error, "You don't have permission to view groups."),
      );
  }, []);
  useEffect(() => {
    onSubviewChange?.(!!group);
  }, [group]);
  useEffect(() => {
    if (tab === 'group' && !has(scopes.group) && !has(scopes.adminGroup))
      showError(null, "You don't have permission to view groups.");
  }, [tab]);
  const matching = groups.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase()),
  );
  const targets = (
    <>
      <Tabs
        activeKey={bucket}
        onChange={(value) => {
          setBucket(value);
          setSelected([]);
        }}
        items={[
          { key: 'APPLICABLE', label: t('Applicable Device') },
          { key: 'NON_APPLICABLE', label: t('Inapplicable Devices') },
          { key: 'UNMANAGED', label: t('Unmanaged Devices') },
        ]}
      />
      <DevicePicker
        key={`${bucket}-${group?.id || ''}`}
        firmware
        uuid={release.uuid}
        groupId={group?.id}
        deviceType="android"
        matchType={bucket}
        selected={selected}
        onSelection={setSelected}
      />
      <OperationFooter
        key={bucket}
        type={group ? 'group' : 'device'}
        selected={group ? (selected.length ? [group.name] : []) : selected}
        app={{ type: 'CUSTOM' }}
        release={release}
        unmanaged={bucket === 'UNMANAGED'}
        disabled={bucket === 'NON_APPLICABLE'}
        onSuccess={onSuccess}
      />
    </>
  );
  return (
    <>
      <FirmwareDetails release={release} />
      {group ? (
        <>
          <Button
            type="link"
            onClick={() => {
              setGroup(null);
              setSelected([]);
              setBucket('APPLICABLE');
            }}
          >
            {t('Back')}
          </Button>
          <h4>{group.name}</h4>
          {targets}
        </>
      ) : (
        <Tabs
          activeKey={tab}
          onChange={(value) => {
            setTab(value);
            setSelected([]);
          }}
          items={[
            { key: 'device', label: t('Device'), children: targets },
            {
              key: 'group',
              label: t('Group'),
              children:
                !has(scopes.group) && !has(scopes.adminGroup) ? (
                  <Permission message="You don't have permission to view groups." />
                ) : (
                  <>
                    <Input.Search
                      onSearch={(value) => {
                        setQuery(value);
                        setPage(1);
                      }}
                    />
                    <Space wrap className="group-cards">
                      {matching.slice((page - 1) * 6, page * 6).map((g) => (
                        <Card
                          key={g.id}
                          title={
                            <>
                              <Avatar>{g.name.charAt(0)}</Avatar> {g.name}
                            </>
                          }
                        >
                          <Button
                            type="link"
                            onClick={() => {
                              setGroup(g);
                              setSelected([]);
                            }}
                          >
                            {t('Device')}: {g.deviceCount || 0}
                          </Button>
                        </Card>
                      ))}
                    </Space>
                    <Pagination
                      current={page}
                      pageSize={6}
                      total={matching.length}
                      onChange={setPage}
                    />
                  </>
                ),
            },
          ]}
        />
      )}
    </>
  );
}
