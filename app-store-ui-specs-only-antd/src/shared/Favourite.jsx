import { useState } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { store, showError } from '../services/api';
export default function Favourite({
  app,
  onChange,
  disabled = false,
  withLabel = false,
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const fav = app.isFavourite;
  async function toggle() {
    setBusy(true);
    try {
      await store(fav ? 'DELETE' : 'POST', `/applications/favourite/${app.id}`);
      await onChange();
    } catch (error) {
      showError(
        error,
        fav
          ? 'Error occurred while removing app to favourite'
          : 'Error occurred while adding app to favourite',
      );
    } finally {
      setBusy(false);
    }
  }
  const label = fav ? 'Remove from favourite' : 'Add to favourite';
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <Tooltip title={t(label)}>
        <Popconfirm
          disabled={disabled}
          title={t(
            fav
              ? 'Are you sure you need to remove {{app}} app from favourites ?'
              : 'Are you sure you need to add {{app}} app to favourites ?',
            { app: app.name },
          )}
          okText={t('Done')}
          cancelText={t('Cancel')}
          onConfirm={toggle}
        >
          <Button
            type="text"
            className="favourite-button"
            aria-label={t(label)}
            disabled={disabled}
            loading={busy}
            icon={fav ? <HeartFilled /> : <HeartOutlined />}
          >
            {withLabel ? t(label) : null}
          </Button>
        </Popconfirm>
      </Tooltip>
    </span>
  );
}
