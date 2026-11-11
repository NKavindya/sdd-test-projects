import { useTable } from '@tanstack/react-table';
import { useMemo } from 'react';
import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confirm, Loading } from './common';
export interface Column<T> {
  title: string;
  field?: keyof T;
  render?: (row: T) => ReactNode;
}
export interface TableAction<T> {
  label: string;
  tooltip?: string;
  icon?: ReactNode;
  destructive?: boolean;
  permissions?: string[];
  onClick: (row: T) => void;
}
export function EntgraTable<T extends object>({
  rows,
  columns,
  rowKey,
  selected,
  onSelection,
  actions = [],
  has = () => true,
  total,
  page = 1,
  pageSize = 10,
  onPage,
  loading,
  expand,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  selected?: string[];
  onSelection?: (ids: string[]) => void;
  actions?: TableAction<T>[];
  has?: (s: string) => boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPage?: (p: number) => void;
  loading?: boolean;
  expand?: (r: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const engineColumns = useMemo(
    () =>
      columns.map((c, i) => ({
        id: String(i),
        accessorFn: (row: T) => (c.field ? row[c.field] : row),
      })),
    [columns],
  );
  const engine = useTable({
    features: {},
    data: rows,
    columns: engineColumns,
    getRowId: rowKey,
  });
  const model = engine.getRowModel().rows.map((r) => r.original);
  const [confirm, setConfirm] = useState<{ action: TableAction<T>; row: T }>();
  const [expanded, setExpanded] = useState<string[]>([]);
  return (
    <div className="table-wrap">
      {loading && <Loading />}
      <table>
        <thead>
          <tr>
            {onSelection && (
              <th>
                <input
                  aria-label="Select all"
                  type="checkbox"
                  checked={
                    rows.length > 0 &&
                    rows.every((r) => selected?.includes(rowKey(r)))
                  }
                  onChange={(e) =>
                    onSelection(e.target.checked ? rows.map(rowKey) : [])
                  }
                />
              </th>
            )}
            {expand && <th />}
            {columns.map((c) => (
              <th key={c.title}>{t(c.title)}</th>
            ))}
            {actions.length > 0 && <th>{t('Actions')}</th>}
          </tr>
        </thead>
        <tbody>
          {model.map((row) => (
            <Fragment key={rowKey(row)}>
              <tr>
                {onSelection && (
                  <td>
                    <input
                      aria-label={`Select ${rowKey(row)}`}
                      type="checkbox"
                      checked={selected?.includes(rowKey(row)) || false}
                      onChange={(e) =>
                        onSelection(
                          e.target.checked
                            ? [...(selected || []), rowKey(row)]
                            : (selected || []).filter((i) => i !== rowKey(row)),
                        )
                      }
                    />
                  </td>
                )}
                {expand && (
                  <td>
                    <button
                      title={
                        expanded.includes(rowKey(row))
                          ? 'Hide Details'
                          : 'See Details'
                      }
                      onClick={() =>
                        setExpanded(
                          expanded.includes(rowKey(row))
                            ? expanded.filter((v) => v !== rowKey(row))
                            : [...expanded, rowKey(row)],
                        )
                      }
                    >
                      <ChevronDown size={15} />
                    </button>
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.title}>
                    {c.render ? (
                      c.render(row)
                    ) : c.field === 'tags' ? (
                      <span>
                        {((row[c.field] || []) as string[]).map((tag) => (
                          <span className="tag" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </span>
                    ) : (
                      String(c.field ? (row[c.field] ?? '—') : '—')
                    )}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {actions.map((action) => (
                        <Button
                          key={action.label}
                          variant="link"
                          size="sm"
                          title={t(action.tooltip || action.label)}
                          aria-label={t(action.label)}
                          className={action.destructive ? 'text-red-500' : ''}
                          disabled={action.permissions?.some((s) => !has(s))}
                          onClick={() =>
                            action.destructive
                              ? setConfirm({ action, row })
                              : action.onClick(row)
                          }
                        >
                          {action.icon}
                          {!action.destructive && t(action.label)}
                        </Button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
              {expand && expanded.includes(rowKey(row)) && (
                <tr>
                  <td colSpan={columns.length + 3}>{expand(row)}</td>
                </tr>
              )}
            </Fragment>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length + 3} className="table-empty">
                {t('No data')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {onPage && (
        <div className="pagination">
          <span>
            showing {total ? (page - 1) * pageSize + 1 : 0}-
            {Math.min(page * pageSize, total || 0)} of {total || 0} devices
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={15} />
          </Button>
          <span>{page}</span>
          <Button
            size="sm"
            variant="outline"
            disabled={page * pageSize >= (total || 0)}
            onClick={() => onPage(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      )}
      {confirm && (
        <Confirm
          message="Are you sure?"
          onClose={() => setConfirm(undefined)}
          onConfirm={() => confirm.action.onClick(confirm.row)}
        />
      )}
    </div>
  );
}
