import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus, Eraser, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, notifyError } from '@/services/client';
export interface Criterion {
  key: string;
  label: string;
  options?: string[];
  type?: 'date' | 'dateRange' | 'multiple' | 'text';
  lookup?: (v: string) => void;
}
type Values = Record<string, unknown>;
export function EntgraSearchFilter({
  title,
  variant = 'store',
  criteria = [],
  onSearch,
  context,
}: {
  title: string;
  variant?: 'store' | 'common' | 'subscription';
  criteria?: Criterion[];
  onSearch: (v: Values) => void;
  context?: string;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="search-panel">
      <button className="search-heading" onClick={() => setExpanded(!expanded)}>
        <Search size={15} />
        {t(title)}
      </button>
      {expanded && (
        <FilterForm
          key={context}
          variant={variant}
          criteria={criteria}
          onSearch={onSearch}
        />
      )}
    </section>
  );
}
function FilterForm({
  variant,
  criteria,
  onSearch,
}: {
  variant: string;
  criteria: Criterion[];
  onSearch: (v: Values) => void;
}) {
  const { t } = useTranslation();
  const store = variant === 'store';
  const [chips, setChips] = useState<{ key: string; value: string }[]>([]);
  const [tiles, setTiles] = useState<{ key: string; value: string }[]>([]);
  const [editor, setEditor] = useState(false);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    if (!store) return;
    api<{ categoryName: string }[]>(
      'publisher',
      'GET',
      '/applications/categories',
    )
      .then((v) => setCategories(v.map((c) => c.categoryName)))
      .catch((e) =>
        notifyError(e, 'Error occurred while trying to load categories.'),
      );
    api<{ tagName: string }[]>('publisher', 'GET', '/applications/tags')
      .then((v) => setTags(v.map((c) => c.tagName)))
      .catch((e) =>
        notifyError(e, 'Error occurred while trying to load tags.'),
      );
  }, [store]);
  const definitions: Criterion[] = store
    ? [
        { key: 'appName', label: 'App Name' },
        { key: 'categories', label: 'Category', options: categories },
        { key: 'tags', label: 'Tag', options: tags },
      ]
    : criteria;
  const results = (entries: typeof chips, includeName = true) => {
    const result: Values = {};
    for (const chip of entries) {
      if (store && chip.key === 'appName' && !includeName) continue;
      if (store && chip.key !== 'appName')
        result[chip.key] = [
          ...((result[chip.key] as string[]) || []),
          chip.value,
        ];
      else
        result[chip.key] =
          definitions.find((d) => d.key === chip.key)?.type === 'multiple'
            ? chip.value.split('\u001f')
            : chip.value;
    }
    return result;
  };
  const commit = () => {
    const next =
      key && value
        ? [
            ...chips.filter((c) => key !== 'appName' || c.key !== key),
            { key, value },
          ]
        : chips;
    setChips(next);
    setKey('');
    setValue('');
    return next;
  };
  const search = () => {
    if (store) {
      const valid = !!(key && value);
      const next = valid ? commit() : chips;
      if (editor && !valid) setInvalid(true);
      else {
        setEditor(false);
        setInvalid(false);
      }
      onSearch(results(next));
    } else {
      if (tiles.some((v) => !v.key || !v.value)) {
        setInvalid(true);
        return;
      }
      onSearch(results(tiles));
      setInvalid(false);
    }
  };
  const field = (
    selected: string,
    val: string,
    change: (v: string) => void,
  ) => {
    const definition = definitions.find((c) => c.key === selected);
    if (!selected) return null;
    if (definition?.options)
      return (
        <select
          aria-label={t(definition.label)}
          multiple={definition.type === 'multiple'}
          value={
            definition.type === 'multiple'
              ? val.split('\u001f').filter(Boolean)
              : val
          }
          onChange={(e) =>
            change(
              definition.type === 'multiple'
                ? Array.from(e.target.selectedOptions)
                    .map((o) => o.value)
                    .join('\u001f')
                : e.target.value,
            )
          }
          autoFocus
        >
          <option value="">
            {t('Select')} {t(definition.label)}
          </option>
          {definition.options
            .filter(
              (o) =>
                !store ||
                !chips.some((c) => c.key === selected && c.value === o),
            )
            .map((o) => (
              <option key={o}>{o}</option>
            ))}
        </select>
      );
    return (
      <input
        autoFocus
        aria-label={t(definition?.label || 'Name')}
        type={definition?.type === 'date' ? 'date' : 'text'}
        max={
          definition?.type === 'date'
            ? new Date().toISOString().slice(0, 10)
            : undefined
        }
        placeholder={t(definition?.label || 'Name')}
        value={val}
        onChange={(e) => {
          change(e.target.value);
          definition?.lookup?.(e.target.value);
        }}
      />
    );
  };
  return (
    <form
      className="filter-form"
      onSubmit={(e) => {
        e.preventDefault();
        search();
      }}
    >
      <div className="filter-main">
        {store ? (
          <>
            {chips.map((chip, i) => (
              <span className="filter-chip" key={i}>
                {t(
                  definitions.find((c) => c.key === chip.key)?.label || 'Name',
                )}
                <i /> {chip.value}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => {
                    const next = chips.filter((_, n) => n !== i);
                    setChips(next);
                    onSearch(results(next, false));
                  }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {editor && (
              <div className="criterion-tile">
                <select
                  autoFocus
                  aria-label="Criterion"
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setValue('');
                  }}
                >
                  <option value="">{t('Select')}</option>
                  {definitions
                    .filter(
                      (c) =>
                        c.key !== 'appName' ||
                        !chips.some((v) => v.key === 'appName'),
                    )
                    .map((c) => (
                      <option value={c.key} key={c.key}>
                        {t(c.label)}
                      </option>
                    ))}
                </select>
                {field(key, value, setValue)}
                <button type="button" onClick={() => setEditor(false)}>
                  <X size={15} />
                </button>
                {invalid && (!key || !value) && <small>{t('required')}</small>}
              </div>
            )}
          </>
        ) : (
          tiles.map((tile, i) => (
            <div className="criterion-tile" key={i}>
              <select
                autoFocus
                value={tile.key}
                aria-label="Criterion"
                onChange={(e) =>
                  setTiles(
                    tiles.map((v, n) =>
                      n === i
                        ? {
                            key: e.target.value,
                            value: variant === 'subscription' ? v.value : '',
                          }
                        : v,
                    ),
                  )
                }
              >
                <option value="">{t('Select')}</option>
                {definitions
                  .filter(
                    (d) =>
                      d.key === tile.key || !tiles.some((v) => v.key === d.key),
                  )
                  .map((c) => (
                    <option key={c.key} value={c.key}>
                      {t(c.label)}
                    </option>
                  ))}
              </select>
              {field(tile.key, tile.value, (v) =>
                setTiles(
                  tiles.map((c, n) => (n === i ? { ...c, value: v } : c)),
                ),
              )}
              <button
                type="button"
                aria-label="Remove"
                onClick={() => {
                  const next = tiles.filter((_, n) => n !== i);
                  setTiles(next);
                  if (!next.length) onSearch({});
                }}
              >
                <X size={15} />
              </button>
              {invalid && (!tile.key || !tile.value) && (
                <small>{t('required')}</small>
              )}
            </div>
          ))
        )}
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="border-dashed"
          title={t('Add')}
          aria-label={t('Add')}
          disabled={!store && tiles.length >= criteria.length}
          onClick={() => {
            if (store) {
              commit();
              setEditor(true);
            } else setTiles([...tiles, { key: '', value: '' }]);
          }}
        >
          <Plus size={18} />
        </Button>
        <Button
          type="submit"
          size="icon"
          title={t('Search')}
          aria-label={t('Search')}
          disabled={!store && !tiles.some((v) => v.key)}
        >
          <Search size={18} />
        </Button>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="border-dashed text-red-500"
        title={t('Clear')}
        aria-label={t('Clear')}
        disabled={!store && !tiles.length}
        onClick={() => {
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
  );
}
