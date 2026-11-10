import { Breadcrumb } from 'antd';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../services/StoreContext';
import {
  imageUrl,
  isInstallable,
  isPlaySynced,
  scopes,
} from '../../../../common/contracts';
import { Permission } from '../../../../components/States';
import OperationForm from './components/OperationForm';

export default function Install({ action = 'install' }) {
  const location = useLocation();
  const { deviceType, uuid } = useParams();
  const { config, can, handoff } = useStore();
  const { t } = useTranslation();
  const { app, release, appType } = location.state || {};
  if (
    !app ||
    !release ||
    release.uuid !== uuid ||
    handoff?.uuid !== uuid ||
    handoff?.action !== action
  )
    return <Navigate replace to="/store/" />;
  if (
    !can(scopes[action]) ||
    !isInstallable(release, config) ||
    (action === 'install' && isPlaySynced(app))
  )
    return <Permission />;
  return (
    <>
      <Breadcrumb
        className="spaced"
        items={[
          {
            title: (
              <Link to={`/store/${deviceType}/applications`}>{t('Home')}</Link>
            ),
          },
          {
            title: (
              <Link
                to={`/store/${deviceType}/apps/${uuid}?appType=${encodeURIComponent(appType)}`}
              >
                {app.name}
              </Link>
            ),
          },
          { title: t(action === 'install' ? 'Install' : 'Uninstall') },
        ]}
      />
      <div className="wizard-identity">
        {release.iconPath && <img src={imageUrl(release.iconPath)} alt="" />}
        <div>
          <h1>{app.name}</h1>
          <p>
            {t('Version')}: {release.version}
          </p>
        </div>
      </div>
      <OperationForm
        key={`${uuid}-${action}`}
        app={app}
        release={release}
        action={action}
      />
    </>
  );
}
