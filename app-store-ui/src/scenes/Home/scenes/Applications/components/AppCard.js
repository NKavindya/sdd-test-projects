import { imageUrl } from '../../../../../common/contracts';
import StarRatings from 'react-star-ratings';
import { useState } from 'react';
import { Button, Card, Popconfirm, Space, Tooltip, Typography } from 'antd';
import { EyeOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useFeedback } from '../../../../../components/States';

export function FavouriteButton({
  app,
  reload,
  labelled = false,
  disabled = false,
}) {
  const { api } = useStore();
  const { t } = useTranslation();
  const feedback = useFeedback();
  const [busy, setBusy] = useState(false);
  const label = app.isFavourite ? 'Remove from favourite' : 'Add to favourite';
  const confirm = async () => {
    setBusy(true);
    try {
      await api.favourite(app.id, app.isFavourite);
      await reload();
    } catch (error) {
      feedback.error(
        error,
        app.isFavourite
          ? 'Error occurred while removing app to favourite'
          : 'Error occurred while adding app to favourite',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <span onClick={(event) => event.stopPropagation()}>
      <Tooltip
        title={t(
          disabled
            ? "Can't perform the action. This release isn't in an installable state."
            : label,
        )}
      >
        <Popconfirm
          disabled={disabled}
          title={t(
            app.isFavourite
              ? 'Are you sure you need to remove {{app}} app from favourites ?'
              : 'Are you sure you need to add {{app}} app to favourites ?',
            { app: app.name },
          )}
          okText={t('Done')}
          cancelText={t('Cancel')}
          onConfirm={confirm}
        >
          <Button
            aria-label={t(label)}
            disabled={disabled}
            loading={busy}
            type="text"
            className={app.isFavourite ? 'heart active' : 'heart'}
            icon={app.isFavourite ? <HeartFilled /> : <HeartOutlined />}
          >
            {labelled ? t(label) : null}
          </Button>
        </Popconfirm>
      </Tooltip>
    </span>
  );
}

export default function AppCard({ app, deviceType, reload }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const release = app.applicationReleases?.[0];
  const open = () => {
    if (release)
      navigate(
        `/store/${deviceType}/apps/${release.uuid}?appType=${encodeURIComponent(app.type)}`,
        { state: { appType: app.type } },
      );
  };
  return (
    <Card className="app-card" hoverable onClick={open}>
      <button
        className="card-open"
        aria-label={app.name}
        onClick={(event) => {
          event.stopPropagation();
          open();
        }}
      >
        {release?.iconPath && (
          <img className="app-icon" src={imageUrl(release.iconPath)} alt="" />
        )}
        <Tooltip title={app.name} placement="topLeft">
          <Typography.Text className="app-name">{app.name}</Typography.Text>
        </Tooltip>
      </button>
      <span className="muted">{app.type.toLowerCase()}</span>
      <Space className="card-actions">
        <StarRatings
          rating={app.rating || 0}
          numberOfStars={5}
          starDimension="12px"
          starSpacing="1px"
          starRatedColor="#777"
          starEmptyColor="#ddd"
          name={`rating-${app.id}`}
        />
        <FavouriteButton app={app} reload={reload} />
        {app.type === 'WEB_CLIP' && release?.installerPath && (
          <Tooltip title={t('Open Web app')}>
            <Button
              type="text"
              icon={<EyeOutlined />}
              aria-label={t('Open Web app')}
              onClick={(event) => {
                event.stopPropagation();
                const url = new URL(
                  release.installerPath,
                  window.location.origin,
                );
                if (['https:', 'http:'].includes(url.protocol))
                  window.open(url.href, '_blank', 'noopener,noreferrer');
              }}
            />
          </Tooltip>
        )}
      </Space>
    </Card>
  );
}
