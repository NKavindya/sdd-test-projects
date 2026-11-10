import { useState } from 'react';
import { Breadcrumb, Segmented } from 'antd';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Catalogue from './components/Catalogue';

export default function Applications() {
  const location = useLocation();
  const { deviceType } = useParams();
  const { t } = useTranslation();
  const [selected, setSelected] = useState(location.state?.selected || 'apps');
  return (
    <>
      <div className="scene-heading">
        <Breadcrumb
          items={[
            {
              title: (
                <Link to={`/store/${deviceType}/applications`}>
                  {t('Home')}
                </Link>
              ),
            },
            { title: t('Apps') },
            {
              title: t(
                {
                  android: 'Android',
                  ios: 'iOS',
                  windows: 'Windows',
                  'web-clip': 'Web Apps',
                }[deviceType] || deviceType,
              ),
            },
          ]}
        />
        <Segmented
          value={selected}
          onChange={setSelected}
          options={[
            { value: 'apps', label: t('Apps') },
            { value: 'firmware', label: t('Firmware') },
          ]}
        />
      </div>
      <Catalogue
        key={`${deviceType}-${selected}`}
        firmware={selected === 'firmware'}
      />
    </>
  );
}
