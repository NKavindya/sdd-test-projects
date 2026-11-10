import { useCallback, useEffect, useRef, useState } from 'react';
import { Select, Spin, Tree } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { devices, showError, store } from '../../services/api';
import { scopes } from '../../services/contracts';
import { Permission } from '../../shared/Feedback';
export const groupTree = (rows) =>
  rows.map((g) => ({
    key: g.name,
    title: g.name,
    children: groupTree(g.childrenGroups || []),
  }));
export default function IdentityPicker({
  type,
  uuid,
  action,
  selected,
  onSelection,
}) {
  const { t } = useTranslation();
  const { has, user } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const timer = useRef();
  const generation = useRef(0);
  const allowed =
    type === 'group'
      ? has(scopes.group) || has(scopes.adminGroup)
      : has(scopes[type]);
  const load = useCallback(
    async (query = '') => {
      if (!allowed) return;
      const id = ++generation.current;
      setLoading(true);
      try {
        let result;
        if (type === 'group')
          result = await devices(
            has(scopes.adminGroup)
              ? '/admin/groups/hierarchy'
              : '/groups/hierarchy',
            { depth: 99, limit: 100, offset: 0, includeDeviceCount: true },
          );
        else if (action === 'uninstall')
          result = await store(
            'GET',
            `/subscription/${uuid}/${type.toUpperCase()}`,
            undefined,
            { searchName: query, uninstalled: false, offset: 0, limit: 50 },
          );
        else
          result = await devices(
            type === 'user' ? '/users/search' : '/roles',
            type === 'user'
              ? { username: query, offset: 0, limit: 50 }
              : { filter: query, offset: 0, limit: 50 },
          );
        if (id !== generation.current) return;
        setData(
          type === 'group'
            ? result.deviceGroups || []
            : type === 'user'
              ? result.users || result.data || []
              : result.roles || result.data || [],
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
    },
    [type, uuid, action, allowed],
  );
  useEffect(() => {
    load();
    return () => {
      generation.current++;
      clearTimeout(timer.current);
    };
  }, [load]);
  useEffect(() => {
    if (type === 'user' && !allowed) onSelection([user.username]);
  }, [type, allowed]);
  if (type === 'user' && !allowed)
    return (
      <Select
        mode="multiple"
        disabled
        value={[user.username]}
        style={{ width: '100%' }}
      />
    );
  if (!allowed || forbidden)
    return (
      <Permission
        message={
          type === 'role'
            ? "You don't have permission to view roles."
            : "You don't have permission to view groups."
        }
      />
    );
  if (type === 'group')
    return (
      <Spin spinning={loading}>
        <Tree
          checkable
          treeData={groupTree(data)}
          checkedKeys={selected}
          onCheck={onSelection}
        />
      </Spin>
    );
  return (
    <Select
      mode="multiple"
      showSearch
      filterOption={false}
      className="identity-select"
      aria-label={t(type === 'role' ? 'Search roles' : 'Select Users')}
      placeholder={t(type === 'role' ? 'Search roles' : 'Enter the username')}
      value={selected}
      onChange={onSelection}
      onSearch={(value) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => load(value), 300);
      }}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : undefined}
      options={data.map((row) => {
        const value = typeof row === 'string' ? row : row.username || row.name;
        return { label: value, value };
      })}
    />
  );
}
