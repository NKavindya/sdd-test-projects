import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TargetPicker } from './TargetPicker';
import { api, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type Group } from '@/services/types';
export function FirmwareGroups({
  uuid,
  onChange,
  onBucket,
  onSubview,
}: {
  uuid: string;
  onChange: (v: unknown[]) => void;
  onBucket: (v: string) => void;
  onSubview?: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const session = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [group, setGroup] = useState<Group>();
  const [bucket, setBucket] = useState('APPLICABLE');
  useEffect(() => {
    if (!session.has(scopes.groups) && !session.has(scopes.adminGroups)) {
      notifyError(null, "You don't have permission to view groups.");
      return;
    }
    api<{ deviceGroups: Group[] }>(
      'deviceMgt',
      'GET',
      `${session.has(scopes.adminGroups) ? '/admin' : ''}/groups/hierarchy`,
      undefined,
      { depth: 99 },
    )
      .then((v) => {
        const flatten = (items: Group[]): Group[] =>
          items.flatMap((g) => [g, ...flatten(g.childrenGroups || [])]);
        setGroups(flatten(v.deviceGroups));
      })
      .catch((e) => notifyError(e));
  }, [uuid]);
  const visible = groups.filter((g) =>
    g.name.toLowerCase().includes(query.toLowerCase()),
  );
  if (group)
    return (
      <>
        <Button
          variant="link"
          onClick={() => {
            setGroup(undefined);
            onSubview?.(false);
            onChange([]);
          }}
        >
          {t('Back')}
        </Button>
        <h2>{group.name}</h2>
        <div className="tabs">
          {[
            ['APPLICABLE', 'Applicable Device'],
            ['NON_APPLICABLE', 'Inapplicable Devices'],
            ['UNMANAGED', 'Unmanaged Devices'],
          ].map(([key, name]) => (
            <button
              className={bucket === key ? 'active' : ''}
              key={key}
              onClick={() => {
                setBucket(key);
                onBucket(key);
                onChange([]);
              }}
            >
              {t(name)}
            </button>
          ))}
        </div>
        <TargetPicker
          key={group.id + bucket}
          kind="Device"
          uuid={uuid}
          deviceType="android"
          action="install"
          firmware
          group={group}
          bucket={bucket}
          onChange={(v) => onChange(v.length ? [group.name] : [])}
        />
      </>
    );
  return (
    <>
      <Input
        aria-label="Search groups"
        placeholder={t('Search')}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
      />
      <div className="firmware-group-grid">
        {visible.slice((page - 1) * 6, page * 6).map((g) => (
          <div className="firmware-group-card" key={g.id}>
            <span className="group-avatar">
              {g.name.slice(0, 2).toUpperCase()}
            </span>
            <h3>{g.name}</h3>
            <Button
              variant="link"
              onClick={() => {
                setGroup(g);
                onSubview?.(true);
                onChange([]);
              }}
            >
              {t('Device')}
            </Button>
          </div>
        ))}
      </div>
      <div className="pagination">
        <Button
          variant="outline"
          size="sm"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ‹
        </Button>
        {page}
        <Button
          variant="outline"
          size="sm"
          disabled={page * 6 >= visible.length}
          onClick={() => setPage(page + 1)}
        >
          ›
        </Button>
      </div>
    </>
  );
}
