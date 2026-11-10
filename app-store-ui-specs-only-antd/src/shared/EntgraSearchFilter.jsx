import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Input,
  Select,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClearOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { showOptionError } from '../services/api';
const complete = (v) =>
  v !== undefined &&
  v !== null &&
  v !== '' &&
  (!Array.isArray(v) || v.length > 0);
function Controls({
  onAdd,
  onSearch,
  onClear,
  addDisabled,
  searchDisabled,
  clearDisabled,
}) {
  const { t } = useTranslation();
  return (
    <>
      <Tooltip title={t('Add')}>
        <Button
          size="large"
          type="dashed"
          aria-label={t('Add')}
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={addDisabled}
        />
      </Tooltip>
      <Tooltip title={t('Search')}>
        <Button
          size="large"
          type="primary"
          aria-label={t('Search')}
          icon={<SearchOutlined />}
          onClick={onSearch}
          disabled={searchDisabled}
        />
      </Tooltip>
      <Tooltip title={t('Clear')}>
        <Button
          className="clear-filter"
          size="large"
          type="dashed"
          danger
          aria-label={t('Clear')}
          icon={<ClearOutlined />}
          onClick={onClear}
          disabled={clearDisabled}
        />
      </Tooltip>
    </>
  );
}
export function EntgraStoreAppFilterForm({
  categories = [],
  tags = [],
  onResult,
  contextId,
}) {
  const { t } = useTranslation();
  const [chips, setChips] = useState([]);
  const [open, setOpen] = useState(false);
  const [criterion, setCriterion] = useState();
  const [value, setValue] = useState();
  const [error, setError] = useState(false);
  useEffect(() => {
    setChips([]);
    setOpen(false);
    setCriterion(undefined);
    setValue(undefined);
    setError(false);
  }, [contextId]);
  const result = (items) => ({
    appName: items.find((x) => x.key === 'appName')?.value,
    categories: items.filter((x) => x.key === 'categories').map((x) => x.value),
    tags: items.filter((x) => x.key === 'tags').map((x) => x.value),
  });
  function commit(search = false) {
    let next = chips;
    if (open && criterion && complete(value)) {
      next = [
        ...chips.filter((x) => criterion !== 'appName' || x.key !== 'appName'),
        { key: criterion, value },
      ];
      setChips(next);
      setCriterion(undefined);
      setValue(undefined);
      setError(false);
      if (search) setOpen(false);
    } else if (search && open) setError(true);
    if (search) {
      onResult(result(next));
      onResult(result(next));
    } else setOpen(true);
  }
  const labels = { appName: 'App Name', categories: 'Category', tags: 'Tag' };
  return (
    <div className="filter-row">
      <div className="filter-main">
        {chips.map((chip, index) => (
          <span className="filter-chip" key={`${chip.key}-${chip.value}`}>
            {t(labels[chip.key])}
            <span className="chip-divider" />
            {chip.value}
            <CloseOutlined
              onClick={() => {
                const next = chips.filter((_, i) => i !== index);
                setChips(next);
                const report = result(next);
                delete report.appName;
                onResult(report);
              }}
            />
          </span>
        ))}
        {open && (
          <Card className="filter-tile" size="small">
            <div className="filter-field">
              <Select
                autoFocus
                defaultOpen
                style={{ width: 120 }}
                size="small"
                variant="borderless"
                placeholder={t('Select')}
                value={criterion}
                onChange={(v) => {
                  setCriterion(v);
                  setValue(undefined);
                }}
                options={Object.entries(labels)
                  .filter(
                    ([key]) =>
                      key !== 'appName' ||
                      !chips.some((x) => x.key === 'appName'),
                  )
                  .map(([key, label]) => ({ value: key, label: t(label) }))}
              />
              {error && !criterion && <small>{t('required')}</small>}
            </div>
            {criterion && (
              <div className="filter-field">
                {criterion === 'appName' ? (
                  <Input
                    autoFocus
                    variant="borderless"
                    placeholder={t('App Name')}
                    value={value || ''}
                    onChange={(e) => setValue(e.target.value)}
                    onPressEnter={() => commit(true)}
                  />
                ) : (
                  <Select
                    autoFocus
                    allowClear
                    variant="borderless"
                    style={{ minWidth: 170 }}
                    value={value}
                    onChange={setValue}
                    options={(criterion === 'categories' ? categories : tags)
                      .filter(
                        (v) =>
                          !chips.some(
                            (x) => x.key === criterion && x.value === v,
                          ),
                      )
                      .map((v) => ({ value: v, label: v }))}
                  />
                )}{' '}
                {error && !complete(value) && <small>{t('required')}</small>}
              </div>
            )}
            <CloseOutlined onClick={() => setOpen(false)} />
          </Card>
        )}
        <Controls
          onAdd={() => commit(false)}
          onSearch={() => commit(true)}
          onClear={() => {
            setChips([]);
            setCriterion(undefined);
            setValue(undefined);
            setError(false);
            onResult({});
          }}
        />
      </div>
    </div>
  );
}
export function EntgraCommonFilterForm({
  criteria = [],
  onResult,
  tabId,
  onReset,
  suggestions = [],
}) {
  const { t } = useTranslation();
  const [tiles, setTiles] = useState([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    setTiles([]);
    setError(false);
    if (tabId !== undefined) onReset?.(tabId);
  }, [tabId]);
  const set = (i, patch) =>
    setTiles((list) =>
      list.map((tile, index) => (i === index ? { ...tile, ...patch } : tile)),
    );
  function search() {
    if (tiles.some((x) => !x.key || !complete(x.value))) {
      setError(true);
      return;
    }
    const result = {};
    tiles.forEach((x) => {
      result[x.key] = x.value;
    });
    onResult(result);
  }
  return (
    <div className="filter-row">
      <div className="filter-main">
        {tiles.map((tile, index) => {
          const c = criteria.find((c) => c.key === tile.key);
          const type = c?.type;
          const options = (c?.options || []).map((o) =>
            typeof o === 'string' ? { value: o, label: o } : o,
          );
          const props = {
            autoFocus: true,
            value: tile.value,
            onChange: (value) => set(index, { value }),
            size: 'small',
            variant: 'borderless',
          };
          let field;
          if (type === 'text')
            field = (
              <Input
                {...props}
                onChange={(e) => set(index, { value: e.target.value })}
                onPressEnter={search}
                placeholder={t(c.label)}
              />
            );
          if (type === 'choice' || type === 'multiple')
            field = (
              <Select
                {...props}
                allowClear
                mode={type === 'multiple' ? 'multiple' : undefined}
                options={options}
                style={{ minWidth: 170 }}
              />
            );
          if (type === 'date' || type === 'range') {
            const dateProps = {
              ...props,
              format: 'YYYY-MM-DD',
              picker: c.granularity || 'date',
              disabledDate: (d) => !c.allowFuture && d > dayjs().endOf('day'),
              ...c.dateOptions,
            };
            field =
              type === 'range' ? (
                <DatePicker.RangePicker
                  {...dateProps}
                  renderExtraFooter={c.dateFooter}
                />
              ) : (
                <DatePicker {...dateProps} />
              );
          }
          if (type === 'typeahead')
            field = (
              <Select
                {...props}
                showSearch
                filterOption={false}
                style={{ width: 180 }}
                options={suggestions.map((v) => ({ label: v, value: v }))}
                onFocus={() => c.lookup?.('')}
                onSearch={(q) => c.lookup?.(q)}
              />
            );
          return (
            <Card key={index} className="filter-tile" size="small">
              <div className="filter-field">
                <Select
                  autoFocus
                  defaultOpen={!tile.key}
                  size="small"
                  variant="borderless"
                  placeholder={t('Select')}
                  value={tile.key}
                  style={{ minWidth: 130 }}
                  onChange={(key) => set(index, { key, value: undefined })}
                  options={criteria
                    .filter((c) => !tiles.some((tile) => tile.key === c.key))
                    .map((c) => ({ value: c.key, label: t(c.label) }))}
                />
                {error && !tile.key && <small>{t('required')}</small>}
              </div>
              {c && (
                <div className="filter-field">
                  {field}
                  {error && !complete(tile.value) && (
                    <small>{t('required')}</small>
                  )}
                </div>
              )}
              <CloseOutlined
                onClick={() => {
                  const next = tiles.filter((_, i) => i !== index);
                  setTiles(next);
                  if (!next.length) onResult({});
                }}
              />
            </Card>
          );
        })}
        <Controls
          addDisabled={tiles.length >= criteria.length}
          searchDisabled={!tiles.some((t) => t.key)}
          clearDisabled={!tiles.length}
          onAdd={() => setTiles([...tiles, {}])}
          onSearch={search}
          onClear={() => {
            setTiles([]);
            setError(false);
            onResult({});
          }}
        />
      </div>
    </div>
  );
}
export default function EntgraSearchFilter({
  variant,
  criteria,
  onResult,
  contextId,
  tabId,
  onReset,
  categorySource,
  tagSource,
}) {
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  useEffect(() => {
    let active = true;
    if (categorySource)
      categorySource()
        .then((data) => {
          if (active) setCategories(data.map((x) => x.name));
        })
        .catch((e) => showOptionError(e, 'Category'));
    return () => {
      active = false;
    };
  }, [categorySource]);
  useEffect(() => {
    let active = true;
    if (tagSource)
      tagSource()
        .then((data) => {
          if (active) setTags(data.map((x) => x.name));
        })
        .catch((e) => showOptionError(e, 'Tag'));
    return () => {
      active = false;
    };
  }, [tagSource]);
  if (!['store', 'common'].includes(variant)) return null;
  const content =
    variant === 'store' ? (
      <EntgraStoreAppFilterForm
        categories={categories}
        tags={tags}
        onResult={onResult}
        contextId={contextId}
      />
    ) : (
      <EntgraCommonFilterForm
        criteria={criteria}
        onResult={onResult}
        contextId={contextId}
        tabId={tabId}
        onReset={onReset}
      />
    );
  return <div>{content}</div>;
}

export function FilterPanel({ title, ...props }) {
  const { t } = useTranslation();
  return (
    <Collapse
      className="search-collapse"
      bordered={false}
      expandIcon={() => <SearchOutlined />}
      items={[
        {
          key: 'search',
          label: t(title),
          children: <EntgraSearchFilter {...props} />,
        },
      ]}
    />
  );
}
