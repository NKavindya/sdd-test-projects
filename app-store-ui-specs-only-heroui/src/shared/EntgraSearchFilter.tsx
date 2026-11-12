import { Button } from './Button';
import { useEffect, useState } from 'react';
import { Disclosure, Input } from '@heroui/react';
import { Eraser, Plus, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Choice, problem } from './ui';
import { publisher } from '../services/client';
import { useSession } from '../services/session';
import type { Filter } from '../services/model';
export interface Criterion {
  label: string;
  key: string;
  options?: string[];
  type?: 'text' | 'date';
}
interface Chip {
  key: string;
  value: string;
}
export const deviceCriteria: Criterion[] = [
  { label: 'Device', key: 'name' },
  { label: 'Owner', key: 'user' },
  {
    label: 'Status',
    key: 'status',
    options: ['ACTIVE', 'INACTIVE', 'UNREACHABLE', 'REMOVED'],
  },
  {
    label: 'Ownership',
    key: 'ownership',
    options: [
      'BYOD',
      'COPE',
      'WORK_PROFILE',
      'GOOGLE_ENTERPRISE',
      'COSU',
      'FULLY_MANAGED',
      'DEDICATED_DEVICE',
    ],
  },
  { label: 'Serial Number', key: 'serialNumber' },
];
export function EntgraSearchFilter({
  title,
  variant = 'store',
  criteria = deviceCriteria,
  onSearch,
}: {
  title: string;
  variant?: 'store' | 'common' | 'firmware';
  criteria?: Criterion[];
  onSearch: (f: Filter) => void;
}) {
  const { t } = useTranslation();
  const { has } = useSession();
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [chips, setChips] = useState<Chip[]>([]);
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [tiles, setTiles] = useState<Chip[]>([]);
  useEffect(() => {
    if (variant === 'common' || !has('am:pub:app:update')) return;
    let alive = true;
    void publisher<{ categoryName: string }[]>('/applications/categories')
      .then((r) => alive && setCategories(r.map((x) => x.categoryName)))
      .catch(problem);
    if (variant === 'store')
      void publisher<{ tagName: string }[]>('/applications/tags')
        .then((r) => alive && setTags(r.map((x) => x.tagName)))
        .catch(problem);
    return () => {
      alive = false;
    };
  }, [variant]);
  const fields =
    variant === 'common'
      ? criteria
      : [
          {
            label: variant === 'firmware' ? 'Name' : 'App Name',
            key: 'appName',
          },
          { label: 'Category', key: 'categories', options: categories },
          ...(variant === 'store'
            ? [{ label: 'Tag', key: 'tags', options: tags }]
            : []),
        ];
  function result(cs: Chip[], omitName = false) {
    const f: Filter = {};
    cs.forEach((c) => {
      if (omitName && c.key === 'appName') return;
      if (c.key === 'categories' || c.key === 'tags') {
        f[c.key] = [...((f[c.key] as string[]) || []), c.value];
      } else f[c.key] = c.value;
    });
    onSearch(f);
  }
  function commit() {
    let cs = chips;
    if (key && value) {
      cs = [
        ...chips.filter((c) => key !== 'appName' || c.key !== 'appName'),
        { key, value },
      ];
      setChips(cs);
      setKey('');
      setValue('');
    }
    return cs;
  }
  function search() {
    if (variant === 'common') {
      if (tiles.some((x) => !x.key || !x.value)) {
        setInvalid(true);
        return;
      }
      result(tiles);
      return;
    }
    const complete = key && value;
    const cs = commit();
    if (editing && !complete) {
      setInvalid(true);
    } else {
      setEditing(false);
      setInvalid(false);
    }
    result(cs);
  }
  return (
    <Disclosure className="search-panel">
      <Disclosure.Heading>
        <Disclosure.Trigger>
          <Search size={15} />
          <span>{t(title)}</span>
        </Disclosure.Trigger>
      </Disclosure.Heading>
      <Disclosure.Content>
        <Disclosure.Body>
          <form
            className="filter-row"
            onSubmit={(e) => {
              e.preventDefault();
              search();
            }}
          >
            <div className="filter-main">
              {variant === 'common' ? (
                tiles.map((tile, i) => (
                  <div className="filter-tile" key={i}>
                    <Choice
                      autoFocus
                      label={t('Search')}
                      value={tile.key}
                      options={fields
                        .filter(
                          (f) =>
                            f.key === tile.key ||
                            !tiles.some((x) => x.key === f.key),
                        )
                        .map((f) => ({ id: f.key, label: t(f.label) }))}
                      onChange={(k) =>
                        setTiles(
                          tiles.map((x, j) =>
                            j === i ? { key: k, value: '' } : x,
                          ),
                        )
                      }
                    />
                    {tile.key &&
                      (fields.find((x) => x.key === tile.key)?.options ? (
                        <Choice
                          label={t('Search')}
                          options={fields
                            .find((x) => x.key === tile.key)!
                            .options!.map((v) => ({ id: v, label: v }))}
                          value={tile.value}
                          onChange={(v) =>
                            setTiles(
                              tiles.map((x, j) =>
                                j === i ? { ...x, value: v } : x,
                              ),
                            )
                          }
                        />
                      ) : (
                        <Input
                          aria-label={t(
                            fields.find((x) => x.key === tile.key)?.label ||
                              'Search',
                          )}
                          type={
                            fields.find((x) => x.key === tile.key)?.type ===
                            'date'
                              ? 'date'
                              : 'text'
                          }
                          value={tile.value}
                          onChange={(e) =>
                            setTiles(
                              tiles.map((x, j) =>
                                j === i ? { ...x, value: e.target.value } : x,
                              ),
                            )
                          }
                        />
                      ))}
                    <Button
                      isIconOnly
                      variant="ghost"
                      aria-label="Remove"
                      onPress={() => {
                        const next = tiles.filter((_, j) => j !== i);
                        setTiles(next);
                        if (!next.length) onSearch({});
                      }}
                    >
                      <X size={14} />
                    </Button>
                    {invalid && (!tile.key || !tile.value) && (
                      <small className="error">{t('Required')}</small>
                    )}
                  </div>
                ))
              ) : (
                <>
                  {chips.map((c, i) => (
                    <span className="filter-chip" key={i}>
                      {t(fields.find((f) => f.key === c.key)?.label || c.key)}{' '}
                      <span className="divider" />
                      {c.value}
                      <Button
                        isIconOnly
                        variant="ghost"
                        aria-label="Remove"
                        onPress={() => {
                          const next = chips.filter((_, j) => j !== i);
                          setChips(next);
                          result(next, true);
                        }}
                      >
                        <X size={14} />
                      </Button>
                    </span>
                  ))}
                  {editing && (
                    <div className="filter-tile">
                      <Choice
                        label={t('Search')}
                        value={key}
                        options={fields
                          .filter(
                            (f) =>
                              f.key !== 'appName' ||
                              !chips.some((c) => c.key === 'appName'),
                          )
                          .map((f) => ({ id: f.key, label: t(f.label) }))}
                        onChange={(k) => {
                          setKey(k);
                          setValue('');
                        }}
                      />
                      {key &&
                        (fields.find((f) => f.key === key)?.options ? (
                          <Choice
                            label={t(fields.find((f) => f.key === key)!.label)}
                            options={fields
                              .find((f) => f.key === key)!
                              .options!.filter(
                                (v) =>
                                  !chips.some(
                                    (c) => c.key === key && c.value === v,
                                  ),
                              )
                              .map((v) => ({ id: v, label: v }))}
                            value={value}
                            onChange={setValue}
                          />
                        ) : (
                          <Input
                            aria-label={t('App Name')}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            autoFocus
                          />
                        ))}
                      <Button
                        isIconOnly
                        variant="ghost"
                        aria-label="Close"
                        onPress={() => setEditing(false)}
                      >
                        <X size={14} />
                      </Button>
                      {invalid && (!key || !value) && (
                        <small className="error">{t('Required')}</small>
                      )}
                    </div>
                  )}
                </>
              )}
              <Button
                isIconOnly
                variant="outline"
                className="dashed"
                aria-label={t('Add')}
                title={t('Add')}
                isDisabled={
                  variant === 'common' && tiles.length >= fields.length
                }
                onPress={() => {
                  if (variant === 'common')
                    setTiles([...tiles, { key: '', value: '' }]);
                  else {
                    commit();
                    setEditing(true);
                  }
                }}
              >
                <Plus size={18} />
              </Button>
              <Button
                isIconOnly
                type="submit"
                aria-label={t('Search')}
                title={t('Search')}
                isDisabled={variant === 'common' && !tiles.some((t) => t.key)}
              >
                <Search size={18} />
              </Button>
            </div>
            <Button
              isIconOnly
              variant="outline"
              className="dashed danger"
              title={t('Clear')}
              aria-label={t('Clear')}
              isDisabled={variant === 'common' && !tiles.length}
              onPress={() => {
                setChips([]);
                setTiles([]);
                setKey('');
                setValue('');
                setInvalid(false);
                onSearch({});
              }}
            >
              <Eraser size={18} />
            </Button>
          </form>
        </Disclosure.Body>
      </Disclosure.Content>
    </Disclosure>
  );
}
