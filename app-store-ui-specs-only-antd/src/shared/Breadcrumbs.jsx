import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
export default function Breadcrumbs({ items = [] }) {
  const { t } = useTranslation();
  const { deviceType } = useParams();
  return (
    <Breadcrumb
      className="breadcrumbs"
      items={[
        {
          title: (
            <Link to={`/${deviceType}/applications`}>
              <HomeOutlined /> {t('Home')}
            </Link>
          ),
        },
        ...items.map((item) =>
          typeof item === 'string' ? { title: t(item) } : item,
        ),
      ]}
    />
  );
}
