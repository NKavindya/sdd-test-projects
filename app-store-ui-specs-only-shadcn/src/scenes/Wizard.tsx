import { selectionReady } from '@/services/rules';
import { FirmwareGroups } from './FirmwareGroups';
import { useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Confirm } from '@/shared/common';
import { useSession } from '@/services/session';
import { api, notifyError } from '@/services/client';
import { scopes, type Application, type Release } from '@/services/types';
import { wizardContexts } from '@/services/handoff';
import { Breadcrumbs } from './Catalogue';
import { TargetPicker } from './TargetPicker';
export function Wizard() {
  const { deviceType = 'android', uuid = '' } = useParams();
  const location = useLocation();
  const context = wizardContexts.get(location.state?.handoff);
  if (!context) return <Navigate to="/store/" replace />;
  const action = location.pathname.endsWith('uninstall')
    ? 'uninstall'
    : 'install';
  return (
    <>
      <Breadcrumbs>
        <span>/</span>
        <Link
          to={`/store/${deviceType}/apps/${uuid}?appType=${context.app.type}`}
        >
          {context.app.name}
        </Link>
        <span>/</span>
        <span>{action === 'install' ? 'Install' : 'Uninstall'}</span>
      </Breadcrumbs>
      <Operation
        app={context.app}
        release={context.release}
        action={action}
        deviceType={deviceType}
      />
    </>
  );
}
export function Operation({
  app,
  release,
  action,
  deviceType,
  firmware = false,
  onGroupSubview,
}: {
  app: Application;
  release: Release;
  action: 'install' | 'uninstall';
  deviceType: string;
  firmware?: boolean;
  onGroupSubview?: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const session = useSession();
  const permitted = (kind: string) =>
    kind === 'Device'
      ? session.has(scopes.devices)
      : kind === 'User'
        ? session.has(scopes.users)
        : kind === 'Role'
          ? session.has(scopes.roles)
          : session.has(scopes.groups) || session.has(scopes.adminGroups);
  const kinds = (
    firmware ? ['Device', 'Group'] : ['Device', 'User', 'Role', 'Group']
  ).filter((k) => firmware || !session.has(scopes.hide) || permitted(k));
  const [kind, setKind] = useState(kinds[0] || 'User');
  const [selection, setSelection] = useState<unknown[]>([]);
  const [block, setBlock] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [time, setTime] = useState('');
  const [disable, setDisable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [bucket, setBucket] = useState('APPLICABLE');
  const label = action === 'install' ? 'Install' : 'Uninstall';
  const submit = async () => {
    if (!selectionReady(selection, schedule, time) || busy) return;
    setBusy(true);
    try {
      const path = `/subscription/${release.uuid}/${kind === 'Device' ? 'devices' : kind.toUpperCase()}${!firmware && app.isAndroidEnterpriseApp ? '/ent-app-install' : ''}/${action}`;
      await api('store', 'POST', path, selection, {
        timestamp: schedule ? new Date(time).getTime() : 0,
        ...(action === 'install' && app.type !== 'WEB_CLIP'
          ? { 'block-uninstall': block }
          : {}),
        ...(action === 'install' && kind !== 'Device'
          ? { 'disable-operation-re-executing': disable }
          : {}),
        ...(!firmware && app.isAndroidEnterpriseApp
          ? { requiresUpdatingExternal: true }
          : {}),
      });
      toast.success(t('Done!'), { description: t('Operation triggered!') });
    } catch (e) {
      notifyError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="wizard">
      <div className="wizard-release">
        {release.iconPath && <img src={release.iconPath} alt="" />}
        <div>
          <h1>{app.name || release.packageName}</h1>
          <p>
            {t('Version')}: <span className="version">{release.version}</span>
          </p>
        </div>
      </div>
      <div className="tabs">
        {kinds.map((k) => (
          <button
            className={kind === k ? 'active' : ''}
            key={k}
            onClick={() => {
              if (k === kind) return;
              onGroupSubview?.(false);
              setKind(k);
              setSelection([]);
            }}
          >
            {t(k)}
          </button>
        ))}
      </div>
      <div className="wizard-body">
        <p>
          {action === 'uninstall'
            ? kind === 'Device'
              ? 'Start uninstalling the application for devices by selecting the corresponding devices. Select uninstall to automatically start uninstalling the application for the respective devices.'
              : kind === 'User'
                ? 'Start uninstalling the application for one or more users by selecting the corresponding user name.'
                : kind === 'Role'
                  ? 'Start uninstalling the application for one or more roles by entering the corresponding role name. Select uninstall to automatically start uninstalling the application for the respective user role/roles.'
                  : 'Start uninstalling the application for one or more groups by entering the corresponding group name. Select uninstall to automatically start uninstalling the application for the respective device group/ groups.'
            : kind === 'Device'
              ? 'Start installing the application for devices by selecting the corresponding devices. Select install to automatically start downloading the application for the respective devices.'
              : null}
        </p>
        {app.type === 'WEB_CLIP' && action === 'uninstall' && (
          <div className="alert">
            Web clips cannot be uninstalled on the latest versions of Android
            OS.
          </div>
        )}
        {firmware && kind === 'Device' && (
          <div className="tabs">
            {[
              ['APPLICABLE', 'Applicable Device'],
              ['NON_APPLICABLE', 'Inapplicable Devices'],
              ['UNMANAGED', 'Unmanaged Devices'],
            ].map(([key, name]) => (
              <button
                key={key}
                className={bucket === key ? 'active' : ''}
                onClick={() => {
                  setBucket(key);
                  setSelection([]);
                }}
              >
                {t(name)}
              </button>
            ))}
          </div>
        )}
        {firmware && kind === 'Group' ? (
          <FirmwareGroups
            uuid={release.uuid}
            onChange={setSelection}
            onBucket={setBucket}
            onSubview={onGroupSubview}
          />
        ) : (
          <TargetPicker
            key={kind + bucket}
            kind={kind}
            deviceType={deviceType}
            uuid={release.uuid}
            action={action}
            firmware={firmware}
            bucket={bucket}
            onChange={setSelection}
          />
        )}
      </div>
      <div className="wizard-footer">
        {action === 'install' && kind !== 'Device' && (
          <label title="Disable operation re-executing">
            <input
              type="checkbox"
              checked={disable}
              onChange={(e) => setDisable(e.target.checked)}
            />
            {t('Disable operation re-executing')}
          </label>
        )}
        {action === 'install' && app.type !== 'WEB_CLIP' && (
          <label>
            <input
              type="checkbox"
              checked={block}
              onChange={(e) => setBlock(e.target.checked)}
            />
            {t('Block uninstall')}
          </label>
        )}
        <label>
          <input
            type="checkbox"
            checked={schedule}
            onChange={(e) => setSchedule(e.target.checked)}
          />
          {t(action === 'install' ? 'Schedule install' : 'Schedule uninstall')}
        </label>
        {schedule && (
          <input
            aria-label="Schedule datetime"
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onInput={(e) => setTime(e.currentTarget.value)}
            onBlur={(e) => setTime(e.currentTarget.value)}
          />
        )}
        <Button
          disabled={
            !selectionReady(selection, schedule, time) ||
            busy ||
            (firmware && bucket === 'NON_APPLICABLE')
          }
          onClick={() =>
            (app.type === 'WEB_CLIP' && action === 'install') ||
            (firmware && bucket === 'UNMANAGED')
              ? setConfirm(true)
              : submit()
          }
        >
          {busy ? <span className="spinner" /> : t(label)}
        </Button>
      </div>
      {confirm && (
        <Confirm
          message={
            firmware
              ? 'Are you sure you want to install this firmware on unmanaged devices?'
              : 'Are you sure you want to install?'
          }
          onClose={() => setConfirm(false)}
          onConfirm={submit}
        />
      )}
    </div>
  );
}
