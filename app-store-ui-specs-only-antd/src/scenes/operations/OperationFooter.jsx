import { useState } from 'react';
import {
  Button,
  Checkbox,
  DatePicker,
  Space,
  Tooltip,
  Modal,
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { devicePayload, operationPath } from '../../services/contracts';
import { store, showError } from '../../services/api';
export default function OperationFooter({
  type,
  action = 'install',
  selected,
  app,
  release,
  onSuccess,
  disabled = false,
  unmanaged = false,
}) {
  const { t } = useTranslation();
  const [block, setBlock] = useState(false);
  const [disableReexecute, setDisableReexecute] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [date, setDate] = useState(null);
  const [busy, setBusy] = useState(false);
  const webClip = app.type === 'WEB_CLIP';
  async function run() {
    setBusy(true);
    try {
      const enterprise = app.isAndroidEnterpriseApp && app.type !== 'CUSTOM';
      await store(
        'POST',
        operationPath(release.uuid, type, action, enterprise),
        type === 'device' ? devicePayload(selected) : selected,
        {
          timestamp: schedule ? date.valueOf() : 0,
          ...(action === 'install' && !webClip
            ? { 'block-uninstall': block }
            : {}),
          ...(type !== 'device'
            ? { 'disable-operation-re-executing': disableReexecute }
            : {}),
          ...(enterprise ? { requiresUpdatingExternal: true } : {}),
        },
      );
      message.success(`${t('Done!')} ${t('Operation triggered!')}`);
      onSuccess?.();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }
  function submit() {
    if ((webClip && action === 'install') || unmanaged)
      Modal.confirm({
        title: t(
          unmanaged
            ? 'Are you sure you want to install this firmware on unmanaged devices?'
            : 'Are you sure you want to install?',
        ),
        okText: t('Yes'),
        cancelText: t('No'),
        onOk: run,
      });
    else run();
  }
  return (
    <div className="operation-footer">
      <Space wrap>
        {action === 'install' && type !== 'device' && (
          <Tooltip title={t('Disable operation re-executing')}>
            <Checkbox
              checked={disableReexecute}
              onChange={(e) => setDisableReexecute(e.target.checked)}
            >
              {t('Disable operation re-executing')}
            </Checkbox>
          </Tooltip>
        )}
        {action === 'install' && !webClip && (
          <Checkbox
            checked={block}
            onChange={(e) => setBlock(e.target.checked)}
          >
            {t('Block Uninstall')}
          </Checkbox>
        )}
        <Checkbox
          checked={schedule}
          onChange={(e) => setSchedule(e.target.checked)}
        >
          {t(action === 'install' ? 'Schedule Install' : 'Schedule Uninstall')}
        </Checkbox>
        {schedule && <DatePicker showTime value={date} onChange={setDate} />}
        <Button
          type="primary"
          loading={busy}
          disabled={disabled || !selected.length || (schedule && !date)}
          onClick={submit}
        >
          {t(action === 'install' ? 'Install' : 'Uninstall')}
        </Button>
      </Space>
    </div>
  );
}
