import { useState } from 'react';
import { Alert, Card, Tabs, Typography } from 'antd';
import { Redirect, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { scopes, isInstallable, isPlaySynced } from '../../services/contracts';
import Breadcrumbs from '../../shared/Breadcrumbs';
import { Permission } from '../../shared/Feedback';
import DevicePicker from './DevicePicker';
import IdentityPicker from './IdentityPicker';
import OperationFooter from './OperationFooter';
export default function Wizard() {
  const { t } = useTranslation();
  const { deviceType, uuid, action } = useParams();
  const { handoff, has, user } = useStore();
  const [tab, setTab] = useState('device');
  const [selections, setSelections] = useState({
    device: [],
    user: [],
    role: [],
    group: [],
  });
  if (!handoff || handoff.release.uuid !== uuid || handoff.action !== action)
    return <Redirect to="/" />;
  const { app, release } = handoff;
  if (!has(scopes.view)) return <Permission />;
  if (!isInstallable(release) || isPlaySynced(app))
    return <Redirect to={`/${deviceType}/apps/${uuid}?appType=${app.type}`} />;
  const available = (key) =>
    key === 'group'
      ? has(scopes.group) || has(scopes.adminGroup)
      : key === 'user'
        ? true
        : has(scopes[key]);
  const types = ['device', 'user', 'role', 'group'].filter(
    (key) => !has(scopes.hide) || available(key),
  );
  const current = types.includes(tab) ? tab : types[0];
  const title = action === 'install' ? 'Install' : 'Uninstall';
  const labels = {
    device: 'Device',
    user: 'User',
    role: 'Role',
    group: 'Group',
  };
  const setSelection = (value) =>
    setSelections((s) => ({ ...s, [current]: value }));
  const selection =
    current === 'user' && !has(scopes.user)
      ? [user.username]
      : selections[current] || [];
  const intro =
    action === 'uninstall'
      ? {
          device:
            'Start uninstalling the application for devices by selecting the corresponding devices. Select uninstall to automatically start uninstalling the application for the respective devices.',
          user: 'Start uninstalling the application for one or more users by selecting the corresponding user name.',
          role: 'Start uninstalling the application for one or more roles by entering the corresponding role name. Select uninstall to automatically start uninstalling the application for the respective user role/roles.',
          group:
            'Start uninstalling the application for one or more groups by entering the corresponding group name. Select uninstall to automatically start uninstalling the application for the respective device group/ groups.',
        }
      : {
          device:
            'Start installing the application for devices by selecting the corresponding devices. Select install to automatically start downloading the application for the respective devices.',
        };
  return (
    <>
      <Breadcrumbs
        items={[
          {
            title: (
              <Link to={`/${deviceType}/apps/${uuid}?appType=${app.type}`}>
                {app.name}
              </Link>
            ),
          },
          title,
        ]}
      />
      <Card className="wizard-card">
        <div className="wizard-release">
          {release.iconPath && <img src={release.iconPath} alt={app.name} />}
          <div>
            <Typography.Title level={2}>{app.name}</Typography.Title>
            <p>
              {t('Version')} : {release.version}
            </p>
          </div>
        </div>
        <Tabs
          activeKey={current}
          onChange={setTab}
          items={types.map((key) => ({ key, label: t(labels[key]) }))}
        />
        {intro[current] && <p>{t(intro[current])}</p>}
        {app.type === 'WEB_CLIP' && action === 'uninstall' && (
          <Alert
            type="warning"
            showIcon
            message={t(
              'Web clips cannot be uninstalled on the latest versions of Android OS.',
            )}
          />
        )}
        <div className="wizard-picker">
          {current === 'device' ? (
            <DevicePicker
              uuid={uuid}
              deviceType={deviceType}
              action={action}
              selected={selection}
              onSelection={setSelection}
            />
          ) : current ? (
            <IdentityPicker
              type={current}
              uuid={uuid}
              action={action}
              selected={selection}
              onSelection={setSelection}
            />
          ) : null}
        </div>
        <OperationFooter
          key={`${current}-${action}`}
          type={current}
          action={action}
          selected={selection}
          app={app}
          release={release}
          disabled={!available(current)}
        />
      </Card>
    </>
  );
}
