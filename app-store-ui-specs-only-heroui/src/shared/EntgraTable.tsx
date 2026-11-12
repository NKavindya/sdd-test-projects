import { Button } from './Button';
import { Table, Pagination } from '@heroui/react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';
import { Check, Confirm, Loading } from './ui';
export interface Column<T> {
  title: string;
  field?: keyof T;
  render?: (row: T) => ReactNode;
}
export interface Action<T> {
  label: string;
  tooltip?: string;
  destructive?: boolean;
  allowed?: boolean;
  run: (r: T) => void | Promise<void>;
}
export function EntgraTable<T>({
  rows,
  columns,
  rowKey,
  selected,
  onSelect,
  actions = [],
  page,
  onPage,
  total,
  pageSize = 10,
  loading = false,
  expand,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  selected?: Set<string>;
  onSelect?: (s: Set<string>) => void;
  actions?: Action<T>[];
  page?: number;
  onPage?: (p: number) => void;
  total?: number;
  pageSize?: number;
  loading?: boolean;
  expand?: (row: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function select(id: string, v: boolean) {
    const next = new Set(selected);
    if (v) next.add(id);
    else next.delete(id);
    onSelect?.(next);
  }
  const heads = [
    ...(onSelect
      ? [
          {
            id: 'selection',
            title: (
              <Check
                value={
                  rows.length > 0 && rows.every((r) => selected?.has(rowKey(r)))
                }
                onChange={(v) => onSelect(new Set(v ? rows.map(rowKey) : []))}
              />
            ),
          },
        ]
      : []),
    ...(expand ? [{ id: 'expand', title: '' }] : []),
    ...columns.map((c, i) => ({ id: String(i), title: t(c.title) })),
    ...(actions.length ? [{ id: 'actions', title: t('Actions') }] : []),
  ];
  return (
    <div className="entgra-table">
      {loading && <Loading />}
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Results">
            <Table.Header>
              {heads.map((h, i) => (
                <Table.Column key={h.id} id={h.id} isRowHeader={i === 0}>
                  {h.title}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className="table-empty">{t('No data')}</div>
              )}
            >
              {rows.flatMap((row) => {
                const key = rowKey(row);
                const mainRow = (
                  <Table.Row key={`row-${key}`} id={`row-${key}`}>
                    {heads.map((h) => (
                      <Table.Cell key={h.id}>
                        {h.id === 'selection' ? (
                          <Check
                            value={selected?.has(key) ?? false}
                            onChange={(v) => select(key, v)}
                          />
                        ) : h.id === 'expand' ? (
                          <Button
                            aria-label={
                              expanded.has(key) ? 'Hide Details' : 'See Details'
                            }
                            isIconOnly
                            variant="ghost"
                            onPress={() => {
                              const v = new Set(expanded);
                              v.has(key) ? v.delete(key) : v.add(key);
                              setExpanded(v);
                            }}
                          >
                            <ChevronDown size={16} />
                          </Button>
                        ) : h.id === 'actions' ? (
                          <div className="row-actions">
                            {actions.map((a, i) =>
                              a.destructive ? (
                                <Confirm
                                  key={i}
                                  title={t('Are you sure?')}
                                  label="OK"
                                  disabled={a.allowed === false}
                                  onConfirm={() => a.run(row)}
                                >
                                  <Trash2 size={16} />
                                </Confirm>
                              ) : (
                                <Button
                                  key={i}
                                  variant="ghost"
                                  title={a.tooltip || a.label}
                                  isDisabled={a.allowed === false}
                                  onPress={() => a.run(row)}
                                >
                                  {t(a.label)}
                                </Button>
                              ),
                            )}
                          </div>
                        ) : (
                          (columns[Number(h.id)].render?.(row) ??
                          String(row[columns[Number(h.id)].field!] ?? '—'))
                        )}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                );
                return expanded.has(key) && expand
                  ? [
                      mainRow,
                      <Table.Row key={`detail-${key}`} id={`detail-${key}`}>
                        <Table.Cell colSpan={heads.length}>
                          <div className="expanded-row">{expand(row)}</div>
                        </Table.Cell>
                      </Table.Row>,
                    ]
                  : [mainRow];
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
      {page !== undefined && onPage && (
        <Pager
          page={page}
          total={total ?? rows.length}
          size={pageSize}
          onChange={onPage}
        />
      )}
    </div>
  );
}
export function Pager({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (v: number) => void;
}) {
  return (
    <Pagination className="pager" aria-label="Pagination">
      <Pagination.Summary>
        <span>
          showing {total ? (page - 1) * size + 1 : 0}-
          {Math.min(page * size, total)} of {total}
        </span>
      </Pagination.Summary>
      <Pagination.Content>
        <Pagination.Item>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Previous page"
            isDisabled={page <= 1}
            onPress={() => onChange(page - 1)}
          >
            <ChevronLeft size={16} />
          </Button>
        </Pagination.Item>
        <Pagination.Item>
          <Button variant="secondary" aria-current="page">
            {page}
          </Button>
        </Pagination.Item>
        <Pagination.Item>
          <Button
            isIconOnly
            variant="ghost"
            aria-label="Next page"
            isDisabled={page * size >= total}
            onPress={() => onChange(page + 1)}
          >
            <ChevronRight size={16} />
          </Button>
        </Pagination.Item>
      </Pagination.Content>
      <span>{size} / page</span>
    </Pagination>
  );
}
