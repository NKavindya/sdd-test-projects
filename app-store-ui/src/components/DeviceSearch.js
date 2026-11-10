import { useMemo } from 'react';
import { useStore } from '../services/StoreContext';
import { useResource } from '../services/useResource';
import { Collapse } from 'antd';
import EntgraSearchFilter from '@entgra-ui/antd/entgra_ui/components/EntgraSearchFilter';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

export default function DeviceSearch({ apply, subscription = false }) {
  const { t } = useTranslation();
  const { api } = useStore();
  const options = useResource(
    (signal) => api.deviceFilters(signal),
    [],
    !subscription,
  );
  const filters = useMemo(
    () => [
      {
        name: subscription ? 'deviceName' : 'name',
        label: t('Device'),
        placeholder: t('Device'),
        type: 'input',
      },
      {
        name: subscription ? 'deviceOwner' : 'user',
        label: t('Owner'),
        placeholder: t('Owner'),
        type: 'input',
      },
      ...(!subscription
        ? [
            {
              name: 'serialNumber',
              label: t('Serial Number'),
              placeholder: t('Serial Number'),
              type: 'input',
            },
            {
              name: 'status',
              label: t('Status'),
              placeholder: t('Status'),
              type: 'select',
              values: options.data?.statuses || [],
            },
            {
              name: 'ownership',
              label: t('Ownership'),
              placeholder: t('Ownership'),
              type: 'select',
              values: options.data?.ownerships || [],
            },
          ]
        : []),
    ],
    [t, subscription, options.data],
  );
  return (
    <Collapse
      bordered={false}
      className="device-search spaced"
      expandIcon={() => <SearchOutlined />}
      items={[
        {
          key: 'search',
          label: t('Search Devices'),
          children: (
            <EntgraSearchFilter
              key={t('Search Devices')}
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
