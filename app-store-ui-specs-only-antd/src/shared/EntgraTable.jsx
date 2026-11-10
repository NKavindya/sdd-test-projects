import { useMemo } from 'react';
import { Button, Popconfirm, Table, Tag, Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
export default function EntgraTable({
  columns,
  records,
  actions,
  hasAccess = () => true,
  rowKey = 'key',
  pagination = false,
  rowSelection,
  expandable,
  rowClassName,
  bordered = false,
  loading = false,
}) {
  const { t } = useTranslation();
  // The shared SPEC intentionally recomputes actions only on columns/actions changes.
  const mapped = useMemo(() => {
    const result = columns.map(({ title, dataIndex, render }) => ({
      title,
      dataIndex,
      render:
        render ||
        (dataIndex === 'tags'
          ? (tags) =>
              tags.map((v, i) => (
                <Tag color="blue" key={i}>
                  {v}
                </Tag>
              ))
          : undefined),
    }));
    if (actions?.length)
      result.push({
        title: t('Actions'),
        key: 'actions',
        render: (_, record) =>
          actions.map((a, i) => {
            const button = (
              <Button
                type="link"
                danger={a.destructive}
                disabled={!hasAccess(a.permissions || [])}
                icon={a.iconMode ? a.icon : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!a.destructive) a.run(record);
                }}
              >
                {a.destructive ? null : a.label}
              </Button>
            );
            return (
              <Tooltip key={i} title={a.tooltip} placement="bottom">
                {a.destructive ? (
                  <Popconfirm
                    disabled={!hasAccess(a.permissions || [])}
                    title={t('Are you sure?')}
                    okText={t('OK')}
                    cancelText={t('Cancel')}
                    onConfirm={() => a.run(record)}
                  >
                    {button}
                  </Popconfirm>
                ) : (
                  button
                )}
              </Tooltip>
            );
          }),
      });
    return result;
  }, [columns, actions]);
  return (
    <Table
      columns={mapped}
      dataSource={records}
      rowKey={rowKey}
      pagination={pagination}
      rowSelection={rowSelection}
      expandable={expandable}
      rowClassName={rowClassName}
      bordered={bordered}
      loading={loading}
    />
  );
}
