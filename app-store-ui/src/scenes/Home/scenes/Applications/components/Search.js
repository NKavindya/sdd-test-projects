import { useMemo } from 'react';
import { Collapse } from 'antd';
import EntgraSearchFilter from '@entgra-ui/antd/entgra_ui/components/EntgraSearchFilter';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useResource } from '../../../../../services/useResource';

export default function Search({ firmware = false, apply }) {
  const { api } = useStore();
  const { t } = useTranslation();
  const categories = useResource(
    (signal) => api.reference('categories', {}, signal),
    [],
  );
  const tags = useResource(
    (signal) => api.reference('tags', {}, signal),
    [],
    !firmware,
  );
  const filters = useMemo(
    () => [
      {
        name: 'appName',
        label: t(firmware ? 'Name' : 'App Name'),
        placeholder: t('Name'),
        type: 'input',
      },
      {
        name: 'categories',
        label: t('Category'),
        placeholder: t('Category'),
        type: 'multipleSelect',
        values: categories.data?.rows.map((row) => row.categoryName) || [],
      },
      ...(!firmware
        ? [
            {
              name: 'tags',
              label: t('Tag'),
              placeholder: t('Tag'),
              type: 'multipleSelect',
              values: tags.data?.rows.map((row) => row.tagName) || [],
            },
          ]
        : []),
    ],
    [t, firmware, categories.data, tags.data],
  );
  return (
    <Collapse
      bordered={false}
      className="search-panel"
      expandIcon={() => <SearchOutlined />}
      items={[
        {
          key: 'search',
          label: t(firmware ? 'Search Firmware' : 'Search Apps'),
          children: (
            <EntgraSearchFilter
              key={t('Search Apps')}
              filterForm="EntgraCommonFilterForm"
              filters={filters}
              callback={(_, values) => apply(values)}
              t={t}
            />
          ),
        },
      ]}
    />
  );
}
